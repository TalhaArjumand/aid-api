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

/**
 * Fixed version following project conventions.
 */
async function createCampaignWithWallet() {
    try {
      const dummyOrgId = 3;
  
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

const CAMPAIGN_ID = 12;
const USER_ID = 14;

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
//                                                                                                                       //
//                                       ✅ 2. Approve Beneficiary + Mint Tokens                                        //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function checkBeneficiaryBalance(walletAddress) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const tokenContract = getTokenContract;

    const balance = await tokenContract.balanceOf(walletAddress);
    const formatted = ethers.utils.formatUnits(balance, 6);

    console.log(`🔍 Balance of ${walletAddress}: ${formatted} CHATS`);
  } catch (err) {
    console.error("❌ Failed to fetch balance:", err.message);
  }
}

async function approveAndMint() {
  try {
    console.log(`🚀 Starting approve + mint test for Campaign ID: ${CAMPAIGN_ID}, User ID: ${USER_ID}`);

    // ✅ Step 1: Approve the beneficiary in DB
    console.log("📌 Approving beneficiary in DB...");
    await BeneficiariesService.updateCampaignBeneficiary(CAMPAIGN_ID, USER_ID, {
      approved: true,
      rejected: false
    });

    // ✅ Step 2: Gather required data
    const [
      campaign,
      approvedBeneficiaries,
      campaign_token,
      beneficiaryWallet
    ] = await Promise.all([
      CampaignService.getCampaignById(CAMPAIGN_ID),
      BeneficiariesService.getApprovedBeneficiaries(CAMPAIGN_ID),
      BlockchainService.setUserKeypair(`campaign_${CAMPAIGN_ID}`),
      WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID)
    ]);

    // 🛑 Pre-checks
    if (!campaign || !campaign_token || !beneficiaryWallet || approvedBeneficiaries.length === 0) {
      console.error("❌ Missing required campaign, token, or wallet data.");
      return;
    }
    if (!beneficiaryWallet?.address) {
      console.error("❌ Wallet address not available. Consumer might not have finished wallet creation.");
      return;
    }

    // ✅ Step 3: Calculate per-user mint amount
    const amount = (parseInt(campaign.budget) / approvedBeneficiaries.length).toFixed(2);
    console.log(`💰 Allocation per beneficiary: ${amount} CHATS`);

    // ✅ Step 4: Trigger Mint
    console.log("📤 Sending approveOneBeneficiary to queue...");
    await QueueService.approveOneBeneficiary(
      campaign_token.privateKey,
      beneficiaryWallet.address,
      amount,
      beneficiaryWallet.uuid,
      campaign,
      approvedBeneficiaries[0]
    );

    console.log("⏳ Waiting for consumer to complete transaction...");
    await new Promise(resolve => setTimeout(resolve, 6000)); // optional delay

    // ✅ Step 5: Check balance
    await checkBeneficiaryBalance(beneficiaryWallet.address);

    console.log("✅ Test completed.");

  } catch (err) {
    console.error("❌ Error in test script:", err.message);
    console.error(err);
  }
}


async function transferTokensToBeneficiaryAfterApproval() {
    try {
      console.log(`🚀 Starting token transfer test for Campaign ID: ${CAMPAIGN_ID}, User ID: ${USER_ID}`);
  
      // ✅ Step 1: Fetch necessary data
      const [campaign, beneficiaryWallet, beneficiary] = await Promise.all([
        CampaignService.getCampaignById(CAMPAIGN_ID),
        WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID),
        BeneficiariesService.getApprovedBeneficiary(CAMPAIGN_ID, USER_ID) // ✅ FIXED HERE
      ]);
  
      if (!campaign || !beneficiaryWallet || !beneficiary) {
        console.error("❌ Required data missing (campaign / wallet / beneficiary).");
        return;
      }
  
      const amount = campaign.budget / 1; // Assuming single user test
      const token_type = 'papertoken';    // Or 'smstoken'
  
      // ✅ Step 2: Create a mock Approved hash & transactionId
      const fakeHash = '0xApprovedTransactionHash123';
      const fakeTransactionId = 'tx-uuid-demo-123';
  
      // ✅ Step 3: Call sendBForConfirmation to mimic frontend triggering disbursement
      await QueueService.sendBForConfirmation(
        fakeHash,
        amount,
        fakeTransactionId,
        beneficiaryWallet.uuid,
        campaign,
        beneficiary,
        campaign.budget,
        0, // lastIndex = 0 since we’re testing 1 user
        token_type
      );
  
      console.log(`✅ Token disbursement message sent to queue for User ${USER_ID}`);
      console.log("⏳ Waiting for consumer to complete confirmation...");
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for consumer
  
    } catch (err) {
      console.error("❌ Error in transfer test:", err.message);
      console.error(err);
    }
}


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



