const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Load ABI
const chatsJsonPath = path.join(__dirname, '../../chats-blockchain/artifacts/contracts/Chats.sol/Chats.json');
const chatsABI = require(chatsJsonPath).abi;

// Create provider and contract
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const tokenAddress = '0xf25186B5081Ff5cE73482AD761DB0eB0d25abfBF';
const contract = new ethers.Contract(tokenAddress, chatsABI, provider);

async function testBalance() {
  try {
    const orgAddress = '0x3CF208b36eD0a76D1376F97322524DA6dCb763DE';
    
    console.log('Testing balance for:', orgAddress);
    
    const rawBalance = await contract.balanceOf(orgAddress);
    console.log('Raw balance:', rawBalance.toString());
    
    const formatted = ethers.utils.formatUnits(rawBalance, 6);
    console.log('Formatted balance:', formatted);
    
    const result = { Balance: formatted };
    console.log('Result object:', result);
    
    const parsed = Number(result.Balance.split(',').join(''));
    console.log('Parsed balance:', parsed);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBalance();
