const { ethers } = require('ethers');
const { Campaign, Wallet } = require('../src/models');

async function syncCampaignBalance() {
  try {
    console.log('🔄 Syncing campaign wallet balances with on-chain data...');
    
    // Get campaign 11
    const campaign = await Campaign.findByPk(11, {
      include: [{ model: Wallet, as: 'Wallet' }]
    });
    
    if (!campaign) {
      console.log('❌ Campaign 11 not found');
      return;
    }
    
    console.log(`📍 Campaign 11 wallet address: ${campaign.Wallet.address}`);
    
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    const tokenAddress = '0xf25186B5081Ff5cE73482AD761DB0eB0d25abfBF';
    const abi = ['function balanceOf(address) view returns(uint256)', 'function decimals() view returns(uint8)'];
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    
    // Get on-chain balance
    const decimals = await contract.decimals();
    const rawBalance = await contract.balanceOf(campaign.Wallet.address);
    const onChainBalance = Number(ethers.utils.formatUnits(rawBalance, decimals));
    
    console.log(`💰 On-chain balance: ${onChainBalance} CHS`);
    console.log(`💾 Current DB balance: ${campaign.Wallet.balance / 1000000} CHS`);
    
    // Update DB balance
    const updateResult = await campaign.Wallet.update({
      balance: onChainBalance * 1000000, // Convert to DB units
      fiat_balance: onChainBalance * 1000000
    });
    
    console.log(`✅ Update result:`, updateResult);
    
    // Reload the wallet to verify the update
    await campaign.Wallet.reload();
    console.log(`✅ Updated DB balance to: ${campaign.Wallet.balance / 1000000} CHS`);
    console.log(`🎯 Campaign budget: ${campaign.budget} CHS`);
    console.log(`✅ Has sufficient balance: ${onChainBalance >= campaign.budget}`);
    
  } catch (error) {
    console.error('❌ Error syncing balance:', error.message);
  }
}

syncCampaignBalance().then(() => {
  console.log('✅ Balance sync completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Balance sync failed:', error);
  process.exit(1);
});
