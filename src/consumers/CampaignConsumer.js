const {
  Sequelize,
  Transaction,
  Wallet,
  VoucherToken,
  Campaign,
  TaskAssignment,
  ProductBeneficiary,
  Order
} = require('../models');

const Logger = require('../libs/Logger');
const RabbitMq = require('../libs/RabbitMQ/Connection');
console.log('RabbitMq prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(RabbitMq)));

// utils/withTimeout.js (or place near top of CampaignConsumer.js)
const withTimeout = (p, ms, label='op') =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`[timeout] ${label} > ${ms}ms`)), ms)
    ),
  ]);

const {
  FUND_CAMPAIGN_WITH_CRYPTO,
  CONFIRM_FUND_CAMPAIGN_WITH_CRYPTO,
  INCREASE_GAS_FOR_FUND_CAMPAIGN_WITH_CRYPTO
} = require('../constants/queues.constant');
const {BlockchainService, QueueService} = require('../services');

const consumerFunctions = require('../utils/consumerFunctions');

const fundWithCrypto = RabbitMq.declareQueue(
  FUND_CAMPAIGN_WITH_CRYPTO,
  {
    durable: true,
    prefetch: 1
  }
);

const confirmFundWithCrypto = RabbitMq.declareQueue(
  CONFIRM_FUND_CAMPAIGN_WITH_CRYPTO,
  {
    durable: true,
    prefetch: 1
  }
);

const increaseGasFundWithCrypto = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_FUND_CAMPAIGN_WITH_CRYPTO,
  {
    durable: true,
    prefetch: 1
  }
);

RabbitMq.completeConfiguration().then(() => {
// ... unchanged setup above ...

fundWithCrypto.activateConsumer(async (msg) => {
  const { campaignWallet, campaign, amount, transactionId } = msg.getContent();
  Logger.info(`[fundWithCrypto] → start  tx=${transactionId} amount=${amount}`);
  try {
    const campaignAddress = await withTimeout(
      BlockchainService.setUserKeypair(`campaign_${campaign.id}`),
      10000,
      'setUserKeypair(campaign)'
    );

    const mint = await withTimeout(
      BlockchainService.mintToken(
        campaignAddress.address,
        Number(amount),
        msg.getContent(),     // your message payload
        'Campaign'
      ),
      20000,
      'mintToken'
    );

    if (!mint || !mint.Minted) {
      Logger.error('[fundWithCrypto] mintToken returned falsy or missing Minted');
      msg.reject();              // drop during dev; switch to nack(false, true) if you prefer retry
      return;
    }

    Logger.info(`[fundWithCrypto] minted hash=${mint.Minted}`);

    await consumerFunctions.update_transaction(
      { transaction_hash: mint.Minted },
      transactionId
    );

    await QueueService.confirmFundCampaignWithCrypto(
      mint.Minted,
      transactionId,
      campaignWallet.uuid,
      Number(amount),
      campaign
    );

    msg.ack();                   // ✅ must ack on success
    Logger.info('[fundWithCrypto] acked');
  } catch (err) {
    Logger.error(`[fundWithCrypto] error: ${err.message || err}`);
    msg.reject();                // ✅ ensure message leaves “unacked”
  }
})
.then(() => Logger.info('ACTIVATE CONSUMER FOR CAMPAIGN CRYPTO FUNDING'))
.catch((e) => Logger.error('Consumer activate error (fundWithCrypto): ' + e));

confirmFundWithCrypto.activateConsumer(async (msg) => {
  const { hash, transactionId, uuid, amount, campaign } = msg.getContent();
  Logger.info(`[confirmFundWithCrypto] → start  tx=${transactionId} hash=${hash}`);
  try {
    const confirm = await withTimeout(
      BlockchainService.confirmTransaction(hash),
      20000,
      'confirmTransaction'
    );

    if (!confirm || confirm.success === false) {
      Logger.warn(`[confirmFundWithCrypto] not confirmed yet for hash=${hash}`);
      msg.reject();              // drop during dev; swap for nack(false, true) to retry later
      return;
    }

    await consumerFunctions.update_campaign(campaign.id, {
      is_funded: true,
      is_processing: false,
      fund_status: 'success',
      amount_disbursed: (Number(campaign.amount_disbursed) || 0) + Number(amount),
    });

    await consumerFunctions.update_transaction(
      { status: 'success', is_approved: true, transaction_hash: hash },
      transactionId
    );

    await consumerFunctions.addWalletAmount(Number(amount), uuid);
    try {
      const OrgWallet = await Wallet.findOne({
        where: { OrganisationId: campaign.OrganisationId, CampaignId: null }
      });
      const fullCampaign = await Campaign.findByPk(campaign.id, { include: [Wallet] });
      const res = await seedAllowancesOnce(fullCampaign, OrgWallet);
      Logger.info(`[allowance] (crypto) result: ${JSON.stringify(res)}`);
    } catch (e) {
      Logger.error(`[allowance] (crypto) hook failed: ${e.message}`);
    }

    msg.ack();                   // ✅ must ack on success
    Logger.info('[confirmFundWithCrypto] acked');
  } catch (err) {
    Logger.error(`[confirmFundWithCrypto] error: ${err.message || err}`);
    msg.reject();                // ✅ ensure we leave “unacked”
  }
})
.then(() => Logger.info('ACTIVATE CONSUMER FOR CAMPAIGN CONFIRMING CRYPTO FUNDING'))
.catch((e) => Logger.error('Consumer activate error (confirmFundWithCrypto): ' + e));

increaseGasFundWithCrypto.activateConsumer(async (msg) => {
  const { keys, message } = msg.getContent();
  const { transactionId, campaign, campaignWallet, amount } = message;
  try {
    const gasFee = await BlockchainService.reRunContract('token', 'mint', keys);
    if (!gasFee) {
      msg.reject();
      return;
    }

    await consumerFunctions.update_transaction(
      { transaction_hash: gasFee.retried },
      transactionId
    );

    await QueueService.confirmFundCampaignWithCrypto(
      gasFee.retried,
      transactionId,
      campaignWallet.uuid,
      amount,
      campaign
    );

    msg.ack();                 // ⬅ ACK here too
  } catch (err) {
    Logger.error(`increaseGasFundWithCrypto error: ${err.message || err}`);
    msg.reject();
  }
});

});
