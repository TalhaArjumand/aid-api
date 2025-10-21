// scripts/simulate-vendor-order.js
require('dotenv').config();
const Amqp = require('@droidsolutions-oss/amqp-ts');
const RabbitMq = require('../src/libs/RabbitMQ/Connection');
const { PROCESS_VENDOR_ORDER } = require('../src/constants/queues.constant');
const { Order, OrderProduct, Wallet, Campaign } = require('../src/models');

(async () => {
  try {
    // 👉 set these to real values in your DB
    const ORDER_ID = 2;          // your pending order (CHATSQRCF88YO6U)
    const BENEFICIARY_USER_ID = 27; // a beneficiary linked to the same campaign
    const VENDOR_USER_ID = 31;      // the vendor user you created

    // Load order (+ cart for total)
    const order = await Order.findByPk(ORDER_ID, {
      include: [{ model: OrderProduct, as: 'Cart' }],
    });
    if (!order) throw new Error(`Order ${ORDER_ID} not found`);

    // Compute amount from cart
    const amount = String(
      (order.Cart || []).reduce(
        (sum, it) => sum + Number(it.total_amount ?? ((it.unit_price || 0) * (it.quantity || 0))),
        0
      )
    );

    // Campaign wallet
    const campaign = await Campaign.findByPk(order.CampaignId, {
      include: [{ model: Wallet, as: 'Wallet' }],
    });
    if (!campaign || !campaign.Wallet) throw new Error('Campaign wallet not found');

    // Vendor wallet is global (CampaignId = null) for vendor user
    const vendorWalletRow = await Wallet.findOne({
      where: { UserId: VENDOR_USER_ID, CampaignId: null },
      order: [['createdAt', 'DESC']],
    });
    if (!vendorWalletRow) throw new Error('Vendor wallet not found (CampaignId=null)');

    // Beneficiary wallet is per-campaign
    const beneficiaryWalletRow = await Wallet.findOne({
      where: { UserId: BENEFICIARY_USER_ID, CampaignId: order.CampaignId },
    });
    if (!beneficiaryWalletRow) throw new Error('Beneficiary wallet not found for this campaign');

    // Build payload the consumer expects
    const payload = {
      beneficiaryWallet: {
        uuid: beneficiaryWalletRow.uuid,
        address: beneficiaryWalletRow.address,
        UserId: beneficiaryWalletRow.UserId,
        CampaignId: beneficiaryWalletRow.CampaignId,
        OrganisationId: campaign.OrganisationId,
      },
      vendorWallet: {
        uuid: vendorWalletRow.uuid,
        address: vendorWalletRow.address,
        UserId: vendorWalletRow.UserId,
      },
      campaignWallet: {
        uuid: campaign.Wallet.uuid,
        address: campaign.Wallet.address,
        CampaignId: campaign.id,
        OrganisationId: campaign.OrganisationId,
      },
      order: {
        id: order.id,
        reference: order.reference,
        CampaignId: order.CampaignId,
        VendorId: order.VendorId,
        Cart: (order.Cart || []).map(op => ({
          ProductId: op.ProductId,
          quantity: op.quantity,
          unit_price: op.unit_price,
          total_amount: op.total_amount,
        })),
      },
      amount,                                // "10"
      transaction: { uuid: `tx-${Date.now()}` },
    };

    console.log('⏳ Publishing PROCESS_VENDOR_ORDER with:', {
      orderRef: order.reference,
      amount,
      beneficiary: beneficiaryWalletRow.address,
      vendor: vendorWalletRow.address,
      campaign: campaign.Wallet.address,
    });

    // Ensure exchange/queue/binding exist
    await RabbitMq.completeConfiguration();
    const ex = RabbitMq.declareExchange('app.direct', 'direct', { durable: true });
    const q  = RabbitMq.declareQueue(PROCESS_VENDOR_ORDER, { durable: true, prefetch: 1 });
    await Promise.all([ex.initialized, q.initialized, q.bind(ex, PROCESS_VENDOR_ORDER).initialized]);

    // Publish
    const msg = new Amqp.Message(payload, { contentType: 'application/json', persistent: true });
    await ex.send(msg, PROCESS_VENDOR_ORDER);
    console.log('✅ published to exchange: app.direct rk:', PROCESS_VENDOR_ORDER);
  } catch (err) {
    console.error('❌ Simulation failed:', err.message);
    process.exit(1);
  }
})();