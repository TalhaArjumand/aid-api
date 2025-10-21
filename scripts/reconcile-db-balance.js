const { ethers } = require('ethers');
const { Wallet } = require('../src/models');

async function reconcileDBBalance() {
  try {
    console.log('🔄 Reconciling DB balance with on-chain ERC-20 balance...');
    
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || process.env.BLOCKCHAINSERV);
    const tokenAddr = process.env.CONTRACTADDR_TEST || process.env.CONTRACTADDR;
    const abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
    const t = new ethers.Contract(tokenAddr, abi, provider);

    // Find campaign wallet row
    const orgId = 11;                 // Your org id
    const campaignId = 11;            // Your campaign id
    const w = await Wallet.findOne({ where: { OrganisationId: orgId, CampaignId: campaignId } });
    
    if (!w) { 
      console.log("❌ No campaign wallet found"); 
      process.exit(1); 
    }

    const addr = w.address;
    const [raw, dec] = await Promise.all([
      t.balanceOf(addr), 
      t.decimals().catch(() => 18)
    ]);
    const human = ethers.utils.formatUnits(raw, dec);

    // Store raw in balance (integer-like) and human in crypto/fiat fields
    await w.update({ 
      balance: raw.toString(), 
      crypto_balance: human, 
      fiat_balance: raw.toString(),
      was_funded: true 
    });
    
    console.log("✅ Synced wallet", { 
      address: addr, 
      raw: raw.toString(), 
      human: human,
      campaignId: campaignId,
      orgId: orgId
    });
    
  } catch (error) {
    console.error('❌ Error reconciling balance:', error.message);
    process.exit(1);
  }
}

reconcileDBBalance().then(() => {
  console.log('✅ DB reconciliation completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ DB reconciliation failed:', error);
  process.exit(1);
});
