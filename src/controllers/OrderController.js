const {Response, Logger} = require('../libs');
const moment = require('moment');
const {HttpStatusCode, compareHash, AclRoles} = require('../utils');

const {ProductBeneficiary} = require('../models');

const {
  VendorService,
  WalletService,
  UserService,
  OrderService,
  CampaignService,
  BlockchainService,
  OrganisationService,
  QueueService
} = require('../services');
const db = require('../models');
const Utils = require('../libs/Utils');
const BeneficiariesService = require('../services/BeneficiaryService');
class OrderController {
  static async getOrderByReference(req, res) {
    try {
      const reference = req.params.reference;
      const order = await VendorService.getOrder({reference});
      if (order) {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', order);
        return Response.send(res);
      }

      Response.setError(
        HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
        'Order not found.'
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.'
      );
      return Response.send(res);
    }
  }

  static async approveBeneficiaryToSpend(req, res) {
    const data = req.body;
    try {
      const [
        campaign,
        approvedBeneficiaries,
        approvedBeneficiary,
        campaign_token,
        beneficiaryWallet,
        user
      ] = await Promise.all([
        CampaignService.getCampaignById(data.campaign_id),
        BeneficiariesService.getApprovedBeneficiaries(data.campaign_id),
        BeneficiariesService.getApprovedBeneficiary(
          data.campaign_id,
          data.beneficiary_id
        ),
        BlockchainService.setUserKeypair(`campaign_${data.campaign_id}`),
        WalletService.findUserCampaignWallet(
          data.beneficiary_id,
          data.campaign_id
        ),
        UserService.findSingleUser({
          RoleId: AclRoles.Beneficiary,
          id: data.beneficiary_id
        })
      ]);
      if (!user) {
        Response.errors(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Beneficiary not found'
        );
        Logger.error('Beneficiary not found');
        return Response.send(res);
      }
      if (!campaign) {
        Response.errors(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign not found'
        );
        Logger.error('Campaign not found');
        return Response.send(res);
      }
      if (approvedBeneficiary.status === 'processing') {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Approve spending is already processing.',
          approvedBeneficiary
        );
        Logger.info('Approve spending is already processing.');
        return Response.send(res);
      }
      if (approvedBeneficiary.status === 'in_progress') {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Please wait approve spending sent for processing.',
          approvedBeneficiary
        );
        Logger.info('Please wait approve spending sent for processing.');
        return Response.send(res);
      }
      //putting logs

