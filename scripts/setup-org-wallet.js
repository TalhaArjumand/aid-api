const { ethers } = require('ethers');
const { Wallet, Organisation } = require('../src/models');

// Configuration
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const TOKEN_ADDRESS = process.env.CONTRACTADDR_TEST || '0xf25186B5081Ff5cE73482AD761DB0eB0d25abfBF';
const OPERATIONS_ADDRESS = process.env.OPERATIONSADDR_TEST || '0xF12b5dd4EAD5F743C6BaA640B0216200e89B60Da';
const ADMIN_PK = process.env.ADMIN_PASS_TEST || '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
const ORG_ID = 11;

// Contract ABIs
const TOKEN_ABI = [
  'function mint(uint256 amount, address to)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function owner() view returns (address)'
];

const OPERATIONS_ABI = [
  'function CheckUserList(address) view returns (bool)',
  'function isBlackListedAddress(address) view returns (bool)',
  'function AddUserList(address)',
  'function AddAdmin(address)',
  'function isAdmin(address) view returns (bool)'
];

async function setupOrgWallet() {
  try {
    console.log('🔧 Setting up organisation wallet for blockchain integration...');
    
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PK, provider);
    
    // Get contracts
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, adminWallet);
    const operationsContract = new ethers.Contract(OPERATIONS_ADDRESS, OPERATIONS_ABI, adminWallet);
    
    // Get organisation wallet from DB
    const orgWallet = await Wallet.findOne({
      where: { OrganisationId: ORG_ID, CampaignId: null }
    });
    
    if (!orgWallet) {
      throw new Error('❌ Organisation wallet not found in database');
    }
    
    const orgAddress = orgWallet.address;
    console.log(`📍 Organisation wallet address: ${orgAddress}`);
    
    // Check if org is listed in Operations contract
    const isListed = await operationsContract.CheckUserList(orgAddress);
    console.log(`👤 User listed in Operations: ${isListed}`);
    
    // Check if org is blacklisted
    const isBlacklisted = await operationsContract.isBlackListedAddress(orgAddress);
    console.log(`🚫 User blacklisted: ${isBlacklisted}`);
    
    // Check if org is admin
    const isAdmin = await operationsContract.isAdmin(orgAddress);
    console.log(`👑 User is admin: ${isAdmin}`);
    
    // Add to user list if not listed
    if (!isListed) {
      console.log('➕ Adding organisation to user list...');
      const tx = await operationsContract.AddUserList(orgAddress);
      await tx.wait();
      console.log('✅ Organisation added to user list');
    }
    
    // Check current token balance
    const decimals = await tokenContract.decimals();
    const currentBalance = await tokenContract.balanceOf(orgAddress);
    const formattedBalance = ethers.utils.formatUnits(currentBalance, decimals);
    console.log(`💰 Current token balance: ${formattedBalance} CHS`);
    
    // Mint tokens if balance is low
    if (parseFloat(formattedBalance) < 1000000) { // Less than 1M tokens
      console.log('🪙 Minting tokens to organisation wallet...');
      const mintAmount = ethers.utils.parseUnits('1000000', decimals); // 1M tokens
      const mintTx = await tokenContract.mint(mintAmount, orgAddress);
      await mintTx.wait();
      console.log('✅ Tokens minted successfully');
      
      // Verify new balance
      const newBalance = await tokenContract.balanceOf(orgAddress);
      const newFormattedBalance = ethers.utils.formatUnits(newBalance, decimals);
      console.log(`💰 New token balance: ${newFormattedBalance} CHS`);
    }
    
    // Update DB balance to match on-chain
    await orgWallet.update({
      balance: parseFloat(formattedBalance) * 1000000, // Convert to DB units (6 decimals)
      fiat_balance: parseFloat(formattedBalance) * 1000000
    });
    console.log('💾 Database balance updated');
    
    // Check ETH balance for gas
    const ethBalance = await provider.getBalance(orgAddress);
    const ethFormatted = ethers.utils.formatEther(ethBalance);
    console.log(`⛽ ETH balance: ${ethFormatted} ETH`);
    
    if (parseFloat(ethFormatted) < 1) {
      console.log('⚠️  Low ETH balance - may need to fund for gas fees');
    }
    
    console.log('🎉 Organisation wallet setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up organisation wallet:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupOrgWallet().then(() => {
  console.log('✅ Setup completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
