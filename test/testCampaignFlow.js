require('dotenv').config();
const path = require('path');

const { ethers } = require('ethers');

const BeneficiariesService = require(path.join(__dirname, '../src/services/BeneficiaryService'));
const WalletService = require(path.join(__dirname, '../src/services/WalletService'));
const BlockchainService = require(path.join(__dirname, '../src/services/BlockchainService'));
const QueueService = require(path.join(__dirname, '../src/services/QueueService'));
const { User } = require(path.join(__dirname, '../src/models'));
const { getTokenContract } = require(path.join(__dirname, '../../chats-blockchain/src/resources/web3config'));


const CampaignService = require(path.join(__dirname, '../src/services/CampaignService'));
const { Campaign } = require('../src/models'); // ✅ correct path to your models/index.js
const { Wallet } = require('../src/models');
const Logger = require("../src/libs/Logger");

require("dotenv").config();

const { setTimeout }  = require("timers/promises");
const assert          = require("assert").strict;
const { v4: uuidv4 }  = require("uuid");
/**
 * Fixed version following project conventions.
 */
async function createCampaignWithWallet() {
    try {
      const dummyOrgId = 2;
  
      const newCampaign = {
        OrganisationId: dummyOrgId,
        title: 'Emergency Relief Campaign',
        description: 'Aid for flood-affected areas',
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'campaign',
        budget: 10000,
        location: JSON.stringify({ country: "Pakistan", state: ["Sindh"] }),
        is_public: false
      };
  
      const createdCampaign = await CampaignService.addCampaign(newCampaign);
      console.log("✅ Campaign created:", {
        id: createdCampaign.id,
        title: createdCampaign.title
      });
  
      // Trigger wallet generation via RabbitMQ
      await QueueService.createWallet(dummyOrgId, 'organisation', createdCampaign.id);
  
      console.log("✅ Wallet creation job sent to consumer queue.");
  
    } catch (err) {
      console.error("❌ Error creating campaign or wallet:", err?.message || err);
    }
  }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                             ✅ CONFIGS (CAMPAIGN + USER)                                              //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const CAMPAIGN_ID = 5;
const USER_ID = 9;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                          ✅ 1. Add Beneficiary + Wallet Flow                                          //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function addBeneficiaryToCampaign() {
  try {
    console.log(`📌 Adding User ID ${USER_ID} to Campaign ID ${CAMPAIGN_ID}...`);

    const beneficiary = await CampaignService.addBeneficiary(CAMPAIGN_ID, USER_ID);

    console.log("✅ Beneficiary added successfully:");
    console.log({
      id: beneficiary.id,
      UserId: beneficiary.UserId,
      CampaignId: beneficiary.CampaignId,
      approved: beneficiary.approved,
    });

    console.log("🚀 Wallet creation queue triggered. You should see logs from QueueService soon!");

  } catch (err) {
    console.error("❌ Failed to add beneficiary:", err.message);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                       ✅ 2. Approve Beneficiary + Mint Tokens                                        //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const MIN_GAS_ETH = "0.02";                       // tweak to taste

/** ── tiny helper: make sure addr has at least MIN_GAS_ETH ───────────────────── */
async function ensureGas (addr, minEth = MIN_GAS_ETH) {
  const provider   = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const bal        = await provider.getBalance(addr);

  const neededWei  = ethers.utils.parseEther(minEth);
  if (bal.gte(neededWei)) return;                 // already funded ✔

  const adminPk    = process.env.ADMIN_PASS_TEST || process.env.ADMIN_PASS;
  const admin      = new ethers.Wallet(adminPk, provider);

  const tx = await admin.sendTransaction({
    to       : addr,
    value    : neededWei.sub(bal).mul(2),         // send a bit extra
    gasLimit : 21_000
  });
  await tx.wait();
  console.log(`⚡ Funded ${addr} with ${ethers.utils.formatEther(tx.value)} ETH (tx ${tx.hash})`);
}

/** ───────────────────────────────────────────────────────────────────────────── */
async function checkBeneficiaryBalance (walletAddress) {
  try {
    const provider    = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const token       = getTokenContract;
    const balRaw      = await token.balanceOf(walletAddress);
    const formatted   = ethers.utils.formatUnits(balRaw, 6);
    console.log(`🔍 Balance of ${walletAddress}: ${formatted} CHATS`);
  } catch (err) {
    console.error("❌ Failed to fetch balance:", err.message);
  }
}

async function approveAndMint () {
  try {
    console.log(`🚀 Starting approve + mint for Campaign ${CAMPAIGN_ID}, User ${USER_ID}`);

    /* 1️⃣  mark beneficiary approved in DB */
    await BeneficiariesService.updateCampaignBeneficiary(CAMPAIGN_ID, USER_ID, {
      approved: true,
      rejected: false
    });

    /* 2️⃣  gather data  */
    const [
      campaign,
      approvedBeneficiaries,
      campaignKeys,                     // renamed from `campaign_token`
      beneficiaryWallet
    ] = await Promise.all([
      CampaignService.getCampaignById(CAMPAIGN_ID),
      BeneficiariesService.getApprovedBeneficiaries(CAMPAIGN_ID),
      BlockchainService.setUserKeypair(`campaign_${CAMPAIGN_ID}`),
      WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID)
    ]);

    if (!campaign || !campaignKeys || !beneficiaryWallet || approvedBeneficiaries.length === 0) {
      console.error("❌ Missing campaign / wallet / beneficiary data");
      return;
    }
    if (!beneficiaryWallet.address) {
      console.error("❌ Beneficiary wallet address not yet created");
      return;
    }

    /* 3️⃣  guarantee gas before queuing  */
    await ensureGas(campaignKeys.address);

    /* 4️⃣  compute share & enqueue */
    const amount = (Number(campaign.budget) / approvedBeneficiaries.length).toFixed(2);
    console.log(`💰 Allocation per beneficiary: ${amount} CHATS`);

    await QueueService.approveOneBeneficiary(
      campaignKeys.privateKey,
      beneficiaryWallet.address,
      amount,
      beneficiaryWallet.uuid,
      campaign,
      approvedBeneficiaries[0]
    );
    console.log("📤 approveOneBeneficiary message sent → queue");

    /* 5️⃣  wait a few seconds, then read on-chain balance */
    await new Promise(r => setTimeout(r, 7_000));
    await checkBeneficiaryBalance(beneficiaryWallet.address);
    console.log("✅ approve + mint flow completed");
  } catch (err) {
    console.error("❌ approveAndMint failed:", err.message || err);
  }
}

