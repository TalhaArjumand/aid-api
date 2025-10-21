// scripts/inspect-relationships.js
require('dotenv').config();
const { Wallet, Campaign, User, CampaignVendor } = require('../src/models');

(async () => {
  try {
    const CAMPAIGN_ID = Number(process.argv[2]) || 6;
    const VENDOR_USER_ID = Number(process.argv[3]) || 23;       // your vendor user
    const BENEFICIARY_USER_ID = Number(process.argv[4]) || 27;  // your beneficiary user

    console.log('--- WALLET LAYOUT ---');

    const campaign = await Campaign.findByPk(CAMPAIGN_ID, { include: [{ model: Wallet, as: 'Wallet' }]});
    console.log('Campaign ok?', !!campaign, 'wallet?', !!campaign?.Wallet, 'Campaign.Wallet.CampaignId=', campaign?.Wallet?.CampaignId);

    const beneficiaryWallet = await Wallet.findOne({ where: { UserId: BENEFICIARY_USER_ID, CampaignId: CAMPAIGN_ID } });
    console.log('Beneficiary wallet CampaignId=', beneficiaryWallet?.CampaignId, 'uuid=', beneficiaryWallet?.uuid);

    const vendorWalletSameCampaign = await Wallet.findOne({ where: { UserId: VENDOR_USER_ID, CampaignId: CAMPAIGN_ID } });
    console.log('Vendor wallet (same campaign) found?', !!vendorWalletSameCampaign, 'CampaignId=', vendorWalletSameCampaign?.CampaignId);

    const vendorWalletGlobal = await Wallet.findOne({ where: { UserId: VENDOR_USER_ID, CampaignId: null } });
    console.log('Vendor wallet (global) found?', !!vendorWalletGlobal, 'CampaignId=', vendorWalletGlobal?.CampaignId);

    // If a join table exists:
    if (CampaignVendor) {
      const link = await CampaignVendor.findOne({
        where: { CampaignId: CAMPAIGN_ID, VendorUserId: VENDOR_USER_ID }
      }).catch(() => null);

      console.log('CampaignVendor link exists?', !!link);
    } else {
      console.log('No CampaignVendor model exported — likely Option A (wallet-per-campaign).');
    }

    process.exit(0);
  } catch (e) {
    console.error('inspect-relationships error:', e);
    process.exit(1);
  }
})();