///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                1. Imports and Setup                                                   //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

require("dotenv").config();
const path = require("path");
const { ethers } = require("ethers");

// ✅ Proper imports from chats-blockchain project
const connectWeb3 = require(path.join(__dirname, "../../chats-blockchain/src/connectWeb3/getterAPIController"));
const { getOpsContract, getTokenContract } = require(path.join(__dirname, "../../chats-blockchain/src/resources/web3config"));
const { Config } = require(path.join(__dirname, "../../chats-blockchain/src/utils/config"));
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                             2. Test Account Addresses                                                 //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const adminAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";  // Admin account
const testUser1 = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73";      // Test User 1
const testUser2 = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";      // Test User 2

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                          3. Basic Information Tests                                                   //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @dev Fetch the token's name.
 */
async function testGetTokenName() {
  try {
    const name = await connectWeb3.getName();
    console.log(`✅ Token Name: ${name}`);
  } catch (err) {
    console.error("❌ Error fetching token name:", err.message);
  }
}

/**
 * @dev Fetch the token's symbol.
 */
async function testGetTokenSymbol() {
  try {
    const symbol = await connectWeb3.getSymbol();
    console.log(`✅ Token Symbol: ${symbol}`);
  } catch (err) {
    console.error("❌ Error fetching token symbol:", err.message);
  }
}

/**
 * @dev Fetch the token's decimals.
 */
