console.log('[BOOT] TransactionConsumer loaded ✅');

const {
  VERIFY_FIAT_DEPOSIT,
  PROCESS_VENDOR_ORDER,
  FROM_NGO_TO_CAMPAIGN,
  PAYSTACK_CAMPAIGN_DEPOSIT,
  PAYSTACK_DEPOSIT,
  FUND_BENEFICIARY,
  PAYSTACK_BENEFICIARY_WITHDRAW,
  PAYSTACK_VENDOR_WITHDRAW,
  FUND_BENEFICIARIES,
  TRANSFER_FROM_TO_BENEFICIARY,
  CONFIRM_NGO_FUNDING,
  CONFIRM_CAMPAIGN_FUNDING,
  CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
  CONFIRM_PERSONAL_BENEFICIARY_FUNDING_BENEFICIARY,
  CONFIRM_VENDOR_ORDER_QUEUE,
  CONFIRM_FUND_SINGLE_BENEFICIARY,
  CONFIRM_BENEFICIARY_REDEEM,
  CONFIRM_VENDOR_REDEEM,
  CONFIRM_BENEFICIARY_TRANSFER_REDEEM,
  REDEEM_BENEFICIARY_ONCE,
  SEND_EACH_BENEFICIARY_FOR_REDEEMING,
  SEND_EACH_BENEFICIARY_FOR_CONFIRMATION,
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
  CONFIRM_ONE_BENEFICIARY,
  ESCROW_HASH,
  RE_FUN_BENEFICIARIES,
  CONFIRM_RE_FUND_BENEFICIARIES,
  INCREASE_GAS_FOR_RE_FUND_BENEFICIARIES
} = require('../constants/queues.constant');
// ✅ INSTEAD, write separately:
const Logger = require('../libs/Logger');
const RabbitMq = require('../libs/RabbitMQ/Connection'); // Correct import ✅
// NEW: named direct exchange for app messages
const vendorExchange = RabbitMq.declareExchange('app.direct', 'direct', { durable: true });
//const { Transaction } = require('../models');

async function seedAllowancesOnce(campaign, OrgWallet) {
  try {
    const already = await VoucherToken.count({ where: { campaignId: campaign.id } });
    if (already > 0) {
      Logger.info(`[allowance] skip: ${already} token(s) already exist for campaign ${campaign.id}`);
      return { skipped: true };
    }

    const campaignWallet = campaign.Wallet || await WalletService.findSingleWallet({
      CampaignId: campaign.id,
      OrganisationId: campaign.OrganisationId
    });

    const beneficiaries = await BeneficiariesService.fetchCampaignBeneficiaries(campaign.id);
    if (!beneficiaries?.length) return { skipped: true, reason: 'no beneficiaries' };

    await QueueService.fundBeneficiaries(
      OrgWallet,
      campaignWallet,
      beneficiaries,
      campaign,
      'papertoken'  // or 'smstoken' if you prefer
    );
    return { seeded: beneficiaries.length };
  } catch (e) {
    Logger.error(`[allowance] seeding error: ${e.message}`);
    return { error: e.message };
  }
}

