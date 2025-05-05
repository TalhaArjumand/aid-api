const {RERUN_QUEUE_AFTER} = require('../constants/rerun.queue');

const {createClient} = require('redis');
const axios = require('axios');
const ethers = require('ethers');
const moment = require('moment');
const crypto = require('crypto');
const sha256 = require('simple-sha256');
const fs = require('fs');
const path = require('path'); // ✅ Required for safe path resolution

const {switchWallet} = require('../config');

// ✅ Load Chats ABI from artifacts
const chatsJsonPath = path.join(
  __dirname,
  "../../../chats-blockchain/artifacts/contracts/Chats.sol/Chats.json"
);

if (!fs.existsSync(chatsJsonPath)) {
  throw new Error("❌ Chats.json ABI file not found at: " + chatsJsonPath);
}

const chatsABI = require(chatsJsonPath).abi;

// ✅ Use deployed address from your .env file
const tokenConfig = {
  baseURL: process.env.TOKEN_BASE_URL || 'https://staging-token.chats.cash/api/v1/web3',
  secret: process.env.TOKEN_SECRET || '',
  api: process.env.BLOCKCHAINSERV_TEST,
  address: process.env.CONTRACTADDR_TEST || '0xf25186B5081Ff5cE73482AD761DB0eB0d25abfBF', // fallback
  abi: chatsABI
};

const {SwitchToken} = require('../models');
const {Encryption, Logger, RabbitMq} = require('../libs');
const AwsUploadService = require('./AwsUploadService');
const {Message} = require('@droidsolutions-oss/amqp-ts');
const QueueService = require('./QueueService');

const provider = new ethers.providers.StaticJsonRpcProvider(
  { url: process.env.BLOCKCHAINSERV || "http://127.0.0.1:8545" },
  { name: "besu-local", chainId: 1337 }
);

// Optional log to confirm config
console.log("🧠 Provider connected to:", provider.connection.url);



const Interface = new ethers.utils.Interface([
  'event initializeContract(uint256 indexed contractIndex,address indexed contractAddress, string indexed _name)'
]);

const Axios = axios.create();

