// scripts/fund-eth.js
require('dotenv').config();
const { ethers } = require('ethers');

// usage: node scripts/fund-eth.js <CAMPAIGN_ADDR> [amountEth=0.05]
(async () => {
  try {
    const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
    const FUNDER_PK = process.env.ADMIN_PASS_TEST || process.env.ADMIN_PASS; // rich local account (private key hex)
    const CAMPAIGN_ADDR = (process.argv[2] || process.env.CAMPAIGN_ADDR || '').trim();
    const amountEth = process.argv[3] || '0.05';

    if (!FUNDER_PK) throw new Error('Funder private key is missing (set ADMIN_PASS_TEST or ADMIN_PASS)');
    if (!CAMPAIGN_ADDR || !ethers.utils.isAddress(CAMPAIGN_ADDR)) {
      throw new Error('Provide a valid campaign address: node scripts/fund-eth.js 0xABC... [amountEth]');
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const funder = new ethers.Wallet(FUNDER_PK, provider);

    const need = ethers.utils.parseEther(amountEth);
    const currentBal = await provider.getBalance(CAMPAIGN_ADDR);
    const funderBal = await provider.getBalance(funder.address);

    console.log('RPC:', RPC_URL);
    console.log('Funder:', funder.address, 'bal:', ethers.utils.formatEther(funderBal), 'ETH');
    console.log('Campaign:', CAMPAIGN_ADDR, 'bal:', ethers.utils.formatEther(currentBal), 'ETH');

    if (currentBal.gte(need)) {
      console.log('✅ Campaign already has at least', amountEth, 'ETH');
      return;
    }

    const topUp = need.sub(currentBal);
    const feeData = await provider.getFeeData(); // works on Besu with EIP-1559 disabled or enabled
    // fallback for legacy gas price if feeData.gasPrice is null
    const gasPrice = feeData.gasPrice || ethers.utils.parseUnits('1', 'gwei');

    const tx = await funder.sendTransaction({
      to: CAMPAIGN_ADDR,
      value: topUp,
      gasLimit: 21000,       // simple ETH transfer
      gasPrice               // omit if your Besu is EIP-1559; then use maxFeePerGas/maxPriorityFeePerGas instead
    });

    console.log('⛽ Sending', ethers.utils.formatEther(topUp), 'ETH...');
    const receipt = await tx.wait();
    console.log('⚡ Funded. tx:', receipt.transactionHash);
  } catch (err) {
    console.error('❌ Funding failed:', err.message);
    process.exit(1);
  }
})();