/******************************************************************
 * E2E – beneficiary spending confirmation (real transfer flow)
 *  Uses:   SEND_EACH_BENEFICIARY_FOR_CONFIRMATION  →
 *          CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY consumer
 ******************************************************************/


async function transferTokensToBeneficiaryAfterApproval () {
  /* ───── config ───── */
  const CAMPAIGN_ID = 5;
  const USER_ID     = 9;
  const TIMEOUT_MS  = 60_000;
  const TEST_AMOUNT = 37;      
  /* ───── deps ───── */
  const {
    sequelize, Transaction, Wallet
  }                       = require("../src/models");
  const CampaignService   = require("../src/services/CampaignService");
  const WalletService     = require("../src/services/WalletService");
  const BeneficiaryService= require("../src/services/BeneficiaryService");
  const QueueService      = require("../src/services/QueueService");
  const { getTokenContract } = require("../../chats-blockchain/src/resources/web3config");
  const Logger            = require("../src/libs/Logger");

  try {
    Logger.info("🚀  sendBForConfirmation E2E test …");

    /* 1️⃣  Live rows (public columns only) */
    const [
      campaign,
      beneficiaryWallet,
      beneficiary,
      campaignWalletPublic
    ] = await Promise.all([
      CampaignService.getCampaignById(CAMPAIGN_ID),
      WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID),
      BeneficiaryService.getApprovedBeneficiary(CAMPAIGN_ID, USER_ID),
      WalletService.findOrganisationCampaignWallet(
        /* OrgId = */ 2, CAMPAIGN_ID)
    ]);

    assert(campaign && beneficiaryWallet && beneficiary && campaignWalletPublic,
           "Missing campaign / wallets / beneficiary");

    /* ── OPTION 1: query *again* to fetch the secret field ── */
    const campaignWallet = await Wallet.findOne({
      where      : { uuid: campaignWalletPublic.uuid },
      attributes : ['uuid','address','privateKey']        //  ← include PK
    });
    assert(campaignWallet?.privateKey, "campaignWallet.privateKey is missing");

    /* 2️⃣  On-chain prep */
    const provider   = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const token      = getTokenContract.connect(provider);

    const amountStr  = campaign.budget.toString();           // single-user test
    const amountBN   = ethers.utils.parseUnits(amountStr, 6);

    /* 3️⃣  Top-up campaign wallet if balance is low */
    const campaignBal = await token.balanceOf(campaignWallet.address);
    if (campaignBal.lt(amountBN)) {
      const delta = amountBN.sub(campaignBal);

      const adminPk  = process.env.ADMIN_PASS_TEST || process.env.ADMIN_PASS;
      const admin    = new ethers.Wallet(adminPk, provider);
      const tokenAdm = token.connect(admin);

      Logger.info(`[test] Minting ${ethers.utils.formatUnits(delta,6)} CHATS → campaign wallet …`);
      const txMint = await tokenAdm.mint(delta, campaignWallet.address);
      await txMint.wait();
      Logger.info(`[test] Minted; hash ${txMint.hash}`);
    }

    /* 4️⃣  Transfer CHATS campaign → beneficiary */
    const campaignSigner = new ethers.Wallet(campaignWallet.privateKey, provider);
    const tokenCamp      = token.connect(campaignSigner);

    Logger.info(`[test] Transferring ${amountStr} CHATS to beneficiary …`);
    const txTransfer = await tokenCamp.transfer(
      beneficiaryWallet.address, amountBN, { gasLimit: 300_000 });
    await txTransfer.wait();
    Logger.info(`[test] Transfer hash ${txTransfer.hash}`);

    /* 5️⃣  Insert processing TX row */
    const txModel = await Transaction.create({
      uuid: uuidv4(),
      amount: 37,
      reference: Math.floor(Math.random()*1e10).toString(),
      status: "processing",
      is_approved: true,
      transaction_type: "transfer",
      transaction_origin: "wallet",
      SenderWalletId: campaignWallet.uuid,
      ReceiverWalletId: beneficiaryWallet.uuid,
      BeneficiaryId: USER_ID,
      OrganisationId: campaign.OrganisationId,
      narration: "beneficiary spending"
    });

    /* 6️⃣  Push queue message with *real* on-chain hash */
    await QueueService.sendBForConfirmation(
      txTransfer.hash,
      amountStr,
      txModel.uuid,
      beneficiaryWallet.uuid,
      campaign,
      beneficiary,
      campaign.budget,
      0,
      "papertoken"
    );

    Logger.info("⏳  Waiting for consumer …");

         const deadline = Date.now() + TIMEOUT_MS;
         let txn;
         while (Date.now() < deadline) {
           txn = await Transaction.findOne({
             where: { transaction_hash: txTransfer.hash }
           });
           if (txn?.status === "success") break;
           await setTimeout(2_000);
         }

    /* 7️⃣  Assertions */
         assert(txn, "TX row missing");
         assert.strictEqual(txn.status, "success", "TX not success");

    Logger.info("🎉  sendBForConfirmation E2E test PASSED");
    Logger.info("     On-chain hash:", txn.transaction_hash);
    process.exit(0);

  } catch (err) {
    Logger.error(`❌  sendBForConfirmation E2E test FAILED – ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    try { await sequelize?.close(); } catch (_) {}
  }
}

/* export so the runner can call it */
module.exports = { transferTokensToBeneficiaryAfterApproval };


async function testMintToken() {
  try {
    const WALLET_ADDRESS = '0xC13A147480B7Dc73764C23Ba74C0F64a5fDc77a1'; // ✅ Replace with actual
    const AMOUNT = '50'; // CHATS tokens
    const MESSAGE_UUID = 'test-mint-token-flow';
    const TYPE = 'user'; // or 'user'

    console.log(`🚀 Testing mintToken for address: ${WALLET_ADDRESS}`);
    const result = await BlockchainService.mintToken(WALLET_ADDRESS, AMOUNT, MESSAGE_UUID, TYPE);
    console.log("✅ Token minted successfully:");
    console.log("✅ mintToken result:", JSON.stringify(result, null, 2));
    console.log(result);
  } catch (err) {
    console.error("❌ Error while minting token:");
    if (err?.response?.data) {
      console.error(err.response.data);
    } else {
      console.error(err.message || err);
    }
  }
}




// tests/fundBeneficiary.e2e.js
// Run with:  node tests/fundBeneficiary.e2e.js

/* -------------------------------------------------------------
 * End-to-end test for the FUND_BENEFICIARY queue-based flow
 * -------------------------------------------------------------
 * - Publishes a message
 * - Waits for the consumer to finish
 * - Asserts Transaction row + wallet balance
 * ----------------------------------------------------------- */



async function testFundBeneficiaryFlow () {
  /* ─────────── config ─────────── */
  const AMOUNT      = "26";
  const USER_ID     = 9;
  const CAMPAIGN_ID = 5;
  const TIMEOUT_MS  = 15_000;

  /* ─────────── deps ─────────── */
  const {
    sequelize,
    Beneficiary,
    Wallet,
    Transaction,
  } = require("../src/models");

  const BlockchainService = require("../src/services/BlockchainService");
  const QueueService      = require("../src/services/QueueService");
  const CampaignService   = require("../src/services/CampaignService");
  const WalletService     = require("../src/services/WalletService");
  const Logger            = require("../src/libs/Logger");

  try {
    Logger.info("🚀  Starting FundBeneficiary E2E test …");

    /* 1️⃣  Load entities */
    const campaign = await CampaignService.getCampaignById(CAMPAIGN_ID);
    assert(campaign, "Campaign not found");

    const senderWallet = await WalletService.findOrganisationCampaignWallet(
      campaign.OrganisationId, CAMPAIGN_ID
    );
    const beneficiary  = await Beneficiary.findOne({
      where: { UserId: USER_ID, CampaignId: CAMPAIGN_ID },
    });
    const beneficiaryWallet = await WalletService.findUserCampaignWallet(
      USER_ID, CAMPAIGN_ID
    );
    assert(senderWallet && beneficiary && beneficiaryWallet,
      "Missing sender / beneficiary / wallet");

    /* 2️⃣  Plain payload */
    const payload = {
      beneficiaryWallet : beneficiaryWallet.get({ plain: true }),
      campaignWallet    : senderWallet    .get({ plain: true }),
      task_assignment   : { id: 1, campaign_id: CAMPAIGN_ID, beneficiary_id: USER_ID },
      amount_disburse   : AMOUNT,
    };

    /* 3️⃣  Prepare key-pair */
    await BlockchainService.setUserKeypair(`campaign_${CAMPAIGN_ID}`);

    /* 4️⃣  Push onto queue & keep TX uuid */
    const txCreated = await QueueService.FundBeneficiary(
      payload.beneficiaryWallet,
      payload.campaignWallet,
      payload.task_assignment,
      payload.amount_disburse
    );
    const txUuid = txCreated.uuid;

    Logger.info("⏳  Waiting for consumer …");

    /* 5️⃣  Poll until consumer updates DB */
    const deadline = Date.now() + TIMEOUT_MS;
    let txn, updatedWallet;

    while (Date.now() < deadline) {
      [txn, updatedWallet] = await Promise.all([
        Transaction.findByPk(txUuid),                       //  ← by primary key
        Wallet.findOne({ where: { uuid: beneficiaryWallet.uuid } }) //  ← fixed
      ]);

      if (txn && txn.status === "success" &&
          updatedWallet && Number(updatedWallet.balance) >= Number(AMOUNT)) {
        break;
      }
      await setTimeout(2_000);
    }

    /* 6️⃣  Assertions */
    assert(txn, "Transaction row not found");
    assert.strictEqual(txn.status, "success", "Transaction not successful");
    assert(updatedWallet, "Beneficiary wallet not found");
     assert.strictEqual(txn.amount, Number(AMOUNT),
            "Recorded amount mismatch");

    Logger.info("✅ Row loaded:", JSON.stringify(txn.get({ plain: true }), null, 2));
    Logger.info(`✅ Disbursement TX hash: ${txn.transaction_hash}`);
    Logger.info(`✅ New beneficiary balance: ${updatedWallet.balance}`);
    Logger.info("🎉 FUND_BENEFICIARY E2E test PASSED");
    process.exit(0);

  } catch (err) {
    Logger.error(`❌ FUND_BENEFICIARY E2E test FAILED – ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    try { await sequelize?.close(); } catch (_) {}
  }
}






///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                    🧪 Run Tests                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




//testMintToken(); // <-- Call it here
// 🧪 Run this test now

//
//    Imp
//
//createCampaignWithWallet();
//addBeneficiaryToCampaign();
//approveAndMint();

//
//     V.Imp
//
//transferTokensToBeneficiaryAfterApproval();
testFundBeneficiaryFlow() ;