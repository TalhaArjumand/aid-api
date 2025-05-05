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
  fundWithCrypto
    .activateConsumer(async msg => {
      const {campaignWallet, campaign, amount, transactionId} =
        msg.getContent();
      const campaignAddress = await BlockchainService.setUserKeypair(
        `campaign_${campaign.id}`
      );
      const message = msg.getContent();
      const mint = await BlockchainService.mintToken(
        campaignAddress.address,
        amount,
        message,
        'Campaign'
      );

      if (!mint) {
        msg.nack();
        return;
      }
      await consumerFunctions.update_transaction(
        {transaction_hash: mint.Minted},
        transactionId
      );
      await QueueService.confirmFundCampaignWithCrypto(
        mint.Minted,
        transactionId,
        campaignWallet.uuid,
        amount,
        campaign
      );
      Logger.info('MINT TOKEN FOR CAMPAIGN SENT FOR CONFIRMATION');
    })
    .then(() => {
      Logger.info('ACTIVATE CONSUMER FOR CAMPAIGN CRYPTO FUNDING');
    })
    .catch(error => {
      Logger.error(
        'ERROR ACTIVATE CONSUMER FOR CAMPAIGN CRYPTO FUNDING: ' + error
      );
    });

  confirmFundWithCrypto
    .activateConsumer(async msg => {
      const {hash, transactionId, uuid, amount, campaign} = msg.getContent();

      const confirm = await BlockchainService.confirmTransaction(hash);
      if (!confirm) {
        msg.nack();
        return;
      }
      await consumerFunctions.update_campaign(campaign.id, {
        is_funded: true,
        is_processing: false,
        amount_disbursed: campaign.amount_disbursed + amount
      });
      await consumerFunctions.update_transaction(
        {status: 'success', is_approved: true},
        transactionId
      );

      await consumerFunctions.addWalletAmount(amount, uuid);
      Logger.info('MINT TOKEN FOR CAMPAIGN CRYPTO FUNDING SUCCESSFULLY');
    })
    .then(() => {
      Logger.info('ACTIVATE CONSUMER FOR CAMPAIGN CONFIRMING CRYPTO FUNDING');
    })
    .catch(error => {
      Logger.error(
        'ERROR ACTIVATE CONSUMER CAMPAIGN CONFIRMING CRYPTO FUNDING: ' + error
      );
    });

    increaseGasFundWithCrypto
    .activateConsumer(async msg => {   // <-- small fix here
      const {keys, message} = msg.getContent();
      const {transactionId, campaign, campaignWallet, amount} = message;
      const gasFee = await BlockchainService.reRunContract(
        'token',
        'mint',
        keys
      );
      if (!gasFee) {
        msg.nack();
        return;
      }
      await consumerFunctions.update_transaction(
        {
          transaction_hash: gasFee.retried
        },
        transactionId
      );
      await QueueService.confirmFundCampaignWithCrypto(
        gasFee.retried,
        transactionId,
        campaignWallet.uuid,
        amount,
        campaign
      );
    })
    .then(() => {
      Logger.info(
        'ACTIVATE CONSUMER FOR INCREASING GAS FOR CAMPAIGN CONFIRMING CRYPTO FUNDING'
      );
    })
    .catch(error => {
      Logger.error(
        'ERROR ACTIVATE CONSUMER FOR INCREASING GAS FOR CAMPAIGN CONFIRMING CRYPTO FUNDING: ' +
          error
      );
    });
});