// Add the console log immediately after import:
console.log('RabbitMq prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(RabbitMq)));
const {
  WalletService,
  QueueService,
  BlockchainService,
  DepositService,
  PaystackService,
  SmsService,
  CampaignService,
  BeneficiaryService
} = require('../services');

const {
  Sequelize,
  Transaction,
  Wallet,
  VoucherToken,
  Campaign,
  TaskAssignment,
  ProductBeneficiary,
  Beneficiary,
  Order
} = require('../models');
const {
  GenearteSMSToken,
  generateQrcodeURL,
  generateTransactionRef,
  AclRoles
} = require('../utils');
const {RERUN_QUEUE_AFTER} = require('../constants/rerun.queue');
const BeneficiariesService = require('../services/BeneficiaryService');

const verifyFiatDepsoitQueue = RabbitMq.declareQueue(
  VERIFY_FIAT_DEPOSIT,
  {
    durable: true,
    prefetch: 1
  }
);

const processFundBeneficiary = RabbitMq.declareQueue(
  FUND_BENEFICIARY,
  {
    durable: true,
    prefetch: 1
  }
);
const processFundBeneficiaries = RabbitMq.declareQueue(
  FUND_BENEFICIARIES,
  {
    durable: true,
    prefetch: 1
  }
);
const processVendorOrderQueue = RabbitMq.declareQueue(
  PROCESS_VENDOR_ORDER,
  { durable: true, prefetch: 1 }
);

console.log('[BOOT] PROCESS_VENDOR_ORDER value =', PROCESS_VENDOR_ORDER);
console.log('[BOOT] Declared vendor queue');



const processCampaignFund = RabbitMq.declareQueue(
  FROM_NGO_TO_CAMPAIGN,
  {
    durable: true,
    prefetch: 1
  }
);

const processBeneficiaryPaystackWithdrawal = RabbitMq.declareQueue(
  PAYSTACK_BENEFICIARY_WITHDRAW,
  {
    durable: true,
    prefetch: 1
  }
);

const processVendorPaystackWithdrawal = RabbitMq.declareQueue(
  PAYSTACK_VENDOR_WITHDRAW,
  {
    durable: true,
    prefetch: 1
  }
);

const processCampaignPaystack = RabbitMq.declareQueue(
  PAYSTACK_CAMPAIGN_DEPOSIT,
  {
    durable: true,
    prefetch: 1
  }
);

const beneficiaryFundBeneficiary = RabbitMq.declareQueue(
  TRANSFER_FROM_TO_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmNgoFunding = RabbitMq.declareQueue(
  CONFIRM_NGO_FUNDING,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmCampaignFunding = RabbitMq.declareQueue(
  CONFIRM_CAMPAIGN_FUNDING,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmBFundingBeneficiary = RabbitMq.declareQueue(
  CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmPBFundingBeneficiary = RabbitMq.declareQueue(
  CONFIRM_PERSONAL_BENEFICIARY_FUNDING_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmOrderQueue = RabbitMq.declareQueue(
  CONFIRM_VENDOR_ORDER_QUEUE,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmFundSingleB = RabbitMq.declareQueue(
  CONFIRM_FUND_SINGLE_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmVRedeem = RabbitMq.declareQueue(CONFIRM_VENDOR_REDEEM, {
  prefetch: 1,
  durable: true
});

const confirmBRedeem = RabbitMq.declareQueue(
  CONFIRM_BENEFICIARY_REDEEM,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmBTransferRedeem = RabbitMq.declareQueue(
  CONFIRM_BENEFICIARY_TRANSFER_REDEEM,
  {
    prefetch: 1,
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
    prefetch: 1,
    durable: true
  }
);

const sendBForRedeem = RabbitMq.declareQueue(
  SEND_EACH_BENEFICIARY_FOR_REDEEMING,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseAllowance = RabbitMq.declareQueue(
  INCREASE_ALLOWANCE_GAS,
  {
    prefetch: 1,
    durable: true
  }
);
const increaseTransferCampaignGas = RabbitMq.declareQueue(
  INCREASE_TRANSFER_CAMPAIGN_GAS,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseTransferBeneficiaryGas = RabbitMq.declareQueue(
  INCREASE_TRANSFER_BENEFICIARY_GAS,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseTransferPersonalBeneficiaryGas = RabbitMq.declareQueue(
  INCREASE_TRANSFER_PERSONAL_BENEFICIARY_GAS,
  {
    prefetch: 1,
    durable: true
  }
);
const increaseGasForBWithdrawal = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_BENEFICIARY_WITHDRAWAL,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseGasForVWithdrawal = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_VENDOR_WITHDRAWAL,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseGasFoBRWithdrawal = RabbitMq.declareQueue(
  INCREASE_REDEEM_GAS_BREDEEM,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseGasForMinting = RabbitMq.declareQueue(
  INCREASE_MINTING_GAS,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseGasVTransferFrom = RabbitMq.declareQueue(
  INCREASE_VTRANSFER_FROM_GAS,
  {
    prefetch: 1,
    durable: true
  }
);

const reFundBeneficiaries = RabbitMq.declareQueue(
  RE_FUN_BENEFICIARIES,
  {
    prefetch: 1,
    durable: true
  }
);

const increaseGasForSB = RabbitMq.declareQueue(
  INCREASE_GAS_SINGLE_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);
const increaseGasForRefund = RabbitMq.declareQueue(
  INCREASE_GAS_FOR_RE_FUND_BENEFICIARIES,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmOneBeneficiary = RabbitMq.declareQueue(
  CONFIRM_ONE_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);
const approveOneBeneficiary = RabbitMq.declareQueue(
  APPROVE_TO_SPEND_ONE_BENEFICIARY,
  {
    prefetch: 1,
    durable: true
  }
);

const confirmRefundBeneficiary = RabbitMq.declareQueue(
  CONFIRM_RE_FUND_BENEFICIARIES,
  {
    prefetch: 1,
    durable: true
  }
);

const deployEscrowCollection = RabbitMq.declareQueue(ESCROW_HASH, {
  prefetch: 1,
  durable: true
});

const update_order = async (reference, args) => {
  const order = await Order.findOne({where: {reference}});
  if (!order) return null;
  await order.update(args);
  return order;
};

const update_transaction = async (args, uuid) => {
  const transaction = await Transaction.findOne({where: {uuid}});
  Logger.info(`Transaction updating: ${JSON.stringify(transaction)}`);
  if (!transaction) return null;
  await transaction.update(args);
  Logger.info(`Transaction updated: ${JSON.stringify(transaction)}`);

  return transaction;
};
const deductWalletAmount = async (balance, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    balance,
    fiat_balance: balance
  });
  Logger.info(`Current wallet balance is: ${balance}`);
  return wallet;
};

const addWalletAmount = async (balance, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    balance,
    fiat_balance: balance
  });
  Logger.info(`Current wallet balance is: ${balance}`);
  return wallet;
};

const updateQrCode = async (amount, where) => {
  const qrcode = await VoucherToken.findOne({where});
  if (!qrcode) return null;
  await qrcode.update({amount: Sequelize.literal(`amount - ${amount}`)});
  return qrcode;
};
const updateWasFunded = async uuid => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    was_funded: true
  });
  return wallet;
};

const blockchainBalance = async (balance, uuid) => {
  const wallet = await Wallet.findOne({where: {uuid}});
  if (!wallet) return null;
  await wallet.update({
    was_funded: true,
    balance,
    fiat_balance: balance
  });
  Logger.info(`Blockchain Wallet balance is ${balance}`);
  return wallet;
};

const create_transaction = async (amount, sender, receiver, args) => {
  const transaction = await Transaction.create({
    amount,
    reference: generateTransactionRef(),
    status: 'processing',
    transaction_origin: 'wallet',
    transaction_type: 'transfer',
    SenderWalletId: sender,
    ReceiverWalletId: receiver,
    narration: 'Approve Beneficiary Funding',
    ...args
  });
  return transaction;
};

RabbitMq
  .completeConfiguration()
  .then(async () => {
    // Bind BEFORE activating consumers
    console.log('[BOOT] binding processVendorOrder -> app.direct with key:', PROCESS_VENDOR_ORDER);
    const binding = processVendorOrderQueue.bind(vendorExchange, PROCESS_VENDOR_ORDER);
    await Promise.all([
      vendorExchange.initialized,
      processVendorOrderQueue.initialized,
      binding.initialized
    ]);
    console.log('[BOOT] binding ready ✅');

    
    verifyFiatDepsoitQueue
      .activateConsumer(async msg => {
        const {
          transactionId,
          transactionReference,
          OrganisationId,
          CampaignId,
          approved,
          status,
          amount
        } = msg.getContent();
        if (approved && status != 'successful' && status != 'declined') {
          const message = msg.getContent();
          if (CampaignId) {
            const campaignAddress = await BlockchainService.setUserKeypair(
              `campaign_${CampaignId}`
            );
            const mint = await BlockchainService.mintToken(
              campaignAddress.address,
              amount,
              message
            );
            if (!mint) {
              msg.nack();
              return;
            }
            Logger.info(`Campaign Funding Minted: ${mint.Minted}`);

            const tran = await update_transaction(
              {transaction_hash: mint.Minted},
              transactionId
            );
            await QueueService.confirmNGO_FUNDING(
              mint.Minted,
              OrganisationId,
              CampaignId,
              transactionId,
              transactionReference,
              amount
            );
          } else {
            const organisation = await BlockchainService.setUserKeypair(
              `organisation_${OrganisationId}`
            );
            const mint = await BlockchainService.mintToken(
              organisation.address,
              amount,
              message
            );
            Logger.info(`NGO Funding Minted: ${mint.Minted}`);

            if (!mint) {
              msg.nack();
              return;
            }
            await update_transaction(
              {transaction_hash: mint.Minted},
              transactionId
            ).catch(error => {
              Logger.error(`Transaction Error: ${error.message}`);
            });

            await QueueService.confirmNGO_FUNDING(
              mint.Minted,
              OrganisationId,
              CampaignId,
              transactionId,
              transactionReference,
              amount
            );

            Logger.info(`NGO Funding Minted...: ${mint.Minted}`);
          }
        }
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
        // msg.nack();
      })
      .then(_ => {
        Logger.info(`Running Process For Verify Fiat Deposit.`);
      });
    increaseGasForMinting
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {
          OrganisationId,
          transactionId,
          CampaignId,
          transactionReference,
          amount
        } = message;
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'mint',
          keys
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );

        await QueueService.confirmNGO_FUNDING(
          gasFee.retried,
          OrganisationId,
          CampaignId,
          transactionId,
          transactionReference,
          amount
        );
        // Logger.info(`NGO Funding Gas: ${gasFee.retried}`);
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
        // msg.nack();
      })
      .then(_ => {
        Logger.info(
          `Running Process For Increasing Gas For Verify Fiat Deposit.`
        );
      });
    confirmNgoFunding
      .activateConsumer(async msg => {
        const {
          hash,
          OrganisationId,
          CampaignId,
          transactionId,
          transactionReference,
          amount
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(hash);
        if (!confirm) {
          msg.nack();
          return;
        }
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        Logger.info(`Minted..: ${confirm}`);
        if (CampaignId) {
          const campaignWallet = await WalletService.findSingleWallet({
            CampaignId,
            OrganisationId
          });

          const campaign = await Campaign.findOne({where: {id: CampaignId}});
          if (campaign.status === 'ongoing') {
            const beneficiaries =
              await BeneficiariesService.fetchCampaignBeneficiaries(CampaignId);
            const share = amount / beneficiaries.length;
            await Promise.all(
              beneficiaries.forEach(async (beneficiary, index) => {
                setTimeout(async () => {
                  await QueueService.reFundBeneficiaries(
                    campaign,
                    beneficiary.UserId,
                    share
                  );
                  Logger.info(`refunding beneficiary: ${beneficiary.UserId}`);
                }, index * 5000);
              })
            );
          } else {
            await campaignWallet.update({
              balance: Sequelize.literal(`balance + ${amount}`),
              fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
            });

            await CampaignService.updateSingleCampaign(CampaignId, {
              is_funded: true,
              is_processing: false,
              amount_disbursed: Sequelize.literal(
                `amount_disbursed + ${amount}`
              )
            });
          }
          Logger.info('campaign wallet updated');
        } else {
          const wallet = await WalletService.findMainOrganisationWallet(
            OrganisationId
          );
          await wallet.update({
            balance: Sequelize.literal(`balance + ${amount}`)
            // fiat_balance: Sequelize.literal(`fiat_balance + ${amount}`)
          });
        }
        await DepositService.updateFiatDeposit(transactionReference, {
          status: 'successful'
        });
        Logger.info('NGO funded / Campaign funded');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`Consumer Error: ${error.message}`);
        // msg.nack();
      })
      .then(_ => {
        Logger.info(`Running Process For Confirming NGO funding.`);
      });
    reFundBeneficiaries
      .activateConsumer(async msg => {
        const {campaign, beneficiary, amount, transactionId} = msg.getContent();
        const campaignKeyPair = await BlockchainService.setUserKeypair(
          `campaign_${campaign.id}`
        );
        const beneficiaryKeyPair = await BlockchainService.setUserKeypair(
          `user_${beneficiary.UserId}campaign_${campaign.id}`
        );

        const { Approved } = await BlockchainService.approveToSpend(
          campaignKeyPair.privateKey,
          beneficiaryKeyPair.address,
          amount,
          {
            transactionId,
            campaign,
            beneficiaryId: beneficiary.UserId,
            amount
          },
          'refund_beneficiary'
        );
        if (!Approved) {
          msg.nack();
          return;
        }
        await QueueService.confirmRefundBeneficiary(
          Approved,
          transactionId,
          beneficiary
        );
        Logger.info('Refund Beneficiary Sent For Confirmation');
      })
      .then(_ => {
        Logger.info(`Running Process For Refund Beneficiary.`);
      })
      .catch(error => {
        Logger.error(
          `Error Running Process For Refund Beneficiary: ${error.message}`
        );
      });
    confirmRefundBeneficiary
      .activateConsumer(async msg => {
        const {hash, transactionId, beneficiary} = msg.getContent();
        const confirm = await BlockchainService.confirmTransaction(hash);
        if (!confirm) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: hash,
            status: 'success',
            is_approved: true
          },
          transactionId
        );
        await BeneficiaryService.spendingStatus(
          beneficiary.CampaignId,
          beneficiary.UserId,
          {
            approve_spending: true,
            status: 'success'
          }
        );
        Logger.info(`Approve Spending Failed. Retrying`);
        Logger.info(`Refund beneficiary confirmed`);
      })
      .then(_ => {
        Logger.info(`Running Process For Confirming Refund Beneficiary.`);
      })
      .catch(error => {
        Logger.error(
          `Error Running Process For Confirming Refund Beneficiary: ${error.message}`
        );
      });
    increaseGasForRefund.activateConsumer(async msg => {
      const {keys, message} = msg.getContent();
      const { transactionId, beneficiary } = message; // ensure producer includes this
      const gasFee = await BlockchainService.reRunContract(
        'token',
        'increaseAllowance',
        {
          password: keys.ownerPassword,
          spenderPswd: keys.spenderAdd,
          amount: keys.amount.toString()
        }
      );
      if (!gasFee) {
       await BeneficiaryService.spendingStatus(beneficiary?.CampaignId, beneficiary?.UserId, { status: 'error' });

        Logger.info(`Approve Spending Failed. Retrying`);
        msg.nack();
        return;
      }
      await QueueService.confirmRefundBeneficiary(
        gasFee.retried,
        transactionId
      );
    });
    processCampaignFund
      .activateConsumer(async msg => {
        const {OrgWallet, campaignWallet, campaign, transactionId, realBudget} =
          msg.getContent();
        
        // Use the actual wallet addresses and private key from DB
        const organisationAddress = OrgWallet.address;
        const campaignAddress = campaignWallet.address;
        const privateKey = OrgWallet.privateKey; // Use the actual private key from DB

        Logger.info(`Transferring from org ${organisationAddress} to campaign ${campaignAddress}, amount: ${realBudget}`);
        const transfer = await BlockchainService.transferTo(
          privateKey,
          campaignAddress,
          realBudget,
          {
            transactionId,
            campaign,
            OrgWallet,
            realBudget
          },
          'fundCampaign'
        );

        if (!transfer) {
          msg.nack();
          return;
        }
        const processing = await CampaignService.updateSingleCampaign(
          campaign.id,
          {
            is_processing: true,
            fund_status: 'processing'
          }
        );
        Logger.info(`Campaign Processing: ${JSON.stringify(processing)}`);
        await update_transaction(
          {
            transaction_hash: transfer.Transferred
          },
          transactionId
        );
        await QueueService.confirmCampaign_FUNDING(
          transfer.Transferred,
          transactionId,
          campaign,
          OrgWallet,
          realBudget
        );
        Logger.info('CAMPAIGN HASH SENT FOR CONFIRMATION');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Campaign Funding');
      });
    increaseTransferCampaignGas
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {transactionId, campaign, OrgWallet, realBudget} = message;
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'transfer',
          keys
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );
        await QueueService.confirmCampaign_FUNDING(
          gasFee.retried,
          transactionId,
          campaign,
          OrgWallet,
          realBudget
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Increasing Gas for Campaign Funding');
      });
    confirmCampaignFunding
      .activateConsumer(async msg => {
        const {hash, transactionId, campaign, OrgWallet, amount} =
          msg.getContent();

        // Handle case where hash is undefined (from previous failed transfers)
        if (!hash || hash === 'undefined') {
          Logger.warn(`Invalid hash received for campaign ${campaign.id}, acknowledging message`);
          msg.ack();
          return;
        }

        const confirm = await BlockchainService.confirmTransaction(hash);

        if (!confirm) {
          msg.nack();
          const campaignError = await CampaignService.updateSingleCampaign(
            campaign.id,
            {
              fund_status: 'error'
            }
          );
          Logger.info(`Campaign Error: ${JSON.stringify(campaignError)}`);
          return;
        }
        if (campaign.type === 'cash-for-work') {
          await CampaignService.updateSingleCampaign(campaign.id, {
            status: 'active',
            is_funded: true,
            is_processing: false,
            amount_disbursed: amount,
            fund_status: 'success'
          });
        } else {
          const campaignSuccess = await CampaignService.updateSingleCampaign(
            campaign.id,
            {
              is_funded: true,
              is_processing: false,
              fund_status: 'success'
            }
          );
          Logger.info(`Campaign Success: ${JSON.stringify(campaignSuccess)}`);
        }

        await update_transaction(
          {
            status: 'success',
            transaction_hash: hash,
            is_approved: true
          },
          transactionId
        );
        const orgToken = await BlockchainService.balance(OrgWallet.address);
        const orgBalance = Number(orgToken.Balance.split(',').join(''));

        const campaignToken = await BlockchainService.balance(
          campaign.Wallet.address
        );
        const campaignBalance = Number(
          campaignToken.Balance.split(',').join('')
        );

        await deductWalletAmount(orgBalance, OrgWallet.uuid);
        await addWalletAmount(campaignBalance, campaign.Wallet.uuid);
        Logger.info('CAMPAIGN FUNDED');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Confirm Campaign Funding');
      });
    increaseAllowance
      .activateConsumer(async msg => {
        const { amount, transactionId, wallet_uuid, campaign, beneficiary, budget, lastIndex, token_type, OrgWallet } = message;

        const gasFee = await BlockchainService.reRunContract(
          'token',
          'increaseAllowance',
          {
            password: keys.ownerPassword,
            spenderPswd: keys.spenderAdd,
            amount: keys.amount.toString()
          }
        );
        if (!gasFee) {
          await BeneficiaryService.spendingStatus(
            beneficiary.CampaignId,
            beneficiary.UserId,
            {
              status: 'error'
            }
          );
          msg.nack();
          return;
        }
        await QueueService.confirmOneBeneficiary(
          gasFee.retried,
          wallet_uuid,
          transactionId,
          beneficiary
        );
        await BeneficiaryService.spendingStatus(
          beneficiary.CampaignId,
          beneficiary.UserId,
          {
            status: 'processing'
          }
        );
        try {
          const res = await seedAllowancesOnce(campaign, OrgWallet);

          Logger.info(`[allowance] result: ${JSON.stringify(res)}`);
        } catch (e) {
          Logger.error(`[allowance] hook failed: ${e.message}`);
        }
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info('Running Process For Increasing Allowance');
      });
    processFundBeneficiaries
      .activateConsumer(async msg => {
        const {OrgWallet, campaignWallet, beneficiaries, campaign, token_type} =
          msg.getContent();
        const campaignKeyPair = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );
        let lastIndex;
        const realBudget = campaign.budget;
        for (let [index, beneficiary] of beneficiaries.entries()) {
          let wallet = beneficiary.User.Wallets[0];

          const beneficiaryKeyPair = await BlockchainService.setUserKeypair(
            `user_${wallet.UserId}campaign_${campaign.id}`
          );

          let share = (
            parseInt(campaign.budget) / parseInt(beneficiaries.length)
          ).toFixed(2);
          Logger.info(`Beneficiary share: ${share}`);
          Logger.info(`Campaign Form: ${beneficiary.formAnswer}`);
          if (beneficiary.formAnswer) {
            const sum = beneficiary.formAnswer.questions.map(val => {
              const total = val.reward.reduce((accumulator, currentValue) => {
                return accumulator + currentValue;
              }, 0);
              return total;
            });
            const formShare = sum.reduce((accumulator, currentValue) => {
              return accumulator + currentValue;
            }, 0);
            share = formShare;
          }
          if (beneficiaries.length - 1 == index) {
            lastIndex = index;
          }

          setTimeout(async () => {
            await QueueService.sendBForRedeem(
              share,
              undefined,
              wallet.uuid,
              campaign,
              beneficiary,
              campaignKeyPair.privateKey,
              beneficiaryKeyPair.address,
              realBudget,
              lastIndex,
              token_type
            );
          }, index * 5000);
        }
        Logger.info('Sent for approving to spend');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })
      .then(() => {
        Logger.info(`Running Process For Funding Beneficiaries`);
      });

      sendBForRedeem
      .activateConsumer(async (msg) => {
        try {
          const {
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
          } = msg.getContent();
    
          await QueueService.sendBForConfirmation(
            undefined,           // hash (none for this path)
            amount,
            transactionId,       // may be undefined – that’s OK
            wallet_uuid,
            campaign,
            beneficiary,
            budget,
            lastIndex,
            token_type
          );
    
          msg.ack();            // ✅ resolve delivery
        } catch (err) {
          Logger.error(`sendBForRedeem error: ${err?.message || err}`);
          msg.reject();         // ✅ don’t requeue forever during dev
        }
      })
      .catch(error => Logger.error(`RabbitMq Error: ${error}`))
      .then(() => Logger.info(`Running Process For Approving Beneficiaries`));
  
      sendBForConfirmation
      .activateConsumer(async (msg) => {
        try {
          const {
            hash,
            amount,
            transactionId,
            uuid,
            campaign,
            beneficiary,
            budget,
            lastIndex,
            token_type
          } = msg.getContent();
    
          await addWalletAmount(amount, uuid);
    
          // Persist TX if we have an id
          try {
            if (transactionId) {
              const txRow = await Transaction.findByPk(transactionId);
              if (txRow) {
                await txRow.update({
                  transaction_hash: hash || txRow.transaction_hash,
                  status: 'success'
                });
              } else {
                Logger.warn(`[sendBForConfirmation] Transaction ${transactionId} not found`);
              }
            }
          } catch (err) {
            Logger.error(`[sendBForConfirmation] Failed to update TX ${transactionId}: ${err.message}`);
          }
    
          // Ensure beneficiary.User is present
          let bUser = beneficiary?.User;
          if (!bUser) {
            const { User } = require('../models');
            bUser = await User.findByPk(beneficiary.UserId);
            if (!bUser) {
              Logger.error(`❌ User not found in DB for Beneficiary: ${beneficiary.UserId}`);
              msg.ack();   // avoid retry loop
              return;
            }
            beneficiary.User = bUser;
          }
    
          const beneficiaryName = `${bUser.first_name || ''} ${bUser.last_name || ''}`.trim();
    
          // Token issuance (SMS / QR)
          let istoken = false;
          let QrCode;
          const smsToken = GenearteSMSToken();
    
          const qrCodeData = {
            OrganisationId: campaign.OrganisationId,
            Campaign: { id: campaign.id, title: campaign.title },
            Beneficiary: { id: beneficiary.UserId, name: beneficiaryName },
            amount
          };
    
          if (token_type === 'papertoken') {
            QrCode = await generateQrcodeURL(JSON.stringify(qrCodeData));
            Logger.info('🧾 Generating Paper Token QR Code');
            istoken = true;
          } else if (token_type === 'smstoken') {
            Logger.info('📲 Generating SMS Token');
            istoken = true;
            await SmsService.sendOtp(
              `${bUser.phone?.startsWith('+') ? '' : '+'}${bUser.phone}`,
              `Hello ${beneficiaryName}, your convexity token is ${smsToken}, you are approved to spend ${amount}.`
            );
          }
    
          if (istoken) {
            await VoucherToken.create({
              organisationId: campaign.OrganisationId,
              beneficiaryId: beneficiary.UserId,
              campaignId: campaign.id,
              tokenType: token_type,
              token: token_type === 'papertoken' ? QrCode : smsToken,
              amount
            });
          }
    
          if (lastIndex !== undefined && lastIndex !== null) {
            await CampaignService.updateSingleCampaign(campaign.id, {
              status: campaign.type === 'cash-for-work' ? 'active' : 'ongoing',
              is_funded: true,
              amount_disbursed: budget
            });
          }
    
          msg.ack();   // ✅ success
        } catch (error) {
          Logger.error(`🐛 RabbitMq Error in sendBForConfirmation: ${error?.message || error}`);
          msg.reject(); // ✅ resolve delivery on failure too
        }
      })
      .catch(error => Logger.error(`🐛 RabbitMq Error in sendBForConfirmation: ${error.message}`))
      .then(() => Logger.info(`✅ Running Process For Sending Beneficiary For Confirmation`));   
       
    processBeneficiaryPaystackWithdrawal
      .activateConsumer(async msg => {
        const {bankAccount, campaignWallet, userWallet, amount, transaction} =
          msg.getContent();
        const campaignAddress = await BlockchainService.setUserKeypair(
          `campaign_${campaignWallet.CampaignId}`
        );

        const beneficiary = await BlockchainService.setUserKeypair(
          `user_${userWallet.UserId}campaign_${campaignWallet.CampaignId}`
        );

        const transfer = await BlockchainService.transferFrom(
          campaignAddress.address,
          beneficiary.address,
          beneficiary.privateKey,
          amount,
          {
            privateKey: beneficiary.privateKey,
            transactionId: transaction.uuid,
            amount,
            recipient_code: bankAccount.recipient_code,
            userWallet,
            campaignWallet
          },
          'BWithdrawal'
        );

        if (!transfer) {
          msg.nack();
          return;
        }
        await QueueService.confirmBTransferRedeem(
          transfer.TransferedFrom,
          beneficiary.privateKey,
          transaction.uuid,
          amount,
          bankAccount.recipient_code,
          userWallet,
          campaignWallet
        );

        const campaignToken = await BlockchainService.balance(
          campaignWallet.address
        );
        const campaignBalance = Number(
          campaignToken.Balance.split(',').join('')
        );
        const beneficiaryToken = await BlockchainService.allowance(
          campaignWallet.address,
          beneficiary.address
        );
        const beneficiaryBalance = Number(
          beneficiaryToken.Allowed.split(',').join('')
        );
        await deductWalletAmount(campaignBalance, campaignWallet.uuid);
        await deductWalletAmount(beneficiaryBalance, userWallet.uuid);

        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Beneficiary Liquidation to Bank Account'
        );
      });
    increaseGasForBWithdrawal
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {
          privateKey,
          transactionId,
          amount,
          recipient_code,
          userWallet,
          campaignWallet
        } = message;

        const gasFee = await BlockchainService.reRunContract(
          'token',
          'transferFrom',
          keys
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );
        await QueueService.confirmBTransferRedeem(
          gasFee.retried,
          privateKey,
          transactionId,
          amount,
          recipient_code,
          userWallet,
          campaignWallet
        );
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error.message}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Increasing Gas For Beneficiary Liquidation to Bank Account'
        );
      });
    confirmBTransferRedeem.activateConsumer(async msg => {
      const {
        hash,
        privateKey,
        transactionId,
        amount,
        recipient_code,
        userWallet,
        campaignWallet
      } = msg.getContent();

      const confirm = await BlockchainService.confirmTransaction(hash);

      if (!confirm) {
        msg.nack();
        return;
      }
      await update_transaction({transaction_hash: hash}, transactionId);
      await QueueService.confirmBRedeem(
        privateKey,
        transactionId,
        amount,
        recipient_code,
        userWallet,
        campaignWallet
      );
    });
    confirmBRedeem
      .activateConsumer(async msg => {
        const {
          privateKey,
          transactionId,
          amount,
          recipient_code,
          userWallet,
          campaignWallet
        } = msg.getContent();
        const redeem = await BlockchainService.redeem(
          privateKey,
          amount,
          {
            amount,
            transactionId,
            campaignWallet,
            userWallet,
            recipient_code
          },
          'beneficiaryRedeem'
        );
        if (!redeem) {
          msg.nack();
          return;
        }
        await QueueService.redeemBeneficiaryOnce(
          redeem.Redeemed,
          amount,
          transactionId,
          campaignWallet,
          userWallet,
          recipient_code
        );
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info('Running Process For Redeem confirmation');
      });
    increaseGasFoBRWithdrawal
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {
          amount,
          transactionId,
          campaignWallet,
          userWallet,
          recipient_code
        } = message;
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'redeem',
          keys
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );
        await QueueService.redeemBeneficiaryOnce(
          gasFee.retried,
          amount,
          transactionId,
          campaignWallet,
          userWallet,
          recipient_code
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Increasing Gas Fee for Redeem confirmation'
        );
      });
    redeemBeneficiaryOnce
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          transactionId,
          campaignWallet,
          userWallet,
          recipient_code
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(hash);
        if (!confirm) {
          msg.nack();
          return;
        }
        await PaystackService.withdraw(
          'balance',
          amount,
          recipient_code,
          'spending'
        );

        const campaignToken = await BlockchainService.balance(
          campaignWallet.address
        );
        const campaignBalance = Number(
          campaignToken.Balance.split(',').join('')
        );
        const userToken = await BlockchainService.allowance(
          campaignWallet.address,
          userWallet.address
        );
        const userBalance = Number(userToken.Allowed.split(',').join(''));
        await deductWalletAmount(campaignBalance, campaignWallet.uuid);
        await deductWalletAmount(userBalance, userWallet.uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        await updateQrCode(amount, {
          campaignId: campaignWallet.CampaignId,
          beneficiaryId: userWallet.UserId
        });
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Confirming Liquidation to Bank Account'
        );
      });
    processVendorPaystackWithdrawal
      .activateConsumer(async msg => {
        const {bankAccount, userWallet, amount, transaction} = msg.getContent();
        const vendor = await BlockchainService.setUserKeypair(
          `user_${userWallet.UserId}`
        );
        const redeem = await BlockchainService.redeem(
          vendor.privateKey,
          amount,
          {
            amount,
            recipient_code: bankAccount.recipient_code,
            transactionId: transaction.uuid,
            uuid: userWallet.uuid
          },
          'vendorRedeem'
        );

        if (!redeem) {
          msg.nack();
          return;
        }
        await QueueService.confirmVRedeem(
          redeem.Redeemed,
          amount,
          bankAccount.recipient_code,
          transaction.uuid,
          userWallet.uuid
        );
        Logger.info('VENDOR REDEEM HASH SENT FOR CONFIRMATION');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info('Running Process For Vendor Liquidation to Bank Account');
      });
    increaseGasForVWithdrawal
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {amount, recipient_code, transactionId, uuid} = message;
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'redeem',
          keys
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );
        await QueueService.confirmVRedeem(
          gasFee.retried,
          amount,
          recipient_code,
          transactionId,
          uuid
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Increasing Gas Fee for Vendor Liquidation to Bank Account'
        );
      });
    confirmVRedeem
      .activateConsumer(async msg => {
        const {hash, amount, recipient_code, transactionId, uuid} =
          msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(hash);

        if (!confirm) {
          msg.nack();
          return;
        }
        await PaystackService.withdraw(
          'balance',
          amount,
          recipient_code,
          'spending'
        );
        await deductWalletAmount(amount, uuid);
        await update_transaction(
          {status: 'success', is_approved: true},
          transactionId
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RABBITMQ ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Confirming Vendor Liquidation to Bank Account'
        );
      });
