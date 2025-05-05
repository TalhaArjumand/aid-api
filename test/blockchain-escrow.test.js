// ────────────────────────────────────────────────────────────────
// ✅ chatsEscrowFactory + chatsEscrow Deployment and Single Test
// ────────────────────────────────────────────────────────────────

// 📦 Imports
require("dotenv").config();
const path = require("path");
const { ethers } = require("ethers");

// 📦 Load Blockchain Config
const { provider, account, account_pass } = require(path.join(
  __dirname,
  "../../chats-blockchain/src/resources/web3config"
));

// 📦 Load ABIs
const escrowFactoryABI = require(path.join(
  __dirname,
  "../../chats-blockchain/artifacts/contracts/chatsEscrowFactory.sol/chatsEscrowFactory.json"
)).abi;

const escrowABI = require(path.join(
  __dirname,
  "../../chats-blockchain/artifacts/contracts/chatsEscrow.sol/chatsEscrow.json"
)).abi;

// ────────────────────────────────────────────────────────────────
// 🗂 Globals
// ────────────────────────────────────────────────────────────────
let escrowFactoryContract;
let escrowContract;
let deployedEscrowAddress;

async function createEscrowContractInstance() {
    const wallet = new ethers.Wallet(account_pass, provider);
    escrowContract = new ethers.Contract(deployedEscrowAddress, escrowABI, wallet);
  }
// 🛡️ Wallet Setup
const wallet = new ethers.Wallet(account_pass, provider);

// ────────────────────────────────────────────────────────────────
// ⚙️ Setup Factory Contract
// ────────────────────────────────────────────────────────────────
function setupFactoryContract() {
  const factoryAddress = process.env.ESCROWFACTORYCONTRACT_TEST;
  escrowFactoryContract = new ethers.Contract(factoryAddress, escrowFactoryABI, wallet);
}

