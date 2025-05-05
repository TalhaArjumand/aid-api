// test/testWalletCreate.js

const { QueueService } = require('../src/services');

async function run() {
  try {
    await QueueService.createWallet(5, 'user'); // 5 is your newly registered user id
    console.log('✅ Wallet creation job sent to Queue!');
  } catch (err) {
    console.error('❌ Error sending wallet creation job:', err);
  }
}

run();