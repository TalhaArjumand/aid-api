const {Message} = require('@droidsolutions-oss/amqp-ts');
const {Transaction} = require('../models');
const RabbitMq = require('../libs/RabbitMQ/Connection');
const { Logger } = require('../libs');
const {generateTransactionRef, AclRoles} = require('../utils');

// 🛠 Add this line here:
console.log('RabbitMq prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(RabbitMq)));
const {
  FUND_CAMPAIGN_WITH_CRYPTO,
  CREATE_WALLET,
  NFT_MINTING_LIMIT,
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  FUND_BENEFICIARY,
  FROM_NGO_TO_CAMPAIGN,
  CONFIRM_ONE_BENEFICIARY,
  PAYSTACK_DEPOSIT,
  PAY_FOR_PRODUCT,
  DEPLOY_NFT_COLLECTION,
  TRANSFER_FROM_TO_BENEFICIARY,
  PAYSTACK_VENDOR_WITHDRAW,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_CAMPAIGN_DEPOSIT,
  FUND_BENEFICIARIES,
  LOOP_ITEM_BENEFICIARY,
  MINT_NFT,
  CONFIRM_AND_CREATE_MINTING_LIMIT,
  CONFIRM_AND_SEND_MINT_NFT,
  CONFIRM_AND_MINT_NFT,
  FUN_NFT_CAMPAIGN,
  CONFIRM_AND_UPDATE_CAMPAIGN,
  CONFIRM_AND_CREATE_WALLET,
  DISBURSE_ITEM,
  CONFIRM_AND_DISBURSE_ITEM,
  TRANSFER_MINT_TO_VENDOR,
  CONFIRM_AND_PAY_VENDOR,
  CONFIRM_NGO_FUNDING,
  CONFIRM_CAMPAIGN_FUNDING,
  CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
  CONFIRM_PERSONAL_BENEFICIARY_FUNDING_BENEFICIARY,
  CONFIRM_FUND_SINGLE_BENEFICIARY,
  CONFIRM_VENDOR_REDEEM,
  CONFIRM_VENDOR_ORDER_QUEUE,
  CONFIRM_BENEFICIARY_TRANSFER_REDEEM,
  CONFIRM_BENEFICIARY_REDEEM,
  REDEEM_BENEFICIARY_ONCE,
  SEND_EACH_BENEFICIARY_FOR_CONFIRMATION,
  SEND_EACH_BENEFICIARY_FOR_REDEEMING,
  INCREASE_ALLOWANCE_GAS,
  INCREASE_TRANSFER_CAMPAIGN_GAS,
  INCREASE_TRANSFER_BENEFICIARY_GAS,
  INCREASE_TRANSFER_PERSONAL_BENEFICIARY_GAS,
  INCREASE_GAS_FOR_BENEFICIARY_WITHDRAWAL,
  INCREASE_GAS_FOR_VENDOR_WITHDRAWAL,
  INCREASE_REDEEM_GAS_BREDEEM,
  INCREASE_MINTING_GAS,
  INCREASE_VTRANSFER_FROM_GAS,
  INCREASE_GAS_SINGLE_BENEFICIARY,
  APPROVE_TO_SPEND_ONE_BENEFICIARY,
  INCREASE_GAS_FOR_NEW_COLLECTION,
  INCREASE_GAS_FOR_MINTING_LIMIT,
  INCREASE_GAS_MINT_NFT,
  ESCROW_HASH,
  INCREASE_GAS_NFT_TRANSFER,
  APPROVE_NFT_SPENDING,
  INCREASE_GAS_APPROVE_SPENDING,
  CONFIRM_WITHHOLDING_FUND,
  WITHHOLD_FUND_GAS_ERROR,
  WITHHELD_FUND,
  CONFIRM_FUND_CAMPAIGN_WITH_CRYPTO,
  INCREASE_GAS_FOR_FUND_CAMPAIGN_WITH_CRYPTO,
  RE_FUN_BENEFICIARIES,
  CONFIRM_RE_FUND_BENEFICIARIES,
  INCREASE_GAS_FOR_RE_FUND_BENEFICIARIES
} = require('../constants/queues.constant');
const WalletService = require('./WalletService');
const CampaignService = require('./CampaignService');
const OrganisationService = require('./OrganisationService');
const {BeneficiaryService} = require('.');

const fundBeneficiaries = RabbitMq.declareQueue(FUND_BENEFICIARIES, {
  durable: true
});

const disburseItem = RabbitMq.declareQueue(DISBURSE_ITEM, {
  durable: true
});
const confirmDisburseItem = RabbitMq.declareQueue(
  CONFIRM_AND_DISBURSE_ITEM,
  {
    durable: true
  }
);
const fundBeneficiary = RabbitMq.declareQueue(FUND_BENEFICIARY, {
  durable: true
});
const reFundBeneficiaries = RabbitMq.declareQueue(
  RE_FUN_BENEFICIARIES,
  {
    durable: true
  }
);
const createWalletQueue = RabbitMq.declareQueue(CREATE_WALLET, {
  durable: true
});
const payStackDepositQueue = RabbitMq.declareQueue(
  PAYSTACK_DEPOSIT,
  {
    durable: true
  }
);

const payStackCampaignDepositQueue = RabbitMq.declareQueue(
  PAYSTACK_CAMPAIGN_DEPOSIT,
  {
    durable: true
  }
);

const verifyFaitDepositQueue = RabbitMq.declareQueue(
  VERIFY_FIAT_DEPOSIT,
  {
    durable: true
  }
);

const processOrderQueue = RabbitMq.declareQueue(
  PROCESS_VENDOR_ORDER,
  {
    durable: true
  }
);

const funNFTCampaign = RabbitMq.declareQueue(FUN_NFT_CAMPAIGN, {
  durable: true
});

const approveCampaignAndFund = RabbitMq.declareQueue(
  FROM_NGO_TO_CAMPAIGN,
  {
    durable: true
  }
);

const fundVendorBankAccount = RabbitMq.declareQueue(
  PAYSTACK_VENDOR_WITHDRAW,
  {
    durable: true
  }
);

const fundBeneficiaryBankAccount = RabbitMq.declareQueue(
  PAYSTACK_BENEFICIARY_WITHDRAW,
  {
    durable: true
  }
);

const payForProduct = RabbitMq.declareQueue(PAY_FOR_PRODUCT, {
  durable: true
});

const beneficiaryFundBeneficiary = RabbitMq.declareQueue(
  TRANSFER_FROM_TO_BENEFICIARY,
  {
    durable: true
  }
);
const deployNewCollection = RabbitMq.declareQueue(
  DEPLOY_NFT_COLLECTION,
  {
    durable: true
  }
);

const deployEscrowCollection = RabbitMq.declareQueue(ESCROW_HASH, {
  durable: true
});

const nftMintingLimit = RabbitMq.declareQueue(NFT_MINTING_LIMIT, {
  durable: true
});

const confirmAndSetMLimit = RabbitMq.declareQueue(
  CONFIRM_AND_CREATE_MINTING_LIMIT,
  {
    durable: true
  }
);
const mintNFT = RabbitMq.declareQueue(MINT_NFT, {
  durable: true
});

const confirmAndSendMintToken = RabbitMq.declareQueue(
  CONFIRM_AND_SEND_MINT_NFT,
  {
    durable: true
  }
);

const confirmAndMintToken = RabbitMq.declareQueue(
  CONFIRM_AND_MINT_NFT,
  {
    durable: true
  }
);

const confirmAndUpdateCampaign = RabbitMq.declareQueue(
  CONFIRM_AND_UPDATE_CAMPAIGN,
  {
    durable: true
  }
);

const confirmAndCreateWalletQueue = RabbitMq.declareQueue(
  CONFIRM_AND_CREATE_WALLET,
  {
    durable: true
  }
);
const loopItemBeneficiary = RabbitMq.declareQueue(
  LOOP_ITEM_BENEFICIARY,
  {
    durable: true
  }
);

const processNFTOrderQueue = RabbitMq.declareQueue(
  TRANSFER_MINT_TO_VENDOR,
  {
    durable: true
  }
);

const confirmAndPayVendor = RabbitMq.declareQueue(
  CONFIRM_AND_PAY_VENDOR,
  {
    durable: true
  }
);
const confirmNgoFunding = RabbitMq.declareQueue(
  CONFIRM_NGO_FUNDING,
  {
    durable: true
  }
);

const confirmCampaignFunding = RabbitMq.declareQueue(
  CONFIRM_CAMPAIGN_FUNDING,
  {
    durable: true
  }
);

const confirmBFundingBeneficiary = RabbitMq.declareQueue(
  CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
  {
    durable: true
  }
);

const confirmPersonalBFundingBeneficiary = RabbitMq.declareQueue(
  CONFIRM_PERSONAL_BENEFICIARY_FUNDING_BENEFICIARY,
  {
    durable: true
  }
);

const confirmOrderQueue = RabbitMq.declareQueue(
  CONFIRM_VENDOR_ORDER_QUEUE,
  {
    durable: true
  }
);

const confirmFundSingleBeneficiary = RabbitMq.declareQueue(
  CONFIRM_FUND_SINGLE_BENEFICIARY,
  {
    durable: true
  }
);

const confirmVRedeem = RabbitMq.declareQueue(CONFIRM_VENDOR_REDEEM, {
  durable: true
});

const confirmBRedeem = RabbitMq.declareQueue(
  CONFIRM_BENEFICIARY_REDEEM,
  {
    durable: true
  }
);

const confirmBTransferRedeem = RabbitMq.declareQueue(
  CONFIRM_BENEFICIARY_TRANSFER_REDEEM,
  {
    durable: true
  }
);
const redeemBeneficiaryOnce = RabbitMq.declareQueue(
  REDEEM_BENEFICIARY_ONCE,
  {
    prefetch: 1,
    durable: true
  }
);

const sendBForConfirmation = RabbitMq.declareQueue(
  SEND_EACH_BENEFICIARY_FOR_CONFIRMATION,
  {
    durable: true
  }
);

const sendBForRedeem = RabbitMq.declareQueue(
  SEND_EACH_BENEFICIARY_FOR_REDEEMING,
  {
    durable: true
  }
);
const confirmWithHoldFundsQueue = RabbitMq.declareQueue(
  CONFIRM_WITHHOLDING_FUND,
  {
    durable: true
  }
);
const withHoldFundsQueue = RabbitMq.declareQueue(WITHHELD_FUND, {
  durable: true
});
const increaseGasForRefund = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_RE_FUND_BENEFICIARIES,
  {
    durable: true
  }
);
const increaseGasForTransfer = RabbitMq.declareQueue(
  INCREASE_GAS_NFT_TRANSFER,
  {
    durable: true
  }
);

