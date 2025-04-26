require("dotenv").config();
const path = require("path");

// ✅ Proper imports
const connectWeb3 = require(path.join(__dirname, "../../chats-blockchain/src/connectWeb3/getterAPIController"));
const { getOpsContract } = require(path.join(__dirname, "../../chats-blockchain/src/resources/web3config"));


const { providers } = require("ethers");

// Disable any accidental use of fallback
providers.FallbackProvider = class DisabledFallback {
  constructor() {
    throw new Error("❌ FallbackProvider is disabled in local tests!");
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                 ADD TEST ACCOUNTS HERE                                                                //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ✅ Admin account (already used)
const adminAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";

// ✅ Additional accounts from Besu genesis
const testUser1 = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73";
const testUser2 = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";

// Optional: Use them later like this
// await setter.addUserList(testUser1)
// await setter.addAdmin(testUser2)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testGetContractName() {
  try {
    const name = await connectWeb3.getName();
    console.log('✅ Contract Name:', name);
  } catch (err) {
    console.error('❌ Error getting contract name:', err);
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testGetOwner() {
  try {
    const contract = getOpsContract;
    const owner = await contract.owner();
    console.log("✅ Owner (Admin) Address:", owner);
  } catch (err) {
    console.error("❌ Error fetching owner:", err);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testIsAdmin() {
  try {
    const addressToCheck = '0x627306090abaB3A6e1400e9345bC60c78a8BEf57';
    
    // ✅ Use the already-initialized contract object
    const result = await getOpsContract.isAdmin(addressToCheck);
    console.log(`✅ isAdmin(${addressToCheck}):`, result);
  } catch (err) {
    console.error('❌ Error checking admin:', err);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


async function testSetUserList() {
  try {
    const addressToWhitelist = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";

    // Load setter and getter
    const setter = require(path.join(
      __dirname,
      "../../chats-blockchain/src/connectWeb3/setterAPIController"
    ));
    const getter = require(path.join(
      __dirname,
      "../../chats-blockchain/src/connectWeb3/getterAPIController"
    ));

    // ✅ Use CheckUserList which matches your smart contract
    const isListed = await getter.checkUserList(addressToWhitelist);

    if (isListed) {
      console.log(`⚠️ Skipping setUserList — Address ${addressToWhitelist} is already in the whitelist.`);
    } else {
      const result = await setter.addUserList(addressToWhitelist);
      console.log(`✅ Whitelisted Address ${addressToWhitelist}:`, result);
    }
  } catch (err) {
    console.error("❌ Error in SetUserList:", err);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


async function testAddAdmin() {
  try {
    const addressToPromote = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";

    const getter = require(path.join(
      __dirname,
      "../../chats-blockchain/src/connectWeb3/getterAPIController"
    ));
    const setter = require(path.join(
      __dirname,
      "../../chats-blockchain/src/connectWeb3/setterAPIController"
    ));

    const isListed = await getter.isUserListed(addressToPromote);
    const isAlreadyAdmin = await getter.isAdmin(addressToPromote);

    if (!isListed) {
      console.log(`⚠️ Cannot promote to admin — ${addressToPromote} is not whitelisted.`);
      return;
    }

    if (isAlreadyAdmin) {
      console.log(`⚠️ Skipping addAdmin — ${addressToPromote} is already an admin.`);
      return;
    }

    console.log("📤 Calling addAdmin...");
    const result = await setter.addAdmin(addressToPromote);
    console.log(`✅ Added admin: ${addressToPromote}`, result);

  } catch (err) {
    if (err.error?.message?.includes("Account already Admin")) {
      console.log("⚠️ Already an admin. Skipping...");
    } else {
      console.error("❌ Error in AddAdmin:", err);
    }
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                            TEST WITH NEW ACCOUNT                                                      //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ✅ 1. testWhitelistUser2

async function testWhitelistUser2() {
  const address = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";
  const getter = require(path.join(
    __dirname,
    "../../chats-blockchain/src/connectWeb3/getterAPIController"
  ));
  const setter = require(path.join(
    __dirname,
    "../../chats-blockchain/src/connectWeb3/setterAPIController"
  ));

  const isListed = await getter.checkUserList(address);

  if (isListed) {
    console.log(`⚠️ Address ${address} is already whitelisted.`);
  } else {
    const result = await setter.addUserList(address);
    console.log(`✅ Whitelisted User2: ${address}`, result);
  }
}

// ✅ 2. testPromoteUser2ToAdmin
async function testPromoteUser2ToAdmin() {
  const address = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";
  const getter = require(path.join(
    __dirname,
    "../../chats-blockchain/src/connectWeb3/getterAPIController"
  ));
  const setter = require(path.join(
    __dirname,
    "../../chats-blockchain/src/connectWeb3/setterAPIController"
  ));

  const isAdmin = await getter.isAdmin(address);

  if (isAdmin) {
    console.log(`⚠️ User2 ${address} is already admin.`);
  } else {
    const result = await setter.addAdmin(address);
    console.log(`✅ Promoted User2 to Admin: ${address}`, result);
  }
}

//✅ 3. testRemoveUser2FromAdmin
async function testRemoveUser2FromAdmin() {
  const address = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";
  const setter = require(path.join(
    __dirname,
    "../../chats-blockchain/src/connectWeb3/setterAPIController"
  ));

  try {
    const result = await setter.removeAdmin(address);
    console.log(`✅ Removed Admin rights from User2: ${address}`, result);
  } catch (err) {
    console.error(`❌ Failed to remove User2 from Admin:`, err.message);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                            Function calling WITH NEW ACCOUNT                                          //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//testWhitelistUser2();
//testPromoteUser2ToAdmin();
//testRemoveUser2FromAdmin();



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function testGetAdminList() {
  try {
    const { ethers } = require("ethers");

    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

    // ✅ Correct & safe private key usage
    const adminPrivateKey = process.env.ADMIN_PASS_TEST;
    if (!adminPrivateKey) {
      throw new Error("❌ ADMIN_PASS_TEST not defined in .env");
    }
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);

    const contractWithAdmin = getOpsContract.connect(adminWallet);

    const result = await contractWithAdmin.GetAdminList();
    console.log("✅ Current Admin List:", result);
  } catch (err) {
    console.error("❌ Error fetching Admin List:", err);
  }
}

// testGetContractName();
// testGetOwner(); // 👈 NEW
// testIsAdmin();
// testSetUserList();
// testAddAdmin();
//testGetAdminList();


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                       ✅ TEST — Add User2 as Authorizer                                               //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function testAddAuthorizerUser2() {
  const address = "0xf17f52151EbEF6C7334FAD080c5704D77216b732"; // User2

  const getter = require(path.join(
    __dirname,
    "../../chats-blockchain/src/connectWeb3/getterAPIController"
  ));
  const setter = require(path.join(
    __dirname,
    "../../chats-blockchain/src/connectWeb3/setterAPIController"
  ));

  try {
    const isListed = await getter.checkUserList(address);
    if (!isListed) {
      console.log(`❌ User2 must be whitelisted before promoting as Authorizer.`);
      return;
    }

    const isAlreadyAuthorizer = await getter.isAuthorizer(address);
    if (isAlreadyAuthorizer) {
      console.log(`⚠️ User2 is already an Authorizer.`);
      return;
    }

    const result = await setter.addAuthorizer(address);
    console.log(`✅ User2 promoted to Authorizer: ${address}`, result);
  } catch (err) {
    console.error("❌ Error promoting User2 to Authorizer:", err);
  }
}
//testAddAuthorizerUser2();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function testGetAuthorizerList() {
  try {
    const { ethers } = require("ethers");

    // Use Admin wallet to call the function
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PASS_TEST, provider);
    // Connect the contract using the admin signer
    const contractWithAdmin = getOpsContract.connect(adminWallet);

    const result = await contractWithAdmin.GetAuthorizerList();
    console.log("✅ Current Authorizer List:", result);
  } catch (err) {
    console.error("❌ Error fetching Authorizer List:", err);
  }
}

testGetAuthorizerList();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                       //
//                                                                                                                       //
//                                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function testRemoveUser2FromAuthorizer() {
  const address = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";
  const { ethers } = require("ethers");

  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PASS_TEST, provider);
    const contractWithAdmin = getOpsContract.connect(adminWallet);

    const tx = await contractWithAdmin.RemoveAuthorizer(address);
    const receipt = await tx.wait();

    console.log(`✅ Removed Authorizer rights from User2: ${address}`, receipt.transactionHash);
  } catch (err) {
    console.error("❌ Error removing User2 from Authorizer:", err.message || err);
  }
}

//testRemoveUser2FromAuthorizer();