// ────────────────────────────────────────────────────────────────
// 🚀 Deploy New Escrow from Factory
// ────────────────────────────────────────────────────────────────
async function deployEscrowFromFactory() {
  console.log("\n🔵 Deploying new Escrow Contract...");

  const tx = await escrowFactoryContract.deployEscrow(
    "0xf25186B5081Ff5cE73482AD761DB0eB0d25abfBF",  // Uniswap Router
    "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",  // WMATIC
    "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",  // Quickswap Router
    "Test Campaign",
    "0xf12b5dd4ead5f743c6baa640b0216200e89b60da"   // Operations
  );

  const receipt = await tx.wait();

  const event = receipt.events.find((e) => e.event === "EscrowCreated");
  deployedEscrowAddress = event.args.escrowContract;

  console.log(`✅ Escrow Deployed at: ${deployedEscrowAddress}`);

  escrowContract = new ethers.Contract(deployedEscrowAddress, escrowABI, wallet);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test fundCampaignMatic()
// ────────────────────────────────────────────────────────────────
// 📋 Purpose:
// - Simulate a user funding the campaign using native cryptocurrency (MATIC)
// - This test:
//   ➔ Sends a small amount of MATIC to the contract
//   ➔ Mocks the swap behavior (no real Uniswap swap because we commented that for local testing)
//   ➔ Checks that user's contribution is recorded correctly
// ────────────────────────────────────────────────────────────────
async function testFundCampaignMatic() {
    console.log("\n🧪 Testing fundCampaignMatic...");

    const tx = await escrowContract.fundCampaignMatic({
      value: ethers.utils.parseEther("0.1"), // Send 0.1 MATIC
    });

    const receipt = await tx.wait();
    console.log(`✅ fundCampaignMatic tx hash: ${receipt.transactionHash}`);

    const fundedAmount = await escrowContract.getFundAmount(wallet.address);
    console.log(`💰 Funded Amount: ${fundedAmount.toString()} wei`);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test getFundAmount()
// ────────────────────────────────────────────────────────────────
// 📋 Purpose:
// - Read the current funded balance of a user from the contract
// - This test:
//   ➔ Calls the view function `getFundAmount(address)`
//   ➔ Prints how much MATIC the user has funded
// ────────────────────────────────────────────────────────────────
async function testGetFundAmount() {
    console.log("\n🧪 Testing getFundAmount...");

    const fundAmount = await escrowContract.getFundAmount(wallet.address);
    console.log(`💰 Fund Amount for ${wallet.address}: ${fundAmount.toString()} wei`);
}
// ────────────────────────────────────────────────────────────────
// 🧪 Test adminSignatory()
// ────────────────────────────────────────────────────────────────
// 📋 Purpose:
// - Admin approves a user for withdrawal
// - Pre-requisite before any user can call `withdrawFunds()`
// - This test:
//   ➔ Calls `adminSignatory(address)`
//   ➔ Checks if withdrawal approval is now `true`
// ────────────────────────────────────────────────────────────────
async function testAdminSignatory() {
    console.log("\n🧪 Testing adminSignatory...");

    const tx = await escrowContract.adminSignatory(wallet.address);
    const receipt = await tx.wait();
    console.log(`✅ adminSignatory tx hash: ${receipt.transactionHash}`);

    const approvalStatus = await escrowContract.WithdrawalApprovalStatus(wallet.address);
    console.log(`🔍 Withdrawal Approval Status: ${approvalStatus}`);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test withdrawFunds()
// ────────────────────────────────────────────────────────────────
// 📋 Purpose:
// - User withdraws previously funded amount after admin approval
// - Pre-requisite:
//    ➔ User must have funded the campaign
//    ➔ Admin must have called `adminSignatory()`
// - This test:
//    ➔ Withdraws MATIC (mocked on local Ganache)
// ────────────────────────────────────────────────────────────────
async function testWithdrawFunds() {
    console.log("\n🧪 Testing withdrawFunds...");

    // First approve user
    const approvalTx = await escrowContract.adminSignatory(wallet.address);
    await approvalTx.wait();
    console.log(`✅ Admin approved withdrawal for ${wallet.address}`);

    // Now withdraw
    const withdrawTx = await escrowContract.withdrawFunds(ethers.utils.parseEther("0.05")); // withdraw 0.05 MATIC
    const receipt = await withdrawTx.wait();

    console.log(`✅ Withdraw tx hash: ${receipt.transactionHash}`);
}


// ────────────────────────────────────────────────────────────────
// 🧪 Test endCampaign()
// 📋 Purpose: 
// - This function simulates the admin manually ending (pausing) the fundraising campaign.
// - After calling this, no more users should be able to fund the campaign.
// - It checks whether the campaign status correctly changes to 'false'.
// - Only the contract owner (admin) is allowed to call this.
// ────────────────────────────────────────────────────────────────
async function testEndCampaign() {
    console.log("\n🧪 Testing endCampaign...");
  
    // Call endCampaign as the owner
    const tx = await escrowContract.endCampaign();
    const receipt = await tx.wait();
    console.log(`✅ endCampaign tx hash: ${receipt.transactionHash}`);
  
    // Verify if campaign is actually ended
    const campaignStatus = await escrowContract.getCampaignStatus();
    console.log(`🔍 Campaign Active?: ${campaignStatus}`);
  }

// ────────────────────────────────────────────────────────────────
// 🧪 Test resumeCampaign()
// 📋 Purpose: 
// - This function reactivates a campaign that was previously ended by admin.
// - It should switch the campaignStatus from 'false' back to 'true'.
// - Only the contract owner (admin) is allowed to call this function.
// ────────────────────────────────────────────────────────────────
async function testResumeCampaign() {
    console.log("\n🧪 Testing resumeCampaign...");
  
    // Call resumeCampaign as the owner
    const tx = await escrowContract.resumeCampaign();
    const receipt = await tx.wait();
    console.log(`✅ resumeCampaign tx hash: ${receipt.transactionHash}`);
  
    // Verify if campaign is now active again
    const campaignStatus = await escrowContract.getCampaignStatus();
    console.log(`🔍 Campaign Active Again?: ${campaignStatus}`);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test updateDefaultStableCoin()
// 📋 Purpose:
// - This function allows the admin to set a new default stablecoin address.
// - The default stablecoin is used in all funding/withdrawal operations.
// - Only the owner should be able to update it.
// ────────────────────────────────────────────────────────────────
async function testUpdateDefaultStableCoin() {
    console.log("\n🧪 Testing updateDefaultStableCoin...");
  
    // Pick any dummy stablecoin address (could be random for testing)
    const dummyStableCoinAddress = "0x000000000000000000000000000000000000dead"; 
  
    const tx = await escrowContract.updateDefaultStableCoin(dummyStableCoinAddress);
    const receipt = await tx.wait();
    console.log(`✅ updateDefaultStableCoin tx hash: ${receipt.transactionHash}`);
  
    // Verify that the stable coin address is updated
    const updatedAddress = await escrowContract.defaultStableCoin();
    console.log(`🔍 Updated Default Stablecoin Address: ${updatedAddress}`);
}

  // ────────────────────────────────────────────────────────────────
// 🧪 Test updateErc20Token()
// 📋 Purpose:
// - This function allows the admin to register a new ERC20 token by its symbol.
// - This token can later be accepted for funding the campaign.
// - Only the owner should be able to call this.
// ────────────────────────────────────────────────────────────────
async function testUpdateErc20Token() {
    console.log("\n🧪 Testing updateErc20Token...");
  
    // Pick any dummy ERC20 token address and symbol
    const dummyTokenAddress = "0x000000000000000000000000000000000000beef"; 
    const dummySymbol = "DUMMY";
  
    const tx = await escrowContract.updateErc20Token(dummyTokenAddress, dummySymbol);
    const receipt = await tx.wait();
    console.log(`✅ updateErc20Token tx hash: ${receipt.transactionHash}`);
  
    // Verify that the token was updated correctly
    const updatedTokenAddress = await escrowContract.erc20Tokens(dummySymbol);
    console.log(`🔍 Updated ERC20 Token Address for ${dummySymbol}: ${updatedTokenAddress}`);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test getFundAvailability(address)
// Purpose: Check if a specific funder has available funds to withdraw
// ────────────────────────────────────────────────────────────────
async function testGetFundAvailability() {
    console.log("\n🧪 Testing getFundAvailability...");
  
    const availability = await escrowContract.getFundAvailability(wallet.address);
    console.log(`🔍 Fund Availability for ${wallet.address}: ${availability}`);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test funderAvailable(address)
// Purpose: Check if an address has *ever* funded the campaign
// ────────────────────────────────────────────────────────────────
async function testFunderAvailable() {
    console.log("\n🧪 Testing funderAvailable...");
  
    const isFunder = await escrowContract.funderAvailable(wallet.address);
    console.log(`🔍 Is Funder (${wallet.address}): ${isFunder}`);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test WithdrawalApprovalStatus(address)
// Purpose: Check if an address has *admin approval* to withdraw funds
// ────────────────────────────────────────────────────────────────
async function testWithdrawalApprovalStatus() {
    console.log("\n🧪 Testing WithdrawalApprovalStatus...");
  
    const approvalStatus = await escrowContract.WithdrawalApprovalStatus(wallet.address);
    console.log(`🔍 Withdrawal Approval Status (${wallet.address}): ${approvalStatus}`);
}


// ────────────────────────────────────────────────────────────────
// 🧪 Test getCampaignStatus()
// Purpose: Check if the Campaign is currently active (true) or ended (false)
// ────────────────────────────────────────────────────────────────
async function testGetCampaignStatus() {
    console.log("\n🧪 Testing getCampaignStatus...");
  
    const status = await escrowContract.getCampaignStatus();
    console.log(`🔍 Campaign Status: ${status ? "Active" : "Ended"}`);
}

// ────────────────────────────────────────────────────────────────
// 🧪 Test getTokenBalance()
// Purpose: View the current token (stablecoin) balance stored in the contract
// ────────────────────────────────────────────────────────────────
async function testGetTokenBalance() {
    console.log("\n🧪 Testing getTokenBalance...");
  
    const balance = await escrowContract.getTokenBalance();
    console.log(`🔍 Contract's Stablecoin Balance: ${balance.toString()} wei`);
  }
// ────────────────────────────────────────────────────────────────
// 🧹 Main Runner
// ────────────────────────────────────────────────────────────────
async function run() {
    setupFactoryContract();
    await deployEscrowFromFactory();
    await createEscrowContractInstance();

    await testFundCampaignMatic();
    await testGetFundAmount();
    await testAdminSignatory();
    await testWithdrawFunds();    
    await testEndCampaign();
    await testResumeCampaign();
    await testUpdateDefaultStableCoin();
    await testUpdateErc20Token();
    await testGetFundAvailability();
    await testFunderAvailable();
    await testWithdrawalApprovalStatus();
    await testGetCampaignStatus();
    //await testGetTokenBalance();
}

// 🏃 Execute
run();