/* ────────────────────────────────────────────────────────────── */
/* FUND_BENEFICIARY  ➜  pay single beneficiary for task          */
/* ────────────────────────────────────────────────────────────── */
processFundBeneficiary
  .activateConsumer(async msg => {
    try {
      /* 1️⃣  Deserialise payload */
      const {
        beneficiaryWallet,
        campaignWallet,
        task_assignment,
        amount_disburse,
        transaction
      } = msg.getContent();

      Logger.info(
        '[processFundBeneficiary] ⛓  campaignId = %s  amount = %s',
        campaignWallet?.CampaignId,
        amount_disburse
      );

      /* 2️⃣  Load key-pairs */
      const campaignKeys = await BlockchainService.setUserKeypair(
        `campaign_${campaignWallet.CampaignId}`
      );
      const beneficiaryKeys = await BlockchainService.setUserKeypair(
        `user_${beneficiaryWallet.UserId}campaign_${beneficiaryWallet.CampaignId}`
      );

      /* 3️⃣  Approve spending */
      const approveToSpend = await BlockchainService.approveToSpend(
        campaignKeys.privateKey,
        beneficiaryKeys.address,
        amount_disburse,
        {
          transactionId     : transaction.uuid,
          task_assignmentId : task_assignment.id,
          beneficiaryWallet,
          campaignWallet,
          amount            : amount_disburse          // ✅ fixed
        },
        'single'
      );

      if (!approveToSpend) {
        Logger.warn('[processFundBeneficiary] approveToSpend returned null – nack');
        msg.nack();
        return;
      }

      /* 4️⃣  Send for confirmation */
      await QueueService.confirmFundSingleB(
        approveToSpend.Approved,
        transaction.uuid,
        task_assignment.id,
        beneficiaryWallet,
        campaignWallet,
        amount_disburse
      );

      Logger.info(
        '[processFundBeneficiary] ✔ hash %s forwarded for confirmation',
        approveToSpend.Approved
      );
      msg.ack();
    } catch (err) {
      Logger.error(
        `[processFundBeneficiary] ❌ ${err.message || err}`,
        err.stack
      );
      msg.nack();
    }
  })
  .catch(err => {
    Logger.error(`[processFundBeneficiary] activation error → ${err.message}`);
  })
  .then(() => {
    Logger.info('[processFundBeneficiary] consumer READY on FUND_BENEFICIARY');
  });
  
  increaseGasForSB
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {
          transactionId,
          task_assignmentId,
          beneficiaryWallet,
          campaignWallet,
          amount
        } = message;
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'increaseAllowance',
          {
            password: keys.ownerPassword,
            spenderPswd: keys.spenderAdd,
            amount: keys.amount.toString()
          }
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await QueueService.confirmFundSingleB(
          gasFee.retried,
          transactionId,
          task_assignmentId,
          beneficiaryWallet,
          campaignWallet,
          amount
        );
      })
      .catch(error => {
        Logger.error(`RABBITMQ TRANSFER ERROR: ${error}`);
      })
      .then(() => {
        Logger.info(
          'Running Process For Increasing Gas Fee for Funding Beneficiary For Completing Task'
        );
      });