const confirmRefundBeneficiary = RabbitMq.declareQueue(
  CONFIRM_RE_FUND_BENEFICIARIES,
  {
    durable: true
  }
);

const increaseAllowance = RabbitMq.declareQueue(
  INCREASE_ALLOWANCE_GAS,
  {
    durable: true
  }
);

const increaseTransferCampaignGas = RabbitMq.declareQueue(
  INCREASE_TRANSFER_CAMPAIGN_GAS,
  {
    durable: true
  }
);

const increaseTransferBeneficiaryGas = RabbitMq.declareQueue(
  INCREASE_TRANSFER_BENEFICIARY_GAS,
  {
    durable: true
  }
);

const increaseTransferPersonalBeneficiaryGas = RabbitMq.declareQueue(
  INCREASE_TRANSFER_PERSONAL_BENEFICIARY_GAS,
  {
    durable: true
  }
);

const increaseGasForBWithdrawal = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_BENEFICIARY_WITHDRAWAL,
  {
    durable: true
  }
);

const increaseGasForVWithdrawal = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_VENDOR_WITHDRAWAL,
  {
    durable: true
  }
);

const increaseGasFoBRWithdrawal = RabbitMq.declareQueue(
  INCREASE_REDEEM_GAS_BREDEEM,
  {
    durable: true
  }
);

