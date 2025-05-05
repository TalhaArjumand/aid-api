require('dotenv').config();
const path = require('path');
const { ethers } = require("ethers");

const { QueueService } = require(path.join(__dirname, '../src/services'));
const BlockchainService = require(path.join(__dirname, '../src/services/BlockchainService'));
const CampaignService = require(path.join(__dirname, '../src/services/CampaignService'));
const BeneficiariesService = require(path.join(__dirname, '../src/services/BeneficiaryService'));
const WalletService = require(path.join(__dirname, '../src/services/WalletService'));
const { User } = require(path.join(__dirname, '../src/models'));
const { getTokenContract } = require(path.join(__dirname, '../../chats-blockchain/src/resources/web3config'));

async function checkBeneficiaryBalance(walletAddress) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const tokenContract = getTokenContract; // ← it's already a connected contract
    
    const balance = await tokenContract.balanceOf(walletAddress);
    const formatted = ethers.utils.formatUnits(balance, 6); // assuming 6 decimals

    console.log(`🔍 Balance of ${walletAddress}: ${formatted} CHATS`);
  } catch (err) {
    console.error("❌ Failed to fetch balance:", err.message);
  }
}

async function runTests() {
  try {
    const beneficiaryId = 14;
    const campaignId = 1;
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    

    console.log(`🚀 Starting test for beneficiaryId=${beneficiaryId}, campaignId=${campaignId}`);

    // ✅ Step 1: Approve beneficiary in DB
    console.log("📌 Approving beneficiary...");
    await BeneficiariesService.updateCampaignBeneficiary(campaignId, beneficiaryId, {
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
      CampaignService.getCampaignById(campaignId),
      BeneficiariesService.getApprovedBeneficiaries(campaignId),
      BlockchainService.setUserKeypair(`campaign_${campaignId}`),
      WalletService.findUserCampaignWallet(beneficiaryId, campaignId)
    ]);

    const user = await User.findOne({ where: { id: beneficiaryId }, raw: false });

        // ✅ Check campaign wallet balance before proceeding
    const campaignWallet = new ethers.Wallet(campaign_token.privateKey, provider);
    const campaignEthBalance = await provider.getBalance(campaignWallet.address);
    const formattedEth = ethers.utils.formatEther(campaignEthBalance);
  
    console.log(`🏦 Campaign Wallet Address: ${campaignWallet.address}`);

    console.log(`⚠️  Campaign Wallet ETH Balance: ${formattedEth} ETH`);

    if (parseFloat(formattedEth) < 0.01) {
      console.error("❌ Campaign wallet has insufficient ETH to cover gas fees.");
      console.error("💡 Please fund the wallet using scripts/fundCampaignWallet.js or manually.");
      return;
    }
    console.log("✅ Data Fetched:");
    console.log({
      campaignExists: !!campaign,
      userExists: !!user,
      walletExists: !!beneficiaryWallet,
      approvedBeneficiariesCount: approvedBeneficiaries.length,
      campaignPrivateKey: campaign_token?.privateKey?.slice(0, 10) + '...',
      beneficiaryWalletAddress: beneficiaryWallet?.address,
      userId: user?.id
    });

    // ✅ Step 3: Guard clause if missing data
    if (!user || !campaign || !beneficiaryWallet) {
      console.error('❌ Missing required data: user, campaign, or wallet');
      return;
    }

    if (approvedBeneficiaries.length === 0) {
      console.error('❌ No approved beneficiaries found for this campaign.');
      return;
    }

    // ✅ Step 4: Calculate allocation
    const amount = (parseInt(campaign.budget) / approvedBeneficiaries.length).toFixed(2);
    console.log(`💰 Allocated amount per beneficiary: ${amount} CHATS`);

    const beneficiary = approvedBeneficiaries[0];

    console.log("📦 Beneficiary sent to Queue:", {
      CampaignId: beneficiary.CampaignId,
      UserId: beneficiary.UserId,
    });
    // ✅ Step 5: Trigger the approve queue
    console.log("📤 Sending approveOneBeneficiary to queue...");
    await QueueService.approveOneBeneficiary(
      campaign_token.privateKey,
      beneficiaryWallet.address,
      amount,
      beneficiaryWallet.uuid,
      campaign,
      beneficiary // ✅ not `user`
    );

    console.log(`✅ ApproveOneBeneficiary queued for Beneficiary ID: ${beneficiaryId}`);

    // ✅ Step 6: Wait for consumer to complete transaction
    await new Promise(resolve => setTimeout(resolve, 6000));

    // ✅ Step 7: Check balance
    console.log("🔍 Verifying updated CHATS token balance...");
    await checkBeneficiaryBalance(beneficiaryWallet.address);

  } catch (err) {
    console.error('❌ Error during test execution:', err.message);
    console.error(err);
  }
}

runTests();