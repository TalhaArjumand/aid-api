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
const RabbitMq = require('../libs/RabbitMQ/Connection');   // ✅ Clean direct import (NO default problem)
console.log('RabbitMq prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(RabbitMq)));  // For debug clarity

const {
  WITHHELD_FUND,
  CONFIRM_WITHHOLDING_FUND,
  WITHHOLD_FUND_GAS_ERROR
} = require('../constants/queues.constant');

const {
  BlockchainService,
  QueueService,
  WalletService,
  TransactionService
} = require('../services');

// 🛠️ Declare queues properly
const withHoldFund = RabbitMq.declareQueue(WITHHELD_FUND, {
  durable: true,
  prefetch: 1
});

const confirmHoldFund = RabbitMq.declareQueue(CONFIRM_WITHHOLDING_FUND, {
  durable: true,
  prefetch: 1
});

const increaseGasHoldFund = RabbitMq.declareQueue(WITHHOLD_FUND_GAS_ERROR, {
  durable: true,
  prefetch: 1
});

//################# Helper Functions ######################
const update_transaction = async (args, uuid) => {
  const transaction = await TransactionService.findTransaction({ uuid });
  if (!transaction) return null;
  await transaction.update(args);
  return transaction;
};

const addWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({ where: { uuid } });
  if (!wallet) return null;
  await wallet.update({
    balance: Sequelize.literal(`balance + ${amount}`),
    fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
  });
  Logger.info(`Wallet amount added with ${amount}`);
  return wallet;
};

const deductWalletAmount = async (amount, uuid) => {
  const wallet = await Wallet.findOne({ where: { uuid } });
  if (!wallet) return null;
  await wallet.update({
    balance: Sequelize.literal(`balance - ${amount}`),
    fiat_balance: Sequelize.literal(`fiat_balance - ${amount}`)
  });
  Logger.info(`Wallet amount deducted with ${amount}`);
  return wallet;
};

const update_campaign = async (id, args) => {
  const campaign = await Campaign.findOne({ where: { id } });
  if (!campaign) return null;
  await campaign.update(args);
  return campaign;
};

//################# Consumers ######################
RabbitMq.completeConfiguration()
  .then(() => {

    // ➡️ Consumer for withholding funds
    withHoldFund.activateConsumer(async msg => {
      const { campaign_id, organisation_id, transactionId, amount } = msg.getContent();

      const [organizationKeys, campaignKeys] = await Promise.all([
        BlockchainService.setUserKeypair(`organisation_${organisation_id}`),
        BlockchainService.setUserKeypair(`campaign_${campaign_id}`)
      ]);

      const transfer = await BlockchainService.transferTo(
        campaignKeys.privateKey,
        organizationKeys.address,
        amount,
        {
          transactionId,
          campaign_id,
          organisation_id,
          stringBalance: amount.toString()
        },
        'withHoldFunds'
      );

      if (!transfer) {
        msg.nack();
        return;
      }

      await update_transaction(
        { transaction_hash: transfer.Transfered },
        transactionId
      );

      await QueueService.confirmWithHoldFunds({
        transactionId,
        transaction_hash: transfer.Transfered,
        campaign_id,
        organisation_id,
        amount
      });

      Logger.info('Transfer to NGO withheld successful.');
      msg.ack();
    })
    .then(() => Logger.info('Running consumer for withholding funds'))
    .catch(error => Logger.error(`Error withholding funds: ${error}`));

    // ➡️ Consumer for confirming withholding funds
    confirmHoldFund.activateConsumer(async msg => {
      const { transactionId, transaction_hash, campaign_id, organisation_id, amount } = msg.getContent();

      const confirmed = await BlockchainService.confirmTransaction(transaction_hash);
      if (!confirmed) {
        msg.nack();
        return;
      }

      await update_campaign(campaign_id, {
        is_funded: false,
        is_processing: false,
        amount_disburse: 0
      });

      await update_transaction(
        { status: 'success', is_approved: true },
        transactionId
      );

      const organisationW = await WalletService.findMainOrganisationWallet(organisation_id);
      const campaignW = await WalletService.findSingleWallet({
        CampaignId: campaign_id,
        OrganisationId: organisation_id
      });

      await addWalletAmount(amount, organisationW.uuid);
      await deductWalletAmount(amount, campaignW.uuid);

      Logger.info('Confirmed withdrawal of withheld funds.');
      msg.ack();
    })
    .then(() => Logger.info('Running consumer for confirming withholding funds'))
    .catch(error => Logger.error(`Error confirming withholding funds: ${error}`));

    // ➡️ Consumer for increasing gas if needed
    increaseGasHoldFund.activateConsumer(async msg => {
      const { keys, message } = msg.getContent();

      const gasFee = await BlockchainService.reRunContract(
        'token',
        'transfer',
        { ...keys, amount: keys.amount.toString() }
      );

      if (!gasFee) {
        msg.nack();
        return;
      }

      await update_transaction(
        { transaction_hash: gasFee.retried },
        message.transactionId
      );

      await QueueService.confirmWithHoldFunds({
        ...message,
        transaction_hash: gasFee.retried
      });

      Logger.info('Gas increased successfully for withholding fund transfer.');
      msg.ack();
    })
    .then(() => Logger.info('Running consumer for increasing gas for withholding funds'))
    .catch(error => Logger.error(`Error increasing gas for withholding funds: ${error}`));

  })
  .then(() => Logger.info('Organization Consumer fully running 🚀'))
  .catch(error => Logger.error(`Organization consumer error: ${error}`));