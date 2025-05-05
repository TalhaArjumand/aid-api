// 📁 scripts/createCampaignWallet.js

require('dotenv').config();
const path = require('path');
const WalletService = require(path.join(__dirname, '../src/services/WalletService'));
const BlockchainService = require(path.join(__dirname, '../src/services/BlockchainService'));

async function createCampaignWallet() {
  const campaignId = 1; // 🟡 Your manually-created campaign ID
  const organisationId = 1; // 🟡 Replace this with the correct OrganisationId for that campaign

  try {
    // 🔐 Generate keypair (wallet address + private key)
    const keypair = await BlockchainService.setUserKeypair(`campaign_${campaignId}`);

    // 💾 Save to Wallets table
    const wallet = await WalletService.updateOrCreate(
      {
        wallet_type: 'organisation',
        CampaignId: campaignId,
        ownerId: organisationId
      },
      {
        address: keypair.address,
        privateKey: keypair.privateKey,
        was_funded: false,
        balance: '0.0'
      }
    );

    console.log('✅ Campaign Wallet Created:', wallet.address);
  } catch (err) {
    console.error('❌ Error creating campaign wallet:', err.message);
  }
}

createCampaignWallet();