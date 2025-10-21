require('dotenv').config();
const { CampaignVendor } = require('../src/models');

(async () => {
  const CampaignId = 6;   // your campaign
  const VendorUserId = 31; // the vendor you just created
  await CampaignVendor.findOrCreate({
    where: { CampaignId, UserId: VendorUserId },
    defaults: { CampaignId, UserId: VendorUserId }
  });
  console.log('✅ linked vendor', VendorUserId, 'to campaign', CampaignId);
  process.exit(0);
})();