const increaseGasForMinting = RabbitMq.declareQueue(
  INCREASE_MINTING_GAS,
  {
    durable: true
  }
);

const increaseGasFeeVTransferFrom = RabbitMq.declareQueue(
  INCREASE_VTRANSFER_FROM_GAS,
  {
    durable: true
  }
);

const increaseGasFeeForSB = RabbitMq.declareQueue(
  INCREASE_GAS_SINGLE_BENEFICIARY,
  {
    durable: true
  }
);

const approveOneBeneficiary = RabbitMq.declareQueue(
  APPROVE_TO_SPEND_ONE_BENEFICIARY,
  {
    durable: true
  }
);

const confirmOneBeneficiary = RabbitMq.declareQueue(
  CONFIRM_ONE_BENEFICIARY,
  {
    durable: true
  }
);

const increaseGasNewCollection = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_NEW_COLLECTION,
  {
    durable: true
  }
);

const increaseGasMintingLimit = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_MINTING_LIMIT,
  {
    durable: true
  }
);

const increaseGasMintNFT = RabbitMq.declareQueue(
  INCREASE_GAS_MINT_NFT,
  {
    durable: true
  }
);

const approveNFTSpending = RabbitMq.declareQueue(
  APPROVE_NFT_SPENDING,
  {
    durable: true
  }
);

