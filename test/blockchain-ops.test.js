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

testGetContractName();
testGetOwner(); // 👈 NEW
testIsAdmin();
testSetUserList();
testAddAdmin();