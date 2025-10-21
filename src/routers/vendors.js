const router = require('express').Router();

const {
  VendorController,
  AuthController,
  OrderController,
  OrganisationController
} = require('../controllers');
const {
  Auth,
  VendorAuth,
  NgoSubAdminAuth,
  IsOrgMember,
  BeneficiaryAuth,
  IsRequestWithValidPin
} = require('../middleware');
const {ParamValidator, FileValidator, AuthValidator} = require('../validators');
const VendorValidator = require('../validators/VendorValidator');

router.get('/', VendorController.getAllVendors);
router.get('/chart/:period', VendorAuth, VendorController.vendorChart);
router.post('/add-account', VendorAuth, VendorController.addAccount);
router.get('/stores/all', VendorController.getAllStores);
router.get('/store/:id', VendorController.getVendorStore);
router.get('/accounts/all', VendorController.getAccounts);
router.get(
  '/products/all/:organisation_id',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  OrderController.productPurchased
);
router.post('/product', VendorController.addProduct);
router.get('/products/single/:id', VendorController.singleProduct);
router.get('/products/value', VendorController.getProductsValue);
router.get('/products/sold/value', VendorController.getSoldProductValue);
router.get(
  '/vendor-app/store/products/:storeId',
  VendorController.getProductByStore
);
router.get(
  '/store/products/:storeId',
  VendorAuth,
  VendorController.getVendorAppProductByStore
);
router.get('/summary/:id', VendorController.getSummary);
router.post('/auth/login', AuthController.signInVendor);
router.get('/proposals', VendorAuth, VendorController.ProposalRequests);
router.get(
  '/proposal/:campaign_id',
  VendorAuth,
  VendorController.ProposalRequest
);

router.get('/my-proposals', VendorAuth, VendorController.myProposal);
router.post(
  '/submit-proposal/:campaign_id',
  VendorAuth,
  ParamValidator.CampaignId,
  VendorController.submitProposal
);
router.post(
  '/verify/sms-token/:smstoken',
  VendorAuth,
  VendorController.verifySMStoken
);
router.get('/product_vendors', OrganisationController.ProductVendors);

router.post(
  '/profile/upload',
  VendorAuth,
  VendorValidator.VendorExists,
  FileValidator.checkProfilePic(),
  VendorController.uploadprofilePic
);
router.post('/register', VendorController.registeredSelf);
router.post('/resend-otp', VendorController.resendPasswordToken);
router.post(
  '/confirm-otp',
  AuthValidator.confirmOTPRules(),
  AuthValidator.validate,
  AuthValidator.checkResetPasswordToken,
  VendorController.confirmOTP
);
router.post(
  '/business/:vendor_id',
  VendorValidator.VendorExists,
  VendorController.addBusiness
);
router.get('/product-category', VendorController.fetchDefaultCategory);
router.post('/store', VendorController.addMarket);
router.get('/store', VendorAuth, VendorController.fetchVendorStore);
router.delete('/store/:id', VendorAuth, VendorController.destroyStore);
router.put(
  '/store',
  VendorAuth,
  VendorValidator.VendorExists,
  VendorController.updateStore
);
router
  .route('/products')
  .get(
    VendorAuth,
    VendorValidator.VendorExists,
    VendorController.vendorProducts
  );

router
  .route('/campaigns')
  .get(
    VendorAuth,
    VendorValidator.VendorExists,
    VendorController.vendorCampaigns
  );

router
  .route('/campaigns/:campaign_id/products/:vendor_id?')
  .get(
    VendorAuth,
    ParamValidator.CampaignId,
    VendorController.vendorCampaignProducts
  );

router
  .route('/orders')
  .get(VendorAuth, VendorController.getVendorOrders)
  .post(
    VendorAuth,
    VendorValidator.VendorExists,
    VendorValidator.VendorApprovedForCampaign,
    VendorValidator.createOrder,
    VendorController.createOrder
  );

router
  .route('/orders/:order_id')
  .get(VendorAuth, ParamValidator.OrderId, VendorController.getOrderById);

router.route('/orders/:id/pay').post();

// ✅ NEW: Scan & Pay from uploaded QR code
router.post('/orders/scan-pay', BeneficiaryAuth, OrderController.scanPay);

router.get('/me', VendorAuth, VendorController.getVendor);

router.get('/:id', Auth, VendorController.getVendor);

module.exports = router;
