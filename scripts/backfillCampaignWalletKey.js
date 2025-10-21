// scripts/backfillCampaignWalletKey.js
require('dotenv').config();
const { Wallet }          = require('../src/models');
const BlockchainService   = require('../src/services/BlockchainService');
const assert              = require('assert');

(async () => {
  const CAMPAIGN_ID = 3;              // <- orphaned campaign
  const wallet = await Wallet.findOne({
    where: { CampaignId: CAMPAIGN_ID, wallet_type: 'organisation' }
  });

  if (!wallet) {
    console.log(`❌ No wallet row found for campaign ${CAMPAIGN_ID}`);
    process.exit(1);
  }
  if (wallet.privateKey) {
    console.log('✅ Wallet already has a privateKey – nothing to do.');
    process.exit(0);
  }

  // 1️⃣  regenerate key-pair
  const kp = await BlockchainService.setUserKeypair(`campaign_${CAMPAIGN_ID}`);
  assert.strictEqual(
    wallet.address.toLowerCase(),
    kp.address.toLowerCase(),
    'Address mismatch – aborting!'
  );

  // 2️⃣  persist key
  await wallet.update({ privateKey: kp.privateKey });
  console.log('🎉 privateKey back-filled successfully');
  process.exit(0);
})();