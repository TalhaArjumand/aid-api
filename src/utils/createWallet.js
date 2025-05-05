const RabbitMq = require('../libs/RabbitMQ/Connection');
const { Logger } = require('../libs');
const { CREATE_WALLET } = require('../constants/queues.constant');
const { Message } = require('@droidsolutions-oss/amqp-ts');

let createWalletQueue = null; // Declare it outside

async function initQueue() {
  if (!createWalletQueue) {
    createWalletQueue = RabbitMq.declareQueue(CREATE_WALLET, { durable: true });
    await createWalletQueue.initialized; // Important to await!
    Logger.info('✅ Wallet queue initialized!');
  }
}

async function createWallet(ownerId, wallet_type, CampaignId = null) {
  await initQueue(); // Ensure queue is declared and initialized

  const payload = { wallet_type, ownerId, CampaignId };
  Logger.info('wallet payload received');

  await RabbitMq.completeConfiguration(); // Flush config
  createWalletQueue.send(
    new Message(payload, {
      contentType: 'application/json'
    })
  );
}

module.exports = {
  createWallet
};