class BlockchainService {
  static async requeueMessage(bind, args) {
    const confirmTransaction = RabbitMq['default'].declareQueue(bind, {
      durable: true
    });
    const payload = {...args};
    confirmTransaction.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async reRunContract(contract = 'nft', method, args) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Increasing gas price');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/increase-gas-price`,
          {
            contract,
            method,
            ...args
          }
        );
        Logger.info('Increased Gas Price');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error increasing gas price: ${JSON.stringify(error?.response?.data)}`
        );
        reject(error);
      }
    });
  }
  static async nftTransfer(
    senderPrivateKey,
    sender,
    receiver,
    tokenId,
    collectionAddress
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`TRANSFERRING NFT`);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/transfer-nft/${senderPrivateKey}/${sender}/${receiver}/${tokenId}/${collectionAddress}`
        );
        Logger.info(`TRANSFERRED NFT`);
        resolve(data);
      } catch (error) {
        Logger.error(
          `ERROR TRANSFERRING NFT: ${JSON.stringify(error?.response?.data)}`
        );
        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          await QueueService.increaseGasForTransfer(
            senderPrivateKey,
            sender,
            receiver,
            tokenId,
            collectionAddress
          );
        }
        reject(error);
      }
    });
  }
  static async nftBurn(burnerPrivateKey, collectionAddress, tokenID) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`BURNING NFT`);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/burn-nft/${burnerPrivateKey}/${collectionAddress}/${tokenID}`
        );
        Logger.info(`NFT BURNED`);
        resolve(data);
      } catch (error) {
        Logger.error(
          `ERROR BURNING NFT: ${JSON.stringify(error?.response?.data)}`
        );
        reject(error);
      }
    });
  }

  static async createNFTCollection(collection) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`CREATING NFT COLLECTION`);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/deploy-collection/${collection.title}/${collection.title}/${collection.title}`
        );
        Logger.info(`CREATED NFT COLLECTION`);
        resolve(data);
      } catch (error) {
        Logger.error(
          `ERROR CREATING NFT COLLECTION: ${JSON.stringify(
            error?.response?.data
          )}`
        );
        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          const keys = {
            password: '',
            contractName: collection.title,
            collectionName: collection.title,
            collectionSymbol: collection.title
          };
          await QueueService.increaseGasNewCollection(collection, keys);
        }
        reject(error);
      }
    });
  }

  static async createEscrowCollection(collection) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`CREATING ESCROW`);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/create-escrow/${collection.title}`
        );
        Logger.info(`CREATED ESCROW`);
        resolve(data);
      } catch (error) {
        Logger.error(
          `ERROR CREATING ESCROW: ${JSON.stringify(error?.response?.data)}`
        );
        // if (
        //   error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
        //   error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
        //   error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        // ) {
        //   const keys = {
        //     password: '',
        //     contractName: collection.title,
        //     collectionName: collection.title,
        //     collectionSymbol: collection.title
        //   };
        //   await QueueService.increaseGasNewCollection(collection, keys);
        // }
        reject(error);
      }
    });
  }

  static async createMintingLimit(limit, index, collection) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`CREATING NFT MINTING LIMIT`);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/set-nft-limit/${limit}/${index}`
        );
        Logger.info(`CREATED NFT MINTING LIMIT`);
        resolve(data);
      } catch (error) {
        Logger.error(
          `ERROR CREATING NFT MINTING LIMIT: ${JSON.stringify(
            error?.response?.data
          )}`
        );
        const keys = {
          password: '',
          limit
        };
        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          await QueueService.increaseGasMintingLimit(collection, keys, index);
        }
        reject(error);
      }
    });
  }

  static async createNFTApproveToSpend(
    tokenOwnerPass,
    operator,
    tokenId,
    index,
    params
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info(`CREATING NFT APPROVE TO SPEND`);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/approve-nft/${tokenOwnerPass}/${operator}/${tokenId}/${index}`
        );
        Logger.info(`CREATED NFT APPROVE TO SPEND`);
        resolve(data);
      } catch (error) {
        Logger.error(
          `ERROR CREATING NFT APPROVE TO SPEND: ${JSON.stringify(
            error.response.data
          )}`
        );
        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          await QueueService.increaseGasApproveSpending(
            tokenOwnerPass,
            operator,
            tokenId,
            index,
            params
          );
        }
        reject(error);
      }
    });
  }
  static async signInSwitchWallet() {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Signing in to switch wallet');
        const {data} = await Axios.post(
          `${switchWallet.baseURL}/v1/authlock/login`,
          {
            emailAddress: switchWallet.email,
            password: switchWallet.password
          }
        );
        const token = data.data;
        const exist = await SwitchToken.findByPk(1);

        if (!exist) await SwitchToken.create({...token});
        else await exist.update({...token});
        Logger.info('Signed in to switch wallet');
        resolve(data);
      } catch (error) {
        Logger.error('Create Account Wallet Error: ' + JSON.stringify(error));
        reject(error);
      }
    });
  }
  static async switchGenerateAddress(body) {
    return new Promise(async (resolve, reject) => {
      try {
        const token = await SwitchToken.findByPk(1);
        if (!token || moment().isAfter(token.expires)) {
          await this.signInSwitchWallet();
        }
        Logger.info('Generating wallet address');
        const {data} = await Axios.post(
          `${switchWallet.baseURL}/v1/walletaddress/generate`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token.accessToken}`
            }
          }
        );
        Logger.info('Generated wallet address');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error while Generating wallet address: ${JSON.stringify(error)}`
        );
        reject(error);
      }
    });
  }
  static async switchWebhook(data) {
    return Promise(async (resolve, reject) => {
      try {
        console.log(data);
        const token = await SwitchToken.findByPk(1);
        if (!token || moment().isAfter(token.expires)) {
          await this.signInSwitchWallet();
        }
        const {data} = await Axios.put(
          `${switchWallet.baseURL}/v1/merchant/webhook`,
          {webhookUrl: '', publicKey: switchWallet.publicKey},
          {
            headers: {
              Authorization: `Bearer ${token.accessToken}`
            }
          }
        );
        resolve(data);
      } catch (error) {
        Logger.error(`Error Verifying webhook: ${JSON.stringify(error)}`);
        reject(error);
      }
    });
  }
  static async switchWithdrawal(body) {
    return new Promise(async (resolve, reject) => {
      try {
        const switch_token = await client.get('switch_token');

        if (switch_token !== null && switch_token < new Date()) {
          const token = await this.signInSwitchWallet();
          await client.set('switch_token', token.data.accessToken);
        }
        Logger.info('Withdrawing from my account');
        const {data} = await Axios.post(
          `${switchWallet.baseURL}/merchantClientWithdrawal`,
          body,
          {
            headers: {
              Authorization: `Bearer ${switch_token}`
            }
          }
        );
        Logger.info('Withdrawal success');
        resolve(data);
      } catch (error) {
        Logger.error('Error Withdrawing from my account: ' + error.response);
        reject(error);
      }
    });
  }

  static async confirmTransaction(hash, bind, message) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Confirming transaction ' + hash);
        const data = await provider.getTransactionReceipt(hash);
        if (!data) {
          Logger.info(`Transaction yet to be mined`);
        } else {
          Logger.info('Transaction confirmed and mined ' + data);
        }
        resolve(data);
      } catch (error) {
        Logger.error(`Error confirming transaction: ${error}`);
        const id = setTimeout(async () => {
          await this.requeueMessage(bind, message);
        }, RERUN_QUEUE_AFTER);
        clearTimeout(id);
        reject(error);
      }
    });
  }

  static async getNativeBalance(address) {
    try {
      const balance = await provider.getBalance(address);
      const maticBalance = ethers.utils.formatEther(balance);
      return maticBalance;
    } catch (error) {
      Logger.error('Get Native Balance Error', error.response.data);
      return false;
    }
  }

  static async getCollectionAddress(txReceipt) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Fetching Collection Address: ' + txReceipt);
        const topics = txReceipt.logs[1].topics;
        const data = txReceipt.logs[1].data;
        const log = Interface.parseLog({data, topics});
        const address = log.args[1];
        Logger.info('Collection Address Found');
        resolve(address);
      } catch (error) {
        Logger.error(`Error Collection Address: ${error}`);
        reject(error);
      }
    });
  }
  static async getContractIndex(txReceipt) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Fetching Contract Index');
        const topics = txReceipt.logs[1].topics;
        const data = txReceipt.logs[1].data;
        const log = Interface.parseLog({data, topics});
        const contractIndex = Math.round(
          ethers.utils.formatUnits(log.args[0]) * Math.pow(10, 18)
        );
        Logger.info('Contract Index Found: ' + contractIndex);
        resolve(contractIndex);
      } catch (error) {
        Logger.error(`Error Contract Index: ${error}`);
        reject(error);
      }
    });
  }
  static async createAccountWallet() {
    try {
      Logger.info('Create Account Wallet Request');
      const {data} = await Axios.post(`${tokenConfig.baseURL}/user/register`);
      Logger.info('Create Account Wallet Response', data);
      return true;
    } catch (error) {
      Logger.error('Create Account Wallet Error', error.response.data);
      return false;
    }
  }

  static async addUser(arg) {
    return new Promise(async (resolve, reject) => {
      try {
        let keyPair = await this.setUserKeypair(arg);
        // const {data} = await Axios.post(
        //   `${tokenConfig.baseURL}/user/adduser/${keyPair.address}`
        // );
        Logger.info(`User Added`);
        resolve(keyPair);
      } catch (error) {
        Logger.error(
          `Adding User Error: ${JSON.stringify(error?.response?.data)}`
        );

        reject(error);
      }
    });
  }
  static async mintNFT(receiver, contractIndex, tokenURI, args) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Minting NFT');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/mint-nft/${receiver}/${contractIndex}/${tokenURI}`
        );
        Logger.info('NFT minted');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error minting NFT: ${JSON.stringify(error.response.data)}`
        );
        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          const keys = {
            password: '',
            receiver,
            contractIndex,
            tokenURI
          };
        }
        await QueueService.increaseGasMintNFT(
          args.collection,
          args.transaction,
          keys
        );
        reject(error);
      }
    });
  }
  static async mintToken(mintTo, amount, message, type) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Minting token');
        const payload = {mintTo, amount};
        const checksum = Encryption.encryptTokenPayload(payload);
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/mint/${amount}/${mintTo}`,
          null,
          {
            headers: {
              'X-CHECKSUM': checksum
            }
          }
        );
        Logger.info('Token minted', data);
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error minting token: ${JSON.stringify(error.response.data)}`
        );
        Logger.info(`Error code: ` + error.response.data.message.code);

        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          const keys = {
            password: '',
            address: mintTo,
            amount
          };
          if (type === 'ngo') {
            await QueueService.increaseGasForMinting(keys, message);
          } else {
            await QueueService.gasFundCampaignWithCrypto(keys, message);
          }
        }
        return reject(error);
      }
    });
  }
  static async redeem(senderpswd, amount, message, type) {
    return new Promise(async (resolve, reject) => {
      const mintTo = senderpswd;
      const payload = {mintTo, amount};
      const checksum = Encryption.encryptTokenPayload(payload);
      try {
        Logger.info('Redeeming token');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/redeem/${senderpswd}/${amount}`,
          null,
          {
            headers: {
              'X-CHECKSUM': checksum
            }
          }
        );
        Logger.info('Success redeeming token');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error redeeming token: ` + JSON.stringify(error.response.data)
        );
        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          const keys = {
            password: senderpswd,
            amount
          };
          if (type === 'vendorRedeem') {
            await QueueService.increaseGasFoVWithdrawal(keys, message);
          }
          if (type === 'beneficiaryRedeem') {
            await QueueService.increaseGasFoBRWithdrawal(keys, message);
          }
        }
        reject(error);
      }
    });
  }

  static async approveToSpend(ownerPassword, spenderAdd, amount) {
    Logger.info(`Approving to spend: ${ownerPassword} ${spenderAdd} ${amount}`);
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('🔐 Preparing wallet for approval...');
        const wallet = new ethers.Wallet(ownerPassword, provider);
  
        tokenConfig.abi = chatsABI;
  
        if (!tokenConfig.abi || !Array.isArray(tokenConfig.abi)) {
          throw new Error("❌ tokenConfig.abi is undefined or not an array");
        }
  
        const contract = new ethers.Contract(tokenConfig.address, tokenConfig.abi, wallet);
        const parsedAmount = ethers.utils.parseUnits(amount.toString(), 6); // 6 decimals assumed
  
        Logger.info("⛽ Estimating gas...");
        const estimatedGas = await contract.estimateGas.approve(spenderAdd, parsedAmount);
        Logger.info(`📏 Estimated Gas: ${estimatedGas.toString()}`);
  
        const tx = await contract.approve(spenderAdd, parsedAmount, {
          gasLimit: estimatedGas.add(20000), // add a buffer
          gasPrice: ethers.utils.parseUnits("2", "gwei"), // adjust if needed
        });
  
        Logger.info('✅ Approve transaction sent:', tx.hash);
        const receipt = await tx.wait();
        Logger.info('✅ Approve transaction mined:', receipt.transactionHash);
  
        resolve({ Approved: receipt.transactionHash });
      } catch (error) {
        Logger.error(`❌ Error in approveToSpend: ${error?.message || error}`);
        reject(error);
      }
    });
  }

  static async disApproveToSpend(ownerPassword, spenderAdd, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('disapproving to spend');
        const res = await Axios.post(
          `${tokenConfig.baseURL}/txn/disapprove/${ownerPassword}/${spenderAdd}/${amount}`
        );
        Logger.info('Disapproved to spend');
        resolve(res);
      } catch (error) {
        Logger.error(
          `Error disapproving to spend: ${JSON.stringify(error.response.data)}`
        );
        reject(error);
      }
    });
  }

  static async transferTo(senderPass, receiverAdd, amount, message, type) {
    return new Promise(async (resolve, reject) => {
      try {
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/transfer/${senderPass}/${receiverAdd}/${amount}`
        );
        Logger.info('Transferred to campaign wallet');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error transferring to campaign wallet: ${JSON.stringify(
            error.response.data
          )}`
        );
        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          const keys = {
            password: senderPass,
            receiverAdd,
            amount: amount.toString()
          };
          if (type === 'fundCampaign') {
            await QueueService.increaseTransferCampaignGas(keys, message);
          }
          if (type === 'PBFundB') {
            await QueueService.increaseTransferPersonalBeneficiaryGas(
              keys,
              message
            );
          }
          if (type === 'withHoldFunds') {
            await QueueService.increaseGasWithHoldFunds(keys, message);
          }
        }
        reject(error);
      }
    });
  }

  static async transferFrom(
    tokenownerAdd,
    receiver,
    spenderPass,
    amount,
    message,
    type
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Transferring funds from..');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/transferfrom/${tokenownerAdd}/${receiver}/${spenderPass}/${amount}`
        );
        Logger.info('Success transferring funds from');
        resolve(data);
      } catch (error) {
        Logger.info(
          `Error transferring funds from:  ${JSON.stringify(
            error.response.data
          )}`
        );

        if (
          error.response.data.message.code === 'REPLACEMENT_UNDERPRICED' ||
          error.response.data.message.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error.response.data.message.code === 'INSUFFICIENT_FUNDS'
        ) {
          const keys = {
            password: spenderPass,
            tokenownerAdd,
            receiverAdd: receiver,
            amount: amount.toString()
          };
          if (type === 'BFundB') {
            await QueueService.increaseTransferBeneficiaryGas(keys, message);
          }
          if (type === 'BWithdrawal') {
            await QueueService.increaseGasForBWithdrawal(keys, message);
          }
          if (type === 'vendorOrder') {
            await QueueService.increaseGasFeeVTransferFrom(keys, message);
          }
        }

        reject(error);
      }
    });
  }

  static async allowance(tokenOwner, spenderAddr) {
    return new Promise(async (resolve, reject) => {
      try {
        const {data} = await Axios.get(
          `${tokenConfig.baseURL}/account/allowance/${tokenOwner}/${spenderAddr}`
        );
        resolve(data);
      } catch (error) {
        error.response.data.message.code ===
        ('REPLACEMENT_UNDERPRICED' ||
          'UNPREDICTABLE_GAS_LIMIT' ||
          'INSUFFICIENT_FUNDS')
          ? await this.reRunContract('token', 'allowance', {
              tokenOwner,
              spenderAddr
            })
          : null;
        reject(error);
      }
    });
  }
  static async nftBalance(address, contractIndex) {
    return new Promise(async (resolve, reject) => {
      try {
        const {data} = await Axios.get(
          `${tokenConfig.baseURL}/account/nft-balance/16/0x6E8EeAe86934Ed319a666B65eB338319a2F67893`
        );
        const bigNumber = ethers.utils.formatEther(data.balance.hex);
        const b = ethers.utils.formatUnits(data.balance.hex) * Math.pow(10, 18);
        console.log(b, 'bigNumber');
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  static async balance(address) {
    return new Promise(async (resolve, reject) => {
      try {
        const {data} = await Axios.get(
          `${tokenConfig.baseURL}/account/balance/${address}`
        );
        resolve(data);
      } catch (error) {
        error.response.data.message.code ===
        ('REPLACEMENT_UNDERPRICED' ||
          'UNPREDICTABLE_GAS_LIMIT' ||
          'INSUFFICIENT_FUNDS')
          ? await this.reRunContract('token', 'balance', {
              address
            })
          : null;
        reject(error);
      }
    });
  }

  static async redeemx(senderpswd, amount) {
    return new Promise(async (resolve, reject) => {
      const mintTo = senderaddr;
      const payload = {mintTo, amount};
      const checksum = Encryption.encryptTokenPayload(payload);
      try {
        Logger.info('Redeeming token');
        const {data} = await Axios.post(
          `${tokenConfig.baseURL}/txn/redeem/${senderpswd}/${amount}`,
          null,
          {
            headers: {
              'X-CHECKSUM': checksum
            }
          }
        );
        Logger.info('Success redeeming token');
        resolve(data);
      } catch (error) {
        Logger.error(
          `Error redeeming token: ` + JSON.stringify(error.response.data)
        );
        reject(error);
      }
    });
  }

  static async createNewBSCAccount({mnemonicString, userSalt}) {
    const Wallet = ethers.Wallet;
    let hash = sha256.sync(mnemonicString);
    let salt = userSalt;
    let buffer = crypto.scryptSync(hash, salt, 32, {
      N: Math.pow(2, 14),
      r: 8,
      p: 1
    });

    const generatedKeyPair = new Wallet(buffer);
    // const generatedKeyPair = await createPassenger(buffer)
    return generatedKeyPair;
  }

  // static async setUserKeypair(id) {
  //   let pair = {};
  //   // TODO: Rebuild user public and private key after retrieving mnemonic key and return account keypair
  //   try {
  //     var mnemonic = await AwsUploadService.getMnemonic();
  //     mnemonic = JSON.parse(mnemonic);

  //     pair = await this.createNewBSCAccount({
  //       mnemonicString: mnemonic.toString(),
  //       userSalt: id
  //     });
  //     return pair;
  //   } catch (error) {
  //     Logger.error(`Error Creating Wallet Address: ${error} `);
  //   }
  // }

  static async setUserKeypair(id) {
    let pair = {};
    try {
      // --- OLD CODE (AWS) ---
      // var mnemonic = await AwsUploadService.getMnemonic();
      // mnemonic = JSON.parse(mnemonic);
  
      // --- QUICK FIX (Hardcoded dummy mnemonic) ---
      var mnemonic = "ripple scissors kick mammal hire column oak again sun offer wealth tomorrow wagon turn fatal";
  
      pair = await this.createNewBSCAccount({
        mnemonicString: mnemonic.toString(),
        userSalt: id
      });
      return pair;
    } catch (error) {
      Logger.error(`Error Creating Wallet Address: ${error} `);
      throw new Error('Mnemonic not found or AWS error.');
    }
  }
  static async getTransactionDetails(hash, bind, message) {
    return new Promise(async (resolve, reject) => {
      try {
        Logger.info('Confirming transaction ' + hash);
        const data = await provider.getTransactionReceipt(hash);
        if (!data) {
          Logger.info(`Transaction yet to be mined`);
        } else {
          Logger.info('Transaction confirmed and mined ' + data);
        }
        resolve(data);
      } catch (error) {
        Logger.error(`Error confirming transaction: ${error}`);
        const id = setTimeout(async () => {
          await this.requeueMessage(bind, message);
        }, RERUN_QUEUE_AFTER);
        clearTimeout(id);
        reject(error);
      }
    });
  }
}

// async function fuc() {
//   return await BlockchainService.reRunContract('token', 'increaseAllowance', {
//     password:
//       '0x0652bc7b3bc3d9dddba36b2ff0173a6dbcfd5b2cba15e14efa96c2b24700df83',
//     spenderPswd: '0x4F76b88a2A1579976FCb7636544e290A2CFec956',
//     amount: '20'
//   });
// }
// fuc().then(r => {
//   console.log(r);
// });
module.exports = BlockchainService;