/* ────────────────────────────────────────────────────────────── */
/* CONFIRM_FUND_SINGLE_BENEFICIARY – robust version              */
/* ────────────────────────────────────────────────────────────── */
confirmFundSingleB
  .activateConsumer(async msg => {
    try {
      const {
        hash,
        transactionId,
        task_assignmentId,
        beneficiaryWallet,
        campaignWallet,
        amount               // comes from producer (string or number)
      } = msg.getContent();

      Logger.info('[confirmFundSingleB] ⏳ confirm tx %s  amount=%s', hash, amount);

      /* 1️⃣  Wait for block finality */
      const ok = await BlockchainService.confirmTransaction(hash);
      if (!ok) {
        Logger.warn('[confirmFundSingleB] tx not yet mined → nack');
        msg.nack();
        return;
      }

      /* 2️⃣  Update Transaction & Task first (these must happen even if balance RPC fails) */
      await Promise.all([
        update_transaction(
          { status: 'success', is_approved: true, transaction_hash: hash },
          transactionId
        ),
        TaskAssignment.update(
          { status: 'disbursed' },
          { where: { id: task_assignmentId } }
        )
      ]);

      /* 3️⃣  Try to fetch chain balances */
      let benBalance   = null;
      let campBalance  = null;
      try {
        const [{ Allowed }, { Balance }] = await Promise.all([
          BlockchainService.allowance(
            campaignWallet.address,
            beneficiaryWallet.address
          ),
          BlockchainService.balance(campaignWallet.address)
        ]);

        benBalance  = Number(Allowed .replace(/,/g, ''));
        campBalance = Number(Balance.replace(/,/g, ''));
        Logger.info(
          '[confirmFundSingleB] on-chain balances → ben=%s  camp=%s',
          benBalance,
          campBalance
        );
      } catch (rpcErr) {
        /* RPC failure — log & fall back */
        Logger.warn(
          '[confirmFundSingleB] allowance/balance RPC failed (%s) — using `amount` fallback',
          rpcErr.message
        );
        benBalance  = Number(amount);   // credit beneficiary with the amount we know
        campBalance = null;             // leave campaign wallet untouched
      }

      /* 4️⃣  Persist wallet balances (skip any that are null) */
      const ops = [];
      if (!Number.isNaN(benBalance)  && benBalance !== null)
        ops.push(addWalletAmount(benBalance,  beneficiaryWallet.uuid));
      if (!Number.isNaN(campBalance) && campBalance !== null)
        ops.push(deductWalletAmount(campBalance, campaignWallet.uuid));

      await Promise.all(ops);

      Logger.info(
        '[confirmFundSingleB] ✅ Beneficiary %s credited, task %s complete',
        beneficiaryWallet.uuid,
        task_assignmentId
      );
      msg.ack();
    } catch (err) {
      Logger.error(`[confirmFundSingleB] ❌ ${err.message}`, err.stack);
      msg.nack();               // re-queue for retry
    }
  })
  .catch(err => {
    Logger.error(`[confirmFundSingleB] activation error → ${err.message}`);
  })
  .then(() => {
    Logger.info('[confirmFundSingleB] consumer READY');
  });

  console.log('[PROCESS_VENDOR_ORDER] consumer activating ✅');

  processVendorOrderQueue
  .activateConsumer(async msg => {
    try {
      console.log('[PROCESS_VENDOR_ORDER] received at', new Date().toISOString());
      const {
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        order,
        amount,
        transaction
      } = msg.getContent();

      console.log('[PROCESS_VENDOR_ORDER] payload =', JSON.stringify({
        amount,
        orderRef: order?.reference,
        beneficiary: beneficiaryWallet?.address,
        vendor: vendorWallet?.address,
        campaign: campaignWallet?.address
      }, null, 2));

      // Use addresses from DB payload, and the approved OPS private key as spender
      const TOKEN_OWNER = campaignWallet.address;           // from (campaign budget)
      const RECEIVER    = vendorWallet.address;             // to (vendor)
      const SPENDER_PK  = process.env.ADMIN_PASS_TEST       // or your configured ops key
                       || process.env.ADMIN_PASS;

      const transfer = await BlockchainService.transferFrom(
        TOKEN_OWNER,         // campaign wallet (owner)
        RECEIVER,            // vendor wallet (receiver)
        SPENDER_PK,          // OPS signer private key (spender)
        amount,
        { amount, transaction, order, beneficiaryWallet, campaignWallet, vendorWallet },
        'vendorOrder'
      );

      if (!transfer) {
        console.error('[PROCESS_VENDOR_ORDER] transferFrom returned null – nack');
        msg.nack();
        return;
      }

      await QueueService.confirmVendorOrder(
        transfer.Transferred,   // <-- correct field name from BlockchainService
        amount,
        transaction,
        order,
        beneficiaryWallet,
        campaignWallet,
        vendorWallet
      );

      Logger.info('BENEFICIARY ORDER SENT FOR CONFIRMATION');
      msg.ack();
    } catch (err) {
      console.error('[PROCESS_VENDOR_ORDER] handler error:', err?.message || err);
      msg.nack();
    }
  })
  .catch(error => {
    Logger.error(`RabbitMq Error: ${error}`);
  })
  .then(_ => {
    Logger.info(`Running Process For Vendor Order Queue`);
  });
    increaseGasVTransferFrom
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {
          amount,
          transactionId,
          order,
          beneficiaryWallet,
          campaignWallet,
          vendorWallet
        } = message;

        Logger.info(`Vendor transfer From: ${JSON.stringify(keys)}`);
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'transferFrom',
          keys
        );

        if (!gasFee) {
          msg.nack();
          return;
        }
        // await update_transaction(
        //   {
        //     transaction_hash: gasFee.retried
        //   },
        //   transactionId
        // );
        await QueueService.confirmVendorOrder(
          gasFee.retried,
          amount,
          transactionId,
          order,
          beneficiaryWallet,
          campaignWallet,
          vendorWallet
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(
          `Running Process For Increasing Gas Fee for Vendor Order Queue`
        );
      });
    confirmOrderQueue
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          transactionId,
          order,
          beneficiaryWallet,
          campaignWallet,
          vendorWallet
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(hash);

        if (!confirm) {
          msg.nack();
          return;
        }

        const beneficaryToken = await BlockchainService.allowance(
          campaignWallet.address,
          beneficiaryWallet.address
        );
        const beneficiaryBalance = Number(
          beneficaryToken.Allowed.split(',').join('')
        );

        const campaignToken = await BlockchainService.balance(
          campaignWallet.address
        );
        const campaignBalance = Number(
          campaignToken.Balance.split(',').join('')
        );

        await update_order(order.reference, {status: 'confirmed'});
        await deductWalletAmount(beneficiaryBalance, beneficiaryWallet.uuid);
        await deductWalletAmount(campaignBalance, campaignWallet.uuid);
        const token = await BlockchainService.balance(vendorWallet.address);
        const balance = Number(token.Balance.split(',').join(''));
        // await addWalletAmount(amount, vendorWallet.uuid);

        await blockchainBalance(balance, vendorWallet.uuid);
        await update_transaction(
          {
            transaction_hash: hash,
            status: 'success',
            is_approved: true
          },
          transactionId
        );
        order.Cart.forEach(async prod => {
          await ProductBeneficiary.create({
            productId: prod.ProductId,
            UserId: beneficiaryWallet.UserId,
            OrganisationId: campaignWallet.OrganisationId
          });
        });
        await updateQrCode(amount, {
          campaignId: campaignWallet.CampaignId,
          beneficiaryId: beneficiaryWallet.UserId
        });
        Logger.info('ORDER CONFIRMED');
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })
      .then(_ => {
        Logger.info(`Running Process For Confirming Vendor Order Queue`);
      });
    beneficiaryFundBeneficiary
      .activateConsumer(async msg => {
        const {
          senderWallet,
          receiverWallet,
          amount,
          transaction,
          campaignWallet
        } = msg.getContent();
        const transactionId = transaction.uuid;
        let hash;
        const RWallet = await BlockchainService.setUserKeypair(
          `user_${receiverWallet.UserId}`
        );
        if (campaignWallet) {
          const beneficiary = await BlockchainService.setUserKeypair(
            `user_${senderWallet.UserId}campaign_${senderWallet.CampaignId}`
          );

          const campaign = await BlockchainService.setUserKeypair(
            `campaign_${senderWallet.CampaignId}`
          );
          const transferFrom = await BlockchainService.transferFrom(
            campaign.address,
            RWallet.address,
            beneficiary.privateKey,
            amount,
            {
              amount,
              senderWallet,
              receiverWallet,
              transactionId,
              campaignWallet
            },
            'BFundB'
          );

          if (!transferFrom) {
            msg.nack();
            return;
          }
          hash = transferFrom.TransferedFrom;
          await QueueService.confirmBFundingB(
            hash,
            amount,
            senderWallet,
            receiverWallet,
            transactionId,
            campaignWallet
          );
        }
        if (!campaignWallet) {
          const beneficiary = await BlockchainService.setUserKeypair(
            `user_${senderWallet.UserId}`
          );
          const transferTo = await BlockchainService.transferTo(
            beneficiary.privateKey,
            RWallet.address,
            amount,
            {
              amount,
              senderWallet,
              receiverWallet,
              transactionId,
              campaignWallet
            },
            'PBFundB'
          );
          if (!transferTo) {
            msg.nack();
            return;
          }
          hash = transferTo.Transfered;
          await QueueService.confirmPBFundingB(
            hash,
            amount,
            senderWallet,
            receiverWallet,
            transactionId
          );
        }
        Logger.info(
          'BENEFICIARY TO BENEFICIARY TRANSFER SENT FOR CONFIRMATION'
        );
        msg.ack();
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(`Running Process For Beneficiary to Beneficiary Transfer`);
      });
    increaseTransferBeneficiaryGas
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {
          amount,
          senderWallet,
          receiverWallet,
          transactionId,
          campaignWallet
        } = message;
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'transferFrom',
          keys
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );
        await QueueService.confirmBFundingB(
          gasFee.retried,
          amount,
          senderWallet,
          receiverWallet,
          transactionId,
          campaignWallet
        );
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(
          `Running Process For Increasing Gas for Beneficiary to Beneficiary Transfer`
        );
      });

    increaseTransferPersonalBeneficiaryGas
      .activateConsumer(async msg => {
        const {keys, message} = msg.getContent();
        const {amount, senderWallet, receiverWallet, transactionId} = message;
        const gasFee = await BlockchainService.reRunContract(
          'token',
          'transfer',
          keys
        );
        if (!gasFee) {
          msg.nack();
          return;
        }
        await update_transaction(
          {
            transaction_hash: gasFee.retried
          },
          transactionId
        );
        await QueueService.confirmPBFundingB(
          gasFee.retried,
          amount,
          senderWallet,
          receiverWallet,
          transactionId
        );
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(
          `Running Process For Increasing Gas for Beneficiary to Beneficiary Transfer`
        );
      });

    confirmBFundingBeneficiary
      .activateConsumer(async msg => {
        const {
          hash,
          amount,
          senderWallet,
          receiverWallet,
          transactionId,
          campaignWallet
        } = msg.getContent();

        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_BENEFICIARY_FUNDING_BENEFICIARY,
          msg.getContent()
        );
        if (!confirm) {
          msg.nack();
          return;
        }

        const senderToken = await BlockchainService.allowance(
          campaignWallet.address,
          senderWallet.address
        );
        const senderBalance = Number(senderToken.Allowed.split(',').join(''));

        const receiverToken = await BlockchainService.balance(
          receiverWallet.address
        );
        const receiverBalance = Number(
          receiverToken.Balance.split(',').join('')
        );

        const campaignToken = await BlockchainService.balance(
          campaignWallet.address
        );
        const campaignBalance = Number(
          campaignToken.Balance.split(',').join('')
        );
        await deductWalletAmount(senderBalance, senderWallet.uuid);
        await addWalletAmount(receiverBalance, receiverWallet.uuid);
        campaignWallet &&
          (await deductWalletAmount(campaignBalance, campaignWallet.uuid));
        await update_transaction(
          {
            status: 'success',
            is_approved: true,
            transaction_hash: hash
          },
          transactionId
        );
        Logger.info('BENEFICIARY TRANSFER TO BENEFICIARY SUCCESS');
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(
          `Running Process For Confirming Beneficiary to Beneficiary Transfer`
        );
      });
    confirmPBFundingBeneficiary
      .activateConsumer(async msg => {
        const {hash, amount, senderWallet, receiverWallet, transactionId} =
          msg.getContent();
        const confirm = await BlockchainService.confirmTransaction(
          hash,
          CONFIRM_PERSONAL_BENEFICIARY_FUNDING_BENEFICIARY,
          msg.getContent()
        );
        if (!confirm) {
          msg.nack();
          return;
        }
        const senderToken = await BlockchainService.balance(
          senderWallet.address
        );
        const senderBalance = Number(senderToken.Balance.split(',').join(''));
        const receiverToken = await BlockchainService.balance(
          receiverWallet.address
        );
        const receiverBalance = Number(
          receiverToken.Balance.split(',').join('')
        );
        await deductWalletAmount(senderBalance, senderWallet.uuid);
        await addWalletAmount(receiverBalance, receiverWallet.uuid);
        await update_transaction(
          {
            status: 'success',
            is_approved: true,
            transaction_hash: hash
          },
          transactionId
        );
        Logger.info('BENEFICIARY TRANSFER TO BENEFICIARY SUCCESS');
      })
      .catch(error => {
        Logger.error(`RabbitMq Error: ${error}`);
      })

      .then(_ => {
        Logger.info(
          `Running Process For Confirming Beneficiary to Beneficiary Transfer`
        );
      });

 approveOneBeneficiary
  .activateConsumer(async msg => {
    Logger.info('🚀 [approveOneBeneficiary] Message received from queue');

    const content = msg.getContent();
    Logger.info('📦 Queue Message Content:', JSON.stringify(content, null, 2)); // 💡 Log incoming payload in readable format

    const {
      campaignPrivateKey,
      BAddress,
      amount,
      wallet_uuid,
      campaign,
      beneficiary,
      transactionId
    } = content;

    const share = amount;
    Logger.info('🧠 Calling BlockchainService.approveToSpend...');

    // 💡 INSERT LOG BEFORE CALL
    Logger.info("🧪 Input to approveToSpend:", {
      campaignPrivateKey,
      BAddress,
      amount,
      wallet_uuid,
      transactionId,
    });

    const { Approved } = await BlockchainService.approveToSpend(
      campaignPrivateKey,
      BAddress,
      amount,
      {
        amount,
        transactionId,
        wallet_uuid,
        campaign,
        beneficiary,
        share
      },
      'multiple'
    );

    // 💡 INSERT LOG AFTER CALL
    Logger.info(`🧪 Output from approveToSpend:`, { Approved });

    if (!Approved) {
      Logger.error('❌ approveToSpend returned null or undefined!');
      await BeneficiaryService.spendingStatus(
        beneficiary.CampaignId,
        beneficiary.UserId,
        {
          status: 'error'
        }
      );
      msg.nack(); // 💥 Explicitly fail this message
      return;
    }

    // 💡 INSERT LOG BEFORE SPENDING STATUS
    Logger.info("🔁 Updating beneficiary status to 'processing'...");

    const find = await BeneficiaryService.spendingStatus(
      beneficiary.CampaignId,
      beneficiary.UserId,
      {
        status: 'processing'
      }
    );

    Logger.info(`📌 Updated status to processing:`, find?.status || "Not found");

    // 💡 WRAP confirmOneBeneficiary IN TRY-CATCH
    try {
      Logger.info("📤 Calling QueueService.confirmOneBeneficiary...");
      await QueueService.confirmOneBeneficiary(
        Approved,
        wallet_uuid,
        transactionId,
        beneficiary
      );
      Logger.info(`🎯 confirmOneBeneficiary sent with hash: ${Approved}`);
    } catch (err) {
      Logger.error("❌ Error in confirmOneBeneficiary:", err.message || err);
      msg.nack(); // Fail the queue message so it can retry
      return;
    }

    msg.ack(); // ✅ Successfully handled
  })
  .catch(error => {
    Logger.error(`❌ RabbitMq Error: ${error.message || error}`);
  })
  .then(_ => {
    Logger.info(`✅ Running Process For Approving Single Beneficiary`);
  });

  confirmOneBeneficiary
  .activateConsumer(async msg => {
    const { hash, uuid, transactionId, beneficiary } = msg.getContent();

    Logger.info(`📥 Received confirmOneBeneficiary message with TX hash: ${hash}`);
    Logger.info(`🧪 Verifying transaction on blockchain...`);

    const confirm = await BlockchainService.confirmTransaction(hash);

    if (!confirm) {
      Logger.error("❌ Transaction not confirmed on-chain.");
      msg.nack(); // Retry later
      return;
    }

    Logger.info(`✅ Blockchain confirmed tx: ${hash}`);

    try {
      await update_transaction(
        { is_approved: true, transaction_hash: hash, status: 'success' },
        transactionId
      );
      Logger.info(`✅ DB transaction updated successfully. TX_ID: ${transactionId}`);
    } catch (err) {
      Logger.error(`❌ Error updating transaction in DB: ${err.message}`);
    }

    try {
      const status = await BeneficiaryService.spendingStatus(
        beneficiary.CampaignId,
        beneficiary.UserId,
        {
          approve_spending: true,
          status: 'success'
        }
      );
      Logger.info(`✅ Beneficiary spending status updated: ${status.status}`);
    } catch (err) {
      Logger.error(`❌ Error updating beneficiary status: ${err.message}`);
    }

    try {
      await updateWasFunded(uuid);
      Logger.info(`✅ Wallet funding status set to TRUE for UUID: ${uuid}`);
    } catch (err) {
      Logger.error(`❌ Error updating wallet 'was_funded': ${err.message}`);
    }

    msg.ack(); // ✅ Acknowledge only if all goes well
  })
  .catch(error => {
    Logger.error(`RabbitMq Error in confirmOneBeneficiary: ${error}`);
  })
  .then(() => {
    Logger.info(`🟢 Running Process For Confirming Approving Single Beneficiary`);
  });


  deployEscrowCollection
      .activateConsumer(async msg => {
        const {collection} = msg.getContent();
        const newCollection = await BlockchainService.createEscrowCollection(
          collection
        );
        if (!newCollection) {
          msg.nack();
          return;
        }
        await CampaignService.updateSingleCampaign(collection.campaign_id, {
          escrow_hash: newCollection.escrow
        });

        Logger.info('CONSUMER: DEPLOYED NEW ESCROW COLLECTION');
        msg.ack();
      })
      .then(() => {
        Logger.info('Running Process For Deploying New ESCROW Collection');
      })
      .catch(error => {
        Logger.error(`Collection Consumer Error: ${JSON.stringify(error)}`);
      });
  })
  .catch(error => {
    console.log(`RabbitMq Error: ${error}`);
  });

  /*  add at the very bottom, *after* RabbitMq.completeConfiguration() promise */

if (process.env.NODE_ENV === 'test') {
  const RabbitMq = require('../libs/RabbitMQ/Connection');
  // NEW: named direct exchange for app messages
  module.exports.drainForTest = async function drainForTest () {
    // The amqp-ts library stores all un-acked messages internally.
    // Flushing means: wait until the queue of pending handlers is empty.
    // If your lib exposes no helper, a 50-ms sleep loop works fine in unit tests.

    while (RabbitMq.pendingMessages && RabbitMq.pendingMessages.length) {
      await new Promise(r => setTimeout(r, 20));
    }
  };
}



