const { ethers } = require('ethers');

async function checkOps() {
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
  const abi = [
    'function CheckUserList(address) view returns(bool)',
    'function isBlackListedAddress(address) view returns(bool)',
    'function AddUserList(address)'
  ];
  
  const ops = new ethers.Contract('0xF12b5dd4EAD5F743C6BaA640B0216200e89B60Da', abi, provider);
  const w = new ethers.Wallet('0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', provider);
  const opsWithSigner = ops.connect(w);
  const orgAddr = '0x3CF208b36eD0a76D1376F97322524DA6dCb763DE';
  
  const isListed = await ops.CheckUserList(orgAddr);
  console.log('Is listed:', isListed);
  
  if (!isListed) {
    try {
      const tx = await opsWithSigner.AddUserList(orgAddr);
      console.log('AddUserList tx:', tx.hash);
      await tx.wait();
      console.log('✅ Added to user list');
    } catch (e) {
      console.log('AddUserList error:', e.message);
    }
  }
}

checkOps();