const increaseGasApproveSpending = RabbitMq.declareQueue(
  INCREASE_GAS_APPROVE_SPENDING,
  {
    durable: true
  }
);

const increaseGasWithHoldFunds = RabbitMq.declareQueue(
  WITHHOLD_FUND_GAS_ERROR,
  {
    durable: true
  }
);

const fundCampaignWithCrypto = RabbitMq.declareQueue(
  FUND_CAMPAIGN_WITH_CRYPTO,
  {
    durable: true
  }
);

const confirmFundCampaignWithCrypto = RabbitMq.declareQueue(
  CONFIRM_FUND_CAMPAIGN_WITH_CRYPTO,
  {
    durable: true
  }
);

const gasFundCampaignWithCrypto = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_FUND_CAMPAIGN_WITH_CRYPTO,
  {
    durable: true
  }
);

class QueueService {
  static async gasFundCampaignWithCrypto(data) {
    gasFundCampaignWithCrypto.send(
      new Message(data, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasApproveSpending(
    campaignPrivateKey,
    beneficiaryAddress,
    tokenId,
    collectionAddress,
    params
  ) {
    const payload = {
      campaignPrivateKey,
      beneficiaryAddress,
      tokenId,
      collectionAddress,
      params
    };
    increaseGasApproveSpending.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async increaseGasMintNFT(collection, transaction, keys) {
    const payload = {collection, transaction, keys};
    increaseGasMintNFT.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async increaseGasMintingLimit(collection, keys, contractIndex) {
    const payload = {collection, keys, contractIndex};
    increaseGasMintingLimit.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasNewCollection(collection, keys) {
    const payload = {collection, keys};
    increaseGasNewCollection.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmOneBeneficiary(hash, uuid, transactionId, beneficiary) {
    const payload = {hash, uuid, transactionId, beneficiary};
    confirmOneBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async approveNFTSpending(
    beneficiaryId,
    campaign,
    amount,
    beneficiary
  ) {
    const transaction = await Transaction.create({
      reference: generateTransactionRef(),
      BeneficiaryId: beneficiaryId,
      CampaignId: campaign.id,
      status: 'processing',
      amount,
      is_approved: false,
      OrganisationId: campaign.OrganisationId,
      transaction_type: 'approval',
      narration: 'Approve beneficiary spending',
      transaction_origin: 'wallet'
    });
    const payload = {
      beneficiaryId,
      campaignId: campaign.id,
      transactionId: transaction.uuid,
      amount,
      beneficiary
    };

    approveNFTSpending.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    // await BeneficiaryService.spendingStatus(campaign.id, beneficiaryId, {
    //   status: 'in_progress'
    // });
  }
  static async approveOneBeneficiary(
    campaignPrivateKey,
    BAddress,
    amount,
    wallet_uuid,
    campaign,
    beneficiary
  ) 
  {
    Logger.info("🚨 Beneficiary in approveOneBeneficiary:", JSON.stringify(beneficiary, null, 2));

    const transaction = await Transaction.create({
      reference: generateTransactionRef(),
      BeneficiaryId: beneficiary.UserId,
      CampaignId: beneficiary.CampaignId,
      amount,
      status: 'processing',
      is_approved: false,
      OrganisationId: campaign.OrganisationId,
      transaction_type: 'approval',
      narration: 'Approve beneficiary spending',
      transaction_origin: 'wallet'
    });
    const payload = {
      campaignPrivateKey,
      BAddress,
      amount,
      wallet_uuid,
      campaign,
      beneficiary,
      transactionId: transaction.uuid
    };
    
    //await beneficiary.update({status: 'in_progress'});
    await beneficiary.update({ status: 'pending' }); // ✅ valid enum value
    approveOneBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasFeeForSB(keys, message) {
    const payload = {keys, message};
    increaseGasFeeForSB.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasFeeVTransferFrom(keys, message) {
    const payload = {keys, message};
    increaseGasFeeVTransferFrom.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasWithHoldFunds(keys, message) {
    const payload = {keys, message};
    increaseGasWithHoldFunds.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasForMinting(keys, message) {
    const payload = {keys, message};
    increaseGasForMinting.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasFoBRWithdrawal(keys, message) {
    const payload = {keys, message};
    increaseGasFoBRWithdrawal.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasFoVWithdrawal(keys, message) {
    const payload = {keys, message};
    increaseGasForVWithdrawal.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseGasForBWithdrawal(keys, message) {
    const payload = {keys, message};
    increaseGasForBWithdrawal.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseTransferCampaignGas(keys, message) {
    const payload = {keys, message};
    increaseTransferCampaignGas.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async increaseTransferBeneficiaryGas(keys, message) {
    const payload = {keys, message};
    increaseTransferBeneficiaryGas.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  //Increase gas for refund beneficiary
  static async increaseGasForRefund(keys, message) {
    const payload = {keys, message};
    increaseGasForRefund.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async increaseGasForTransfer(
    senderPrivateKey,
    sender,
    receiver,
    tokenId,
    collectionAddress
  ) {
    const payload = {
      senderPrivateKey,
      sender,
      receiver,
      tokenId,
      collectionAddress
    };
    increaseGasForTransfer.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async increaseTransferPersonalBeneficiaryGas(keys, message) {
    const payload = {keys, message};
    increaseTransferPersonalBeneficiaryGas.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmRefundBeneficiary(hash, transactionId) {
    const payload = {hash, transactionId};
    confirmRefundBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async increaseAllowance(keys, message) {
    const payload = {keys, message};
    increaseAllowance.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async sendBForRedeem(
    amount,
    transactionId,
    wallet_uuid,
    campaign,
    beneficiary,
    campaignPrivateKey,
    BAddress,
    budget,
    lastIndex,
    token_type
  ) {
    const payload = {
      amount,
      transactionId,
      wallet_uuid,
      campaign,
      beneficiary,
      campaignPrivateKey,
      BAddress,
      budget,
      lastIndex,
      token_type
    };
    sendBForRedeem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async sendBForConfirmation(
    hash,
    amount,
    transactionId,
    uuid,
    campaign,
    beneficiary,
    budget,
    lastIndex,
    token_type
  ) {
    const payload = {
      hash,
      amount,
      transactionId,
      uuid,
      campaign,
      beneficiary,
      budget,
      lastIndex,
      token_type
    };
    sendBForConfirmation.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async redeemBeneficiaryOnce(
    hash,
    amount,
    transactionId,
    campaignWallet,
    userWallet,
    recipient_code
  ) {
    const payload = {
      hash,
      amount,
      transactionId,
      campaignWallet,
      userWallet,
      recipient_code
    };
    redeemBeneficiaryOnce.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmBTransferRedeem(
    hash,
    privateKey,
    transactionId,
    amount,
    recipient_code,
    userWallet,
    campaignWallet
  ) {
    const payload = {
      hash,
      privateKey,
      transactionId,
      amount,
      recipient_code,
      userWallet,
      campaignWallet
    };
    confirmBTransferRedeem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmBRedeem(
    privateKey,
    transactionId,
    amount,
    recipient_code,
    userWallet,
    campaignWallet
  ) {
    const payload = {
      privateKey,
      transactionId,
      amount,
      recipient_code,
      userWallet,
      campaignWallet
    };
    confirmBRedeem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmVRedeem(
    hash,
    amount,
    recipient_code,
    transactionId,
    uuid
  ) {
    const payload = {hash, amount, recipient_code, transactionId, uuid};
    confirmVRedeem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmFundSingleB(
    hash,
    transactionId,
    task_assignmentId,
    beneficiaryWallet,
    campaignWallet,
    amount
  ) {
    const payload = {
      hash,
      transactionId,
      task_assignmentId,
      beneficiaryWallet,
      campaignWallet,
      amount
    };
    confirmFundSingleBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmVendorOrder(
    hash,
    amount,
    transactionId,
    order,
    beneficiaryWallet,
    campaignWallet,
    vendorWallet
  ) {
    const payload = {
      hash,
      amount,
      transactionId,
      order,
      beneficiaryWallet,
      campaignWallet,
      vendorWallet
    };
    confirmOrderQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmBFundingB(
    hash,
    amount,
    senderWallet,
    receiverWallet,
    transactionId,
    campaignWallet
  ) {
    const payload = {
      hash,
      amount,
      senderWallet,
      receiverWallet,
      transactionId,
      campaignWallet
    };
    confirmBFundingBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmPBFundingB(
    hash,
    amount,
    senderWallet,
    receiverWallet,
    transactionId
  ) {
    const payload = {
      hash,
      amount,
      senderWallet,
      receiverWallet,
      transactionId
    };
    confirmPersonalBFundingBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmCampaign_FUNDING(
    hash,
    transactionId,
    campaign,
    OrgWallet,
    amount
  ) {
    const payload = {
      hash,
      transactionId,
      campaign,
      OrgWallet,
      amount
    };
    confirmCampaignFunding.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmNGO_FUNDING(
    hash,
    OrganisationId,
    CampaignId,
    transactionId,
    transactionReference,
    amount
  ) {
    const payload = {
      hash,
      OrganisationId,
      CampaignId,
      transactionId,
      transactionReference,
      amount
    };
    confirmNgoFunding.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async VendorBurn(
    transaction,
    order,
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    collectionAddress
  ) {
    const payload = {
      transaction,
      order,
      beneficiaryWallet,
      vendorWallet,
      campaignWallet,
      collectionAddress
    };
    confirmAndPayVendor.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async loopBeneficiaryItem(
    campaign,
    OrgWallet,
    token_type,
    beneficiary,
    tokenIds,
    collectionAddress
  ) {
    const payload = {
      campaign,
      OrgWallet,
      token_type,
      beneficiary,
      tokenIds,
      collectionAddress
    };
    loopItemBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async createCollection(collection) {
    const payload = {collection};
    deployNewCollection.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async createEscrow(collection) {
    const payload = {collection};
    deployEscrowCollection.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndSetMintingLimit(collection, hash) {
    const payload = {collection, hash};
    confirmAndSetMLimit.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndSendMintNFT(hash, collection, contractIndex) {
    const payload = {hash, collection, contractIndex};
    confirmAndSendMintToken.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmAndUpdateCampaign(
    OrgWallet,
    hash,
    campaign,
    transactionId
  ) {
    const payload = {OrgWallet, hash, campaign, transactionId};
    confirmAndUpdateCampaign.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndMintNFT(collection, hash, transaction) {
    const payload = {collection, hash, transaction};
    confirmAndMintToken.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async createMintingLimit(collection, contractIndex) {
    const payload = {collection, contractIndex};
    nftMintingLimit.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async mintNFTFunc(
    collection,
    wallet,
    amount,
    receiver,
    contractIndex,
    tokenURI
  ) {
    const transaction = await Transaction.create({
      narration: 'Minting Limit',
      ReceiverWalletId: wallet.uuid,
      transaction_origin: 'wallet',
      transaction_type: 'deposit',
      status: 'processing',
      is_approved: false,
      OrganisationId: wallet.OrganisationId,
      reference: generateTransactionRef(),
      amount
    });

    const payload = {
      collection,
      transaction,
      receiver,
      contractIndex,
      tokenURI
    };
    mintNFT.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async createWallet(ownerId, wallet_type, CampaignId = null) {
    const payload = {wallet_type, ownerId, CampaignId};

    // 🛠 Add a debug log here
  console.log('🚀 createWallet() called. Sending payload to RabbitMQ:', payload);
    createWalletQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmAndCreateWallet(content, keyPair) {
    const payload = {content, keyPair};
    confirmAndCreateWalletQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async confirmWithHoldFunds(data) {
    const payload = data;
    confirmWithHoldFundsQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async withHoldFunds(campaign_id, organisation_id, amount) {
    const transaction = await Transaction.create({
      amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'withdrawal',
      CampaignId: campaign_id,
      OrganisationId: organisation_id,
      narration: 'Campaign wallet withdrawal to organization wallet'
    });
    const payload = {
      campaign_id,
      organisation_id,
      transactionId: transaction.uuid,
      amount
    };
    withHoldFundsQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static createPayStack(id, amount) {
    const payload = {id, amount};
    payStackDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static createCampaignPayStack(camp_id, camp_uuid, org_uuid, org_id, amount) {
    const payload = {camp_id, camp_uuid, org_uuid, org_id, amount};
    payStackCampaignDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async verifyFiatDeposit({
    transactionReference,
    OrganisationId,
    approved,
    status,
    amount,
    CampaignId
  }) {
    // let wallet = null;
    // if (CampaignId) {
    //   wallet = await CampaignService.getCampaignWallet(
    //     OrganisationId,
    //     CampaignId
    //   );
    // } else {
    //   wallet = await OrganisationService.getOrganisationWallet(OrganisationId);
    // }

    const transaction = await Transaction.create({
      log: transactionReference,
      narration: 'Fiat Deposit Transaction',
      // ReceiverWalletId: wallet.uuid,
      transaction_origin: 'wallet',
      transaction_type: 'deposit',
      status: 'processing',
      is_approved: false,
      OrganisationId,
      CampaignId,
      reference: generateTransactionRef(),
      amount
    });
    const payload = {
      transactionId: transaction.uuid,
      transactionReference,
      OrganisationId,
      CampaignId,
      approved,
      status,
      amount
    };
    verifyFaitDepositQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static processOrder(
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    order,
    vendor,
    amount,
    transaction
  ) {
    const payload = {
      beneficiaryWallet,
      vendorWallet,
      campaignWallet,
      order,
      vendor,
      amount,
      transaction
    };
    processOrderQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static processNFTOrder(
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    order,
    vendor,
    amount,
    transaction
  ) {
    const payload = {
      beneficiaryWallet,
      vendorWallet,
      campaignWallet,
      order,
      vendor,
      amount,
      transaction
    };
    processNFTOrderQueue.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async fundBeneficiaries(
    OrgWallet,
    campaignWallet,
    beneficiaries,
    campaign,
    token_type
  ) {
    const payload = {
      OrgWallet,
      campaignWallet,
      beneficiaries,
      campaign,
      token_type
    };
    fundBeneficiaries.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async fundNFTBeneficiaries(
    campaign,
    beneficiaries,
    token_type,
    tokenId
  ) {
    const payload = {
      campaign,
      beneficiaries,
      token_type,
      tokenId
    };
    disburseItem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmFundNFTBeneficiaries(
    beneficiary,
    token_type,
    campaign,
    OrgWallet,
    uuid,
    hash,
    tokenId
  ) {
    const payload = {
      beneficiary,
      token_type,
      campaign,
      OrgWallet,
      uuid,
      hash,
      tokenId
    };
    confirmDisburseItem.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }

  static async confirmFundCampaignWithCrypto(
    hash,
    transactionId,
    uuid,
    amount,
    campaign
  ) {
    const payload = {hash, transactionId, uuid, amount, campaign};
    confirmFundCampaignWithCrypto.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async fundCampaignWithCrypto(
    campaign,
    amount,
    campaignWallet,
    OrgWallet
  ) {
    const transaction = await Transaction.create({
      amount: Number(amount),
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'deposit',
      SenderWalletId: OrgWallet.uuid,
      is_approved: false,
      ReceiverWalletId: campaignWallet.uuid,
      CampaignId: campaign.id,
      OrganisationId: OrgWallet.OrganisationId,
      narration: 'crypto funding'
    });
    const payload = {
      OrgWallet,
      campaignWallet,
      campaign,
      transactionId: transaction.uuid,
      amount
    };
    fundCampaignWithCrypto.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }
  static async CampaignApproveAndFund(campaign, campaignWallet, OrgWallet) {
    const realBudget = campaign.budget;
    const transaction = await Transaction.create({
      amount: realBudget,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      SenderWalletId: OrgWallet.uuid,
      ReceiverWalletId: campaignWallet.uuid,
      CampaignId: campaign.id,
      OrganisationId: campaign.OrganisationId,
      narration: 'Approve Campaign Funding'
    });
    const payload = {
      OrgWallet,
      campaignWallet,
      campaign,
      transactionId: transaction.uuid,
      realBudget
    };
    approveCampaignAndFund.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async CampaignExtensionFund(
    campaign,
    campaignWallet,
    OrgWallet,
    additional_budget
  ) {
    const realBudget = additional_budget;
    const transaction = await Transaction.create({
      amount: realBudget,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      SenderWalletId: OrgWallet.uuid,
      ReceiverWalletId: campaignWallet.uuid,
      CampaignId: campaign.id,
      OrganisationId: campaign.OrganisationId,
      narration: 'Approve Campaign Funding'
    });
    const payload = {
      OrgWallet,
      campaignWallet,
      campaign,
      transactionId: transaction.uuid,
      realBudget
    };
    approveCampaignAndFund.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async fundNFTCampaign(campaign, campaignWallet, OrgWallet) {
    const transaction = await Transaction.create({
      amount: campaign.minting_limit,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      SenderWalletId: OrgWallet.uuid,
      ReceiverWalletId: campaignWallet.uuid,
      OrganisationId: campaign.OrganisationId,
      narration: 'Approve Campaign Funding'
    });
    const payload = {
      OrgWallet,
      campaignWallet,
      campaign,
      transactionId: transaction.uuid
    };
    funNFTCampaign.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async BeneficiaryTransfer(
    senderWallet,
    receiverWallet,
    amount,
    campaignWallet
  ) {
    const transaction = await Transaction.create({
      amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      ReceiverWalletId: receiverWallet.uuid,
      SenderWalletId: senderWallet.uuid,
      narration: 'transfer between beneficiaries'
    });

    const payload = {
      senderWallet,
      receiverWallet,
      amount,
      transaction,
      campaignWallet
    };
    beneficiaryFundBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async reFundBeneficiaries(campaign, BeneficiaryId, amount) {
    const transaction = await Transaction.create({
      reference: generateTransactionRef(),
      BeneficiaryId,
      CampaignId: campaign.id,
      amount,
      status: 'processing',
      is_approved: false,
      OrganisationId: campaign.OrganisationId,
      transaction_type: 'spent',
      narration: 'Approve beneficiary spending',
      transaction_origin: 'wallet'
    });
    const payload = {
      campaign,
      BeneficiaryId,
      amount,
      transactionId: transaction.uuid
    };
    reFundBeneficiaries.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
  static async FundBeneficiary(
    beneficiaryWallet,
    campaignWallet,
    task_assignment,
    amount_disburse
  ) {
    console.log("🐛 Inside FundBeneficiary");
    console.log("➡️ campaignWallet passed in:", campaignWallet);
    const transaction = await Transaction.create({
      amount: amount_disburse,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'transfer',
      ReceiverWalletId: beneficiaryWallet.uuid,
      SenderWalletId: campaignWallet.uuid,
      BeneficiaryId: beneficiaryWallet.UserId,
      narration: 'for task completed by beneficiary',
      OrganisationId: campaignWallet.OrganisationId,
      is_approved: true
    });

    const payload = {
      beneficiaryWallet,
      campaignWallet,
      task_assignment,
      amount_disburse,
      transaction
    };
    fundBeneficiary.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    Logger.info(`fund single beneficiary: ${JSON.stringify(payload)}`);
    return transaction;
  }

  static async fundBeneficiaryBankAccount(
    bankAccount,
    campaignWallet,
    userWallet,
    userId,
    amount
  ) {
    const transaction = await Transaction.create({
      amount: amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'withdrawal',
      BeneficiaryId: userId,
      narration: 'Wallet withdrawal to bank account'
    });
    const payload = {
      bankAccount,
      campaignWallet,
      userWallet,
      userId,
      amount,
      transaction
    };
    fundBeneficiaryBankAccount.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
    return transaction;
  }

  static async fundVendorBankAccount(bankAccount, userWallet, userId, amount) {
    const transaction = await Transaction.create({
      amount: amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'wallet',
      transaction_type: 'withdrawal',
      VendorId: userId,
      BankId: bankAccount.id,
      narration: 'Wallet withdrawal to bank account'
    });
    const payload = {bankAccount, userWallet, userId, amount, transaction};
    fundVendorBankAccount.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );

    return transaction;
  }

  static payForProduct(
    vendor,
    beneficiary,
    campaignWallet,
    VendorWallet,
    BenWallet,
    product
  ) {
    const payload = {
      vendor,
      beneficiary,
      campaignWallet,
      VendorWallet,
      BenWallet,
      product
    };
    payForProduct.send(
      new Message(payload, {
        contentType: 'application/json'
      })
    );
  }
}

module.exports = QueueService;