      if (campaign.type === 'campaign' && !beneficiaryWallet.was_funded) {
        let amount = (
          parseInt(campaign.budget) / parseInt(approvedBeneficiaries.length)
        ).toFixed(2);
        await QueueService.approveOneBeneficiary(
          campaign_token.privateKey,
          beneficiaryWallet.address,
          amount,
          beneficiaryWallet.uuid,
          campaign,
          approvedBeneficiary
        );
      }
      // console.log(
      //   JSON.stringify(beneficiaryWallet.was_funded),
      //   'approvedBeneficiary'
      // );
      if (campaign.type === 'item') {
        Logger.info('Approve spending for item processing.');
        await QueueService.approveNFTSpending(
          data.beneficiary_id,
          campaign,
          campaign.minting_limit / approvedBeneficiaries.length,
          approvedBeneficiary
        );
        Logger.info('Approve spending for item sent for processing.');
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Initializing payment',
        approvedBeneficiary
      );
      Logger.info('Initializing payment');
      return Response.send(res);
    } catch (error) {
      Logger.error(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
        error
      );
      return Response.send(res);
    }
  }
  static async approveStatus(req, res) {
    const {campaign_id, beneficiary_id} = req.params;
    try {
      const is_approved = await BeneficiariesService.getApprovedBeneficiary(
        campaign_id,
        beneficiary_id
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Checking beneficiary approve status',
        is_approved
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.',
        error
      );
      return Response.send(res);
    }
  }
  static async comfirmsmsTOKEN(req, res) {
    const pin = req.body.pin;
    const id = req.body.beneficiaryId;
    const {reference} = req.params;
    try {
      Logger.info(`Body: ${JSON.stringify(req.body)}, ref: ${reference}`);
      const data = await VendorService.getOrder({reference});
      const user = await UserService.findSingleUser({id});

      if (!user) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid beneficiary'
        );
        Logger.error('Invalid beneficiary');
        return Response.send(res);
      }
      if (!user.pin && data.order.CampaignId != 188) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Pin not set');
        Logger.error('Pin not set');
        return Response.send(res);
      }

      if (!compareHash(pin, user.pin) && data.order.CampaignId != 188) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid or wrong PIN.'
        );
        Logger.error('Invalid or wrong PIN.');
        return Response.send(res);
      }

      if (!data) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Order not found.'
        );
        Logger.error('Order not found.');
        return Response.send(res);
      }

      if (data.order.status !== 'pending') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Order ${data.order.status}`
        );
        Logger.error(`Order ${data.order.status}`);
        return Response.send(res);
      }

      const campaignWallet = await WalletService.findSingleWallet({
        CampaignId: data.order.CampaignId,
        UserId: null
      });
      const vendorWallet = await WalletService.findSingleWallet({
        UserId: data.order.Vendor.id
      });

      const beneficiaryWallet = await WalletService.findUserCampaignWallet(
        id,
        data.order.CampaignId
      );
      const campaign = await CampaignService.getCampaignById(
        data.order.CampaignId
      );

      const token = await BlockchainService.allowance(
        campaignWallet.address,
        beneficiaryWallet.address
      );
      Logger.info(`Beneficiary wallet: ${JSON.stringify(beneficiaryWallet)}`);
      const balance = Number(token.Allowed.split(',').join(''));
      Logger.info(`Beneficiary Blockchain Balance: ${balance}`);
      Logger.info(`Product price: ${data.total_cost}`);

      if (!beneficiaryWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Account not eligible to pay for order'
        );
        Logger.error(`Account not eligible to pay for order`);
        return Response.send(res);
      }
      if (!vendorWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Vendor Wallet Not Found..'
        );
        Logger.error(`Vendor Wallet Not Found..`);
        return Response.send(res);
      }
      if (!campaignWallet) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Campaign Wallet Not Found..'
        );
        Logger.error(`Campaign Wallet Not Found..`);
        return Response.send(res);
      }

      if (campaign.type !== 'item' && balance < data.total_cost) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.'
        );
        Logger.error('Insufficient wallet balance.');
        return Response.send(res);
      }

      if (
        campaign.type === 'item' &&
        beneficiaryWallet.balance < data.total_cost
      ) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.'
        );
        Logger.error('Insufficient wallet balance.');
        return Response.send(res);
      }
      await OrderService.processOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        data.order,
        data.order.Vendor,
        data.total_cost,
        campaign
      );

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Transaction Processing');
      return Response.send(res);
    } catch (error) {
      Logger.error(`Order Error: ${error}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error,
        error
      );
      return Response.send(res);
    }
  }
  static async completeOrder(req, res) {
    try {
      const {reference} = req.params;

      const data = await VendorService.getOrder({reference});
      const campaign = await CampaignService.getCampaignById(
        data.order.CampaignId
      );

      if (!data) {
        Response.setError(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Order not found.'
        );
        return Response.send(res);
      }

      if (data.order.status !== 'pending') {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          `Order ${data.order.status}`
        );
        return Response.send(res);
      }
      const approvedBeneficiaries =
        await BeneficiariesService.getApprovedBeneficiaries(
          data.order.CampaignId
        );

      const [campaignWallet, vendorWallet, beneficiaryWallet] =
        await Promise.all([
          WalletService.findSingleWallet({
            CampaignId: data.order.CampaignId,
            UserId: null
          }),
          WalletService.findSingleWallet({UserId: data.order.Vendor.id}),
          WalletService.findUserCampaignWallet(
            req.user.id,
            data.order.CampaignId
          )
        ]);
      const campaign_token = await BlockchainService.setUserKeypair(
        `campaign_${data.order.CampaignId}`
      );

      const beneficiary_token = await BlockchainService.setUserKeypair(
        `user_${req.user.id}campaign_${data.order.CampaignId}`
      );

      if (campaign.type === 'campaign' && !beneficiaryWallet.was_funded) {
        let amount = campaign.budget / approvedBeneficiaries.length;
        await QueueService.approveOneBeneficiary(
          campaign_token.privateKey,
          beneficiary_token.address,
          amount,
          beneficiaryWallet.uuid,
          campaign,
          req.user
        );
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Initializing payment'
        );
        Logger.error('Initializing payment');
        return Response.send(res);
      }

      const token = await BlockchainService.allowance(
        campaign_token.address,
        beneficiary_token.address
      );

      const balance = Number(token.Allowed.split(',').join(''));

      if (campaign.type !== 'item' && balance < data.total_cost) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.'
        );
        Logger.error('Insufficient wallet balance.');
        return Response.send(res);
      }

      if (
        campaign.type === 'item' &&
        beneficiaryWallet.balance < data.total_cost
      ) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient wallet balance.'
        );
        Logger.error('Insufficient wallet balance.');
        return Response.send(res);
      }

      await OrderService.processOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        data.order,
        data.order.Vendor,
        data.total_cost,
        campaign
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Transaction Processing');
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.' + error
      );
      return Response.send(res);
    }
  }

  /**
   * Scan & Pay from uploaded QR code
   * POST /v1/vendors/orders/scan-pay
   */
  static async scanPay(req, res) {
    try {
      const { campaign_id, amount, qr_payload } = req.body;
      const beneficiary_id = req.user.id;

      Logger.info('Scan & Pay request:', { campaign_id, amount, beneficiary_id, qr_payload });

      // Validate QR payload matches campaign_id
      if (qr_payload.campaignId !== parseInt(campaign_id)) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'QR code campaign mismatch');
        return Response.send(res);
      }

      // Validate beneficiary belongs to campaign
      const beneficiary = await BeneficiariesService.getApprovedBeneficiary(campaign_id, beneficiary_id);
      if (!beneficiary) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Beneficiary not found in campaign');
        return Response.send(res);
      }

      // Validate vendor exists and is active in campaign
      const campaign = await CampaignService.getCampaignById(campaign_id);
      if (!campaign) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign not found');
        return Response.send(res);
      }

      // Get wallets
      const [campaignWallet, vendorWallet, beneficiaryWallet] = await Promise.all([
        WalletService.findSingleWallet({
          CampaignId: campaign_id,
          UserId: null
        }),
        WalletService.findSingleWallet({ UserId: qr_payload.vendorId }),
        WalletService.findUserCampaignWallet(beneficiary_id, campaign_id)
      ]);

      if (!campaignWallet || !vendorWallet || !beneficiaryWallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Required wallets not found');
        return Response.send(res);
      }

      // Check allowance for non-item campaigns
      if (campaign.type !== 'item') {
        const campaign_token = await BlockchainService.setUserKeypair(`campaign_${campaign_id}`);
        const beneficiary_token = await BlockchainService.setUserKeypair(`user_${beneficiary_id}campaign_${campaign_id}`);
        
        const token = await BlockchainService.allowance(
          campaign_token.address,
          beneficiary_token.address
        );

        const allowance = Number(token.Allowed.split(',').join(''));
        
        if (allowance < amount) {
          Response.setError(
            HttpStatusCode.STATUS_CONFLICT,
            'Insufficient allowance. Ask NGO/campaign to approve spending.'
          );
          return Response.send(res);
        }
      } else {
        // For item campaigns, check beneficiary wallet balance
        if (beneficiaryWallet.balance < amount) {
          Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Insufficient wallet balance');
          return Response.send(res);
        }
      }

      // Get or create order record for tracking
      const orderRef = qr_payload.orderRef;
      
      // Fetch the actual order from database
      const actualOrder = await VendorService.getOrder({ reference: orderRef });
      
      if (!actualOrder || !actualOrder.order) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Order not found for QR reference');
        return Response.send(res);
      }
      
      const order = actualOrder.order;
      
      // Verify order belongs to the correct campaign and vendor
      if (order.CampaignId !== campaign_id || order.VendorId !== qr_payload.vendorId) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Order does not match QR code details');
        return Response.send(res);
      }

      // Process the order using existing flow
      await OrderService.processOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        order,
        order.Vendor,
        amount,
        campaign
      );

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Payment processing', {
        status: 'processing',
        txRef: orderRef,
        orderRef: orderRef,
        amount: amount
      });
      return Response.send(res);

    } catch (error) {
      Logger.error('Scan & Pay error:', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Payment processing failed: ' + error.message
      );
      return Response.send(res);
    }
  }

  static async productPurchasedByGender(req, res) {
    try {
      const maleCount = {};
      const femaleCount = {};
      let gender = {male: [], female: []};
      const {organisation_id} = req.params;
      const filtered_data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id,
        ...req.query
      });
      const products = await OrderService.productPurchased(organisation_id);

      if (products.data.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Product Purchased By Gender Recieved',
          gender
        );
        return Response.send(res);
      }

      campaigns.data &&
        campaigns?.data?.forEach(campaign => {
          //CampaignId
          products.data.forEach(product => {
            if (campaign.id === product.CampaignId) {
              filtered_data.push(product);
            }
          });
        });
      filtered_data.forEach(product => {
        product.Cart.forEach(cart => {
          cart.Product.ProductBeneficiaries.forEach(beneficiary => {
            if (beneficiary.gender === 'male') {
              maleCount[cart.Product.tag] =
                (maleCount[cart.Product.tag] || 0) + 1;
            }
            if (beneficiary.gender === 'female') {
              femaleCount[cart.Product.tag] =
                (femaleCount[cart.Product.tag] || 0) + 1;
            }
          });
        });
      });

      gender.female.push(femaleCount);
      gender.male.push(maleCount);
      gender.male = gender.male.reduce((acc, obj) => {
        Object.keys(obj).forEach(key => {
          acc.push({[key]: obj[key]});
        });
        return acc;
      }, []);
      gender.female = gender.female.reduce((acc, obj) => {
        Object.keys(obj).forEach(key => {
          acc.push({[key]: obj[key]});
        });
        return acc;
      }, []);

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Product Purchased By Gender Received',
        gender
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.' + error
      );
      return Response.send(res);
    }
  }

  static async productPurchasedByAgeGroup(req, res) {
    try {
      const {organisation_id} = req.params;
      let ageRange = ['18-29', '30-41', '42-53', '54-65', '66~'];
      let data = [];
      const filtered_data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id
      });
      const products = await OrderService.productPurchased(organisation_id);
      if (products.length > 0) {
        campaigns.forEach(campaign => {
          //CampaignId
          products.forEach(product => {
            if (campaign.id === product.CampaignId) {
              filtered_data.push(product);
            }
          });
        });
        filtered_data.forEach(product => {
          product.Cart.forEach(cart => {
            cart.Product.ProductBeneficiaries.forEach(beneficiary => {
              if (
                data.length <= 0 ||
                !data.find(val => val.label === cart.Product['tag'])
              ) {
                data.push({label: cart.Product['tag'], data: [0, 0, 0, 0, 0]});
              }
              for (let val of data) {
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) >= 18 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) <= 29
                ) {
                  val.data[0]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) >= 30 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) <= 41
                ) {
                  val.data[1]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) >= 42 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) <= 53
                ) {
                  val.data[2]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) >= 54 &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) <= 65
                ) {
                  val.data[3]++;
                }
                if (
                  cart.Product['tag'] === val.label &&
                  parseInt(
                    moment().format('YYYY') -
                      moment(beneficiary.dob).format('YYYY')
                  ) >= 66
                ) {
                  val.data[4]++;
                }
              }
            });
          });
        });
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Product Purchased By Age Group Retrieved.',
          {ageRange, data}
        );
        return Response.send(res);
      }

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'No Product Purchased By Age Group Retrieved.',
        {ageRange, data}
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.'
      );
      return Response.send(res);
    }
  }

  static async productPurchased(req, res) {
    try {
      const {organisation_id} = req.params;
      let filtered_data = [];
      let data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id,
        ...req.query
      });
      const products = await OrderService.productPurchased(
        organisation_id,
        req.query
      );

      if (products.data.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Product Purchased Received',
          products
        );
        return Response.send(res);
      }
      campaigns.data.forEach(campaign => {
        //CampaignId
        products.data.forEach(product => {
          if (campaign.id === product.CampaignId) {
            filtered_data.push(product);
          }
        });
      });
      filtered_data.forEach(product => {
        product.Cart.forEach(cart => {
          if (
            data.length <= 0 ||
            !data.find(
              val =>
                val.vendorId == product.Vendor.id &&
                val.productId == cart.ProductId
            )
          ) {
            data.push({
              productId: cart.ProductId,
              product_name: cart.Product.tag,
              vendorId: product.Vendor.id,
              product_category: cart.Product.product_category,
              vendor_name:
                product.Vendor.first_name + ' ' + product.Vendor.first_name,
              sales_volume: cart.total_amount,
              product_quantity: cart.quantity,
              product_cost: cart.Product.cost,
              total_revenue: cart.Product.cost * cart.quantity,
              date_of_purchased: cart.updatedAt
            });
          }
          for (let val of data) {
            if (
              val.vendorId == product.Vendor.id &&
              val.productId == cart.ProductId
            ) {
              val.sales_volume +=
                (val.product_quantity + cart.quantity) *
                getMonthDifference(
                  new Date(val.date_of_purchased),
                  new Date(cart.updatedAt)
                );
              val.total_revenue += cart.Product.cost * cart.quantity;
              val.product_quantity += cart.quantity;
            }
          }
        });
      });

      function getMonthDifference(startDate, endDate) {
        return (
          endDate.getMonth() -
          startDate.getMonth() +
          12 * (endDate.getFullYear() - startDate.getFullYear())
        );
      }
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Product Purchased Received',
        data
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry.'
      );
      return Response.send(res);
    }
  }
  static async soldAndValue(req, res) {
    try {
      const {organisation_id} = req.params;
      const data = [];
      const campaigns = await CampaignService.getAllCampaigns({
        type: 'campaign',
        OrganisationId: organisation_id
      });
      const products = await OrderService.productPurchased(organisation_id);

      if (products && products?.data.length <= 0) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'No Product Purchased Received',
          products
        );
        return Response.send(res);
      }
      campaigns.data &&
        campaigns.data?.forEach(campaign => {
          //CampaignId
          products &&
            products.data?.forEach(product => {
              if (campaign.id === product.CampaignId) {
                data.push(product);
              }
            });
        });

      let total_product_value = 0;
      data.forEach(product => {
        product.Cart.forEach(cart => {
          total_product_value += cart.total_amount;
        });
      });
      let total_product_sold = data.length;

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Product Purchased Received',
        {total_product_sold, total_product_value}
      );
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server error: Please retry. me' + error
      );
      return Response.send(res);
    }
  }
}

module.exports = OrderController;
