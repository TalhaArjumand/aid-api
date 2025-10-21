// scripts/fund-campaign-eth.js
require('dotenv').config();
const { ethers } = require('ethers');

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const CAMPAIGN_PK = '0xe5cbcd9e9dc05e1f6c456c424aa40ef52dad72b87b45071530843f82c23d589c'; // from your logs
const FUNDER_PK = process.env.ADMIN_PASS_TEST || process.env.ADMIN_PASS; // any rich local account

(async () => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const funder   = new ethers.Wallet(FUNDER_PK, provider);
  const campaign = new ethers.Wallet(CAMPAIGN_PK, provider);

  const need = ethers.utils.parseEther('0.05');
  const bal  = await provider.getBalance(campaign.address);

  console.log('Campaign:', campaign.address, 'bal:', ethers.utils.formatEther(bal), 'ETH');
  if (bal.gte(need)) {
    console.log('✅ Already has enough ETH');
    return;
  }

  const tx = await funder.sendTransaction({
    to: campaign.address,
    value: need.sub(bal).mul(2), // send a bit extra
    gasLimit: 21000
  });
  await tx.wait();
  console.log('⚡ Funded. tx:', tx.hash);
})();