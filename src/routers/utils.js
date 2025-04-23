const router = require('express').Router();
const { UtilController } = require('../controllers');
const { UtilValidator } = require('../validators');

// 👉 Blockchain: Import from connectWeb3 (adjusted path)
const path = require('path');
const connectWeb3 = require(path.resolve(
  __dirname,
  '../../../chats-blockchain/src/connectWeb3/getterAPIController'
));

// 📌 Existing util routes
router.get('/banks', UtilValidator.getBanksValidator, UtilController.getBanks);
router.get('/countries', UtilController.getCountries);
router.get(
  '/resolve_account',
  UtilValidator.resolveAccountValidator,
  UtilController.resolveAccountNumber
);
router.get('/exchange-rate', UtilController.getexchangeRates);

// ✅ NEW: Blockchain connectivity test
router.get('/test-blockchain', async (req, res) => {
  try {
    const name = await connectWeb3.getName();
    return res.status(200).json({ success: true, contractName: name });
  } catch (err) {
    console.error("❌ Blockchain test failed:", err.message);
    console.error(err); // This will help us see the stack
    return res.status(500).json({ success: false, error: err.message });
  }
});
module.exports = router;