// scripts/show-voucher.js
require('dotenv').config();
const { VoucherToken } = require('../src/models');

(async () => {
  const row = await VoucherToken.findOne({ where: { campaignId: 6, beneficiaryId: 27 }, order: [['createdAt','DESC']] });
  if (!row) return console.log('No voucher found');
  console.log(JSON.stringify(row.get({ plain: true }), null, 2));
})();