// Constants

async function testFullMintFlow() {
  try {
    const WALLET_ADDRESS = "0xC13A147480B7Dc73764C23Ba74C0F64a5fDc77a1"; // ✅ Actual beneficiary wallet
    const AMOUNT = "50"; // CHATS
    const USER_ID = 14;
    const CAMPAIGN_ID = 1;

    const {
      Beneficiary,
      Wallet,
      Transaction,
    } = require("../src/models");

    const BlockchainService = require("../src/services/BlockchainService");
    const QueueService = require("../src/services/QueueService");
    const CampaignService = require("../src/services/CampaignService");
    const WalletService = require("../src/services/WalletService");
    const BeneficiaryService = require("../src/services/BeneficiaryService");
    const Logger = require("../src/libs/Logger");

    Logger.info(`🚀 Starting full mintToken flow...`);

    // 1️⃣ Approve beneficiary
    await BeneficiaryService.updateCampaignBeneficiary(CAMPAIGN_ID, USER_ID, {
      approved: true,
      rejected: false
    });

    // 2️⃣ Fetch campaign, token, wallet, and beneficiary
    const campaign = await CampaignService.getCampaignById(CAMPAIGN_ID);
    const token = await BlockchainService.setUserKeypair(`campaign_${CAMPAIGN_ID}`);
    const beneficiaryWallet = await WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID);
    const beneficiary = await Beneficiary.findOne({ where: { UserId: USER_ID, CampaignId: CAMPAIGN_ID } });

    if (!beneficiaryWallet || !beneficiary) throw new Error("❌ Wallet or Beneficiary not found");

    // 3️⃣ Trigger approval (which will queue the blockchain mint flow)
    await QueueService.approveOneBeneficiary(
      token.privateKey,
      beneficiaryWallet.address,
      AMOUNT,
      beneficiaryWallet.uuid,
      campaign,
      beneficiary
    );

    Logger.info("⏳ Waiting for queue + consumer + blockchain flow...");
    await new Promise(resolve => setTimeout(resolve, 7000)); // allow async consumer to finish

    // 4️⃣ Verify DB updates
    const txn = await Transaction.findOne({
      where: {
        BeneficiaryId: USER_ID,
        CampaignId: CAMPAIGN_ID,
        transaction_type: 'approval',
      },
      order: [["createdAt", "DESC"]],
    });
    
    const updatedWallet = await Wallet.findByPk(beneficiaryWallet.id);
    const updatedBeneficiary = await Beneficiary.findByPk(beneficiary.id);

    console.log("✅ Transaction Hash:", txn?.transaction_hash || "No txn found");
    console.log("✅ Wallet was_funded:", updatedWallet?.was_funded);
    console.log("✅ Beneficiary approved_spending:", updatedBeneficiary?.approve_spending);

    Logger.info("🎉 Full Mint Flow Test Completed Successfully.");
  } catch (err) {
    console.error("❌ Full mint flow failed:", err.message || err);
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                    🧪 Run Tests                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




//createCampaignWithWallet();
// 🧪 Run this test now
//addBeneficiaryToCampaign();
//approveAndMint();

//transferTokensToBeneficiaryAfterApproval()
//testMintToken(); // <-- Call it here
testFullMintFlow();