async function testGetTokenDecimals() {
  try {
    const decimals = await connectWeb3.getDecimals();
    console.log(`✅ Token Decimals: ${decimals}`);
  } catch (err) {
    console.error("❌ Error fetching token decimals:", err.message);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                          4. Core Functionality Tests                                                  //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @dev Mint tokens to a user address.
 * Only Admin (Owner) can mint.
 */
async function testMintTokens() {
    try {
      const recipientAddress = testUser1;
      const mintAmount = 1000 * (10 ** 6); // Mint 1000 CHATS (6 decimals)
  
      const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
      const adminWallet = new ethers.Wallet(
        process.env.ADMIN_PASS_TEST || process.env.ADMIN_PASS,
        provider
      );
  
      const chatsContract = getTokenContract.connect(adminWallet);
  
      const tx = await chatsContract.mint(mintAmount, recipientAddress);
      await tx.wait();
  
      console.log(`✅ Successfully minted ${mintAmount / (10 ** 6)} CHATS to ${recipientAddress}`);
    } catch (err) {
      console.error("❌ Error minting tokens:", err.message);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                 TEST: Redeem (Burn) CHATS Tokens from User1                                           //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testRedeemTokens() {
    try {
      console.log("🔵 Starting Redeem Test...");
  
      const { ethers } = require("ethers");
  
      const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  
      const userWallet = new ethers.Wallet(
        "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63", // Private Key of User1
        provider
      );
  
      const contract = getTokenContract.connect(userWallet);  
      const redeemAmount = ethers.utils.parseUnits("100", 6);
  
      const tx = await contract.redeem(redeemAmount);
      const receipt = await tx.wait();
  
      console.log(`✅ Successfully redeemed 100 CHATS from User1: ${userWallet.address}`);
    } catch (err) {
      console.error("❌ Error redeeming tokens:", err.message);
    }
}
  
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                           ✅ Test 1: Pause the Contract                                               //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testPauseContract() {
    console.log("\n🔵 Starting Pause Contract Test...");
  
    const { ethers } = require("ethers");
    const { tokenContract, account_pass } = require(path.join(
      __dirname,
      "../../chats-blockchain/src/resources/web3config"
    ));
  
    try {
      // Step 1: Connect Admin Wallet to Token Contract
      const contractWithAdmin = tokenContract(account_pass);
  
      // Step 2: Call pause()
      const tx = await contractWithAdmin.pause();
      await tx.wait();
  
      console.log("✅ Successfully Paused the CHATS contract.");
    } catch (err) {
      console.error("❌ Error pausing the contract:", err.message);
    }

}
  
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //                                                                                                                       //
  //                                           ✅ Test 2: Unpause the Contract                                             //
  //                                                                                                                       //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  
  async function testUnpauseContract() {
    console.log("\n🔵 Starting Unpause Contract Test...");
  
    const { ethers } = require("ethers");
    const { tokenContract, account_pass } = require(path.join(
      __dirname,
      "../../chats-blockchain/src/resources/web3config"
    ));
  
    try {
      // Step 1: Connect Admin Wallet to Token Contract
      const contractWithAdmin = tokenContract(account_pass);
  
      // Step 2: Call unpause()
      const tx = await contractWithAdmin.unpause();
      await tx.wait();
  
      console.log("✅ Successfully Unpaused the CHATS contract.");
    } catch (err) {
      console.error("❌ Error unpausing the contract:", err.message);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                            TRANSFER TEST                                                              //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testTransferTokens() {
    console.log("\n🔵 Starting Transfer Test...");
  
    const { ethers } = require("ethers");
    const { tokenContract } = require(path.join(__dirname, "../../chats-blockchain/src/resources/web3config"));
  
    try {
      // Step 1: Load User1 Wallet (sender)
      const user1PrivateKey = "0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63"; // from your genesis
      const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
      const user1Wallet = new ethers.Wallet(user1PrivateKey, provider);
  
      // Step 2: Attach Token Contract with User1's Wallet
      const tokenWithUser1 = tokenContract(user1PrivateKey);
  
      // Step 3: Define User2 address (recipient)
      const user2Address = "0xf17f52151EbEF6C7334FAD080c5704D77216b732"; // user2
  
      // Step 4: Define amount to transfer (example: 100 tokens)
      const transferAmount = ethers.utils.parseUnits("100", 6); // 100 tokens with 6 decimals
  
      // Step 5: Send Transfer
      const tx = await tokenWithUser1.transfer(user2Address, transferAmount);
      const receipt = await tx.wait();
  
      console.log(`✅ Successfully transferred 100 CHATS from User1 ➡️ User2. TxHash: ${receipt.transactionHash}`);
  
      // Step 6: Optional - Check balances
      const balanceUser1 = await tokenWithUser1.balanceOf(user1Wallet.address);
      const balanceUser2 = await tokenWithUser1.balanceOf(user2Address);
  
      console.log(`🔹 User1 Balance: ${ethers.utils.formatUnits(balanceUser1, 6)} CHATS`);
      console.log(`🔹 User2 Balance: ${ethers.utils.formatUnits(balanceUser2, 6)} CHATS`);
    } catch (error) {
      console.error("❌ Error during Transfer Test:", error.message);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                 TransferFrom Test: Delegated Transfer (User2 approves User1)                          //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testTransferFrom() {
    console.log("\n🔵 Starting TransferFrom Test...");
  
    try {
      const { ethers } = require("ethers");
      const { provider, account_pass } = require(path.join(
        __dirname,
        "../../chats-blockchain/src/resources/web3config"
      ));
  
      // Prepare User1 and User2 wallets
      const user1 = new ethers.Wallet(account_pass, provider);
      const user2 = new ethers.Wallet(
        "0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63", // Private key of User2
        provider
      );
  
      // Load CHATS contract
      const chatsArtifact = require(path.join(
        __dirname,
        "../../chats-blockchain/contracts/artifacts/Chats.json"
      ));
      const chatsContract = new ethers.Contract(Config.CONTRACTADDR, chatsArtifact.abi, provider);
  
      // Connect contracts
      const chatsWithUser2 = chatsContract.connect(user2);
      const chatsWithUser1 = chatsContract.connect(user1);
  
      // Step 1️⃣ Approve: User2 approves User1
      const approveTx = await chatsWithUser2.approve(user1.address, ethers.utils.parseUnits("50", 6));
      await approveTx.wait();
      console.log(`✅ User2 approved User1 to spend 50 CHATS`);
  
      // Step 2️⃣ TransferFrom: User1 moves tokens from User2
      const transferFromTx = await chatsWithUser1.transferFrom(
        user2.address,
        user1.address,
        ethers.utils.parseUnits("50", 6)
      );
      await transferFromTx.wait();
      console.log(`✅ User1 transferred 50 CHATS from User2 to themselves`);
  
      // Step 3️⃣ Check balances
      const user1Balance = await chatsContract.balanceOf(user1.address);
      const user2Balance = await chatsContract.balanceOf(user2.address);
  
      console.log(`🔹 User1 Balance: ${ethers.utils.formatUnits(user1Balance, 6)} CHATS`);
      console.log(`🔹 User2 Balance: ${ethers.utils.formatUnits(user2Balance, 6)} CHATS`);
  
    } catch (err) {
      console.error("❌ Error in TransferFrom Test:", err.message);
    }
  }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                           5. Admin-only Tests (Coming Soon)                                            //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// (later we will add: snapshot, pause, unpause, setParams, etc.)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 📸 SNAPSHOT TEST — Take a snapshot of current balances
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testSnapshot() {
    console.log("\n🔵 Starting Snapshot Test...");
  
    try {
      const { ethers } = require("ethers");
      const path = require("path");
  
      const {
        tokenContract,
        account_pass,
        provider, // 👈 THIS LINE WAS MISSING!
      } = require(path.join(__dirname, "../../chats-blockchain/src/resources/web3config"));
  
      // Connect as admin
      const adminWallet = new ethers.Wallet(account_pass, provider);
      const chatsWithAdmin = tokenContract(account_pass);
  
      // Take a snapshot
      const tx = await chatsWithAdmin.snapshot();
      const receipt = await tx.wait();
  
      const snapshotEvent = receipt.events?.find((e) => e.event === "Snapshot");
      const snapshotId = snapshotEvent?.args?.id;
  
      console.log(`✅ Snapshot taken successfully! Snapshot ID: ${snapshotId?.toString()}`);
    } catch (error) {
      console.error("❌ Error taking snapshot:", error.message);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// 📸 SNAPSHOT BALANCE TEST
// This test will check balances of users at the snapshot we previously took.
///////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testSnapshotBalances() {
    try {
      console.log("\n🔵 Starting Snapshot Balance Check...");
  
      const { ethers } = require("ethers");
      const { provider, account_pass } = require("../../chats-blockchain/src/resources/web3config.js");  
      const wallet = new ethers.Wallet(account_pass, provider);
  
      const chatsContract = new ethers.Contract(
        process.env.CONTRACTADDR_TEST,
        require("../../chats-blockchain/contracts/artifacts/Chats.json").abi,
        wallet
      );
  
      const snapshotId = 1; // 👈 Already created earlier.
  
      const user1 = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73";
      const user2 = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";
  
      const balanceUser1 = await chatsContract.balanceOfAt(user1, snapshotId);
      const balanceUser2 = await chatsContract.balanceOfAt(user2, snapshotId);
      const totalSupplyAtSnapshot = await chatsContract.totalSupplyAt(snapshotId);
  
      console.log(`✅ Snapshot ${snapshotId} Results:`);
      console.log(`- User1 Balance at Snapshot: ${ethers.utils.formatUnits(balanceUser1, 6)} CHATS`);
      console.log(`- User2 Balance at Snapshot: ${ethers.utils.formatUnits(balanceUser2, 6)} CHATS`);
      console.log(`- Total Supply at Snapshot: ${ethers.utils.formatUnits(totalSupplyAtSnapshot, 6)} CHATS`);
  
    } catch (err) {
      console.error("❌ Error checking balances at snapshot:", err);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                             6. Test Execution (Calling)                                               //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Call your tests here
async function runTests() {
  

    // ➡️ Basic Info
    // await testGetTokenDecimals();
    // await testGetTokenSymbol();
    // await testGetTokenName();

    // // ➡️ Core Tests
    // await testMintTokens();
    // // 📢 Run the redeem test
    //     testRedeemTokens();
 
    // await testPauseContract();    // 👈 Pauses the contract
    // // Try transferring here if you want to test failure case (Optional)
    
    // await testUnpauseContract();  // 👈 Unpauses the contract
    // // Then you can transfer successfully again (Optional)
    
    //testTransferTokens();

    // Call the test
    //testTransferFrom();
    //await testSnapshot();

    // Call it after your other tests
    testSnapshotBalances();
}

runTests();