// scripts/check-allowance.js
require('dotenv').config();
const { ethers } = require('ethers');
const path = require('path');
const { getTokenContract } = require(path.join(__dirname, '../../chats-blockchain/src/resources/web3config'));

const CAMPAIGN_ID = 6;
const B_ADDR      = '0x13d22eeB00c0aA9C2A705efE4147Fb4840603174'; // your wallet

(async () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const token    = getTokenContract.connect(provider);

  // Resolve campaign address from the same key you used to approve
  const campaignPk = '0xe5cbcd9e9dc05e1f6c456c424aa40ef52dad72b87b45071530843f82c23d589c';
  const campaign   = new ethers.Wallet(campaignPk, provider);

  const allowed = await token.allowance(campaign.address, B_ADDR);
  console.log('Allowance (CHATS, 6dp):', ethers.utils.formatUnits(allowed, 6));
})();