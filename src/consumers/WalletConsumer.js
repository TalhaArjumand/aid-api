console.log('✅ WalletConsumer.js is now running!');

const { BlockchainService, WalletService, QueueService } = require('../services');
const { Logger } = require('../libs');
const RabbitMq = require('../libs/RabbitMQ/Connection');
const { CREATE_WALLET, CONFIRM_AND_CREATE_WALLET } = require('../constants').queuesConst;

const createWalletQueue = RabbitMq.declareQueue(CREATE_WALLET, {
  durable: true,
  prefetch: 1
});

const confirmAndCreateWalletQueue = RabbitMq.declareQueue(CONFIRM_AND_CREATE_WALLET, {
  durable: true,
  prefetch: 1
});

createWalletQueue.initialized.then(() => console.log(`🎯 Queue "${CREATE_WALLET}" is now live`));

RabbitMq.completeConfiguration()
  .then(() => {
    Logger.info(`✅ RabbitMq completeConfiguration successful`);

    createWalletQueue.activateConsumer(async msg => {
      console.log('🎯 Received message from createWallet queue:', msg.getContent());

      const content = msg.getContent();
      const token = await BlockchainService.addUser(
        `user_${content.ownerId}` // simplified for this example
      );

      if (!token) {
        console.log('🚨 BlockchainService.addUser failed');
        msg.nack();
        return;
      }

      Logger.info(`${JSON.stringify(content)}, CONTENT`);
      Logger.info(`${JSON.stringify(token)}, TOKEN`);
      await QueueService.confirmAndCreateWallet(content, token);
      Logger.info('📤 Address Sent for confirmation');
      msg.ack();
    });

    confirmAndCreateWalletQueue.activateConsumer(async msg => {
      const { content, keyPair } = msg.getContent();
      Logger.info(`📩 Confirmed wallet for: ${keyPair.address}`);
      await WalletService.updateOrCreate(content, { address: keyPair.address });
      msg.ack();
    });

    Logger.info(`🚀 Consumers are now running!`);
  })
  .catch(error => {
    Logger.error(`❌ RabbitMq Error during startup: ${error}`);
  });