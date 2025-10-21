// scripts/issue-papertoken.js
require('dotenv').config();
const path = require('path');

// Prefer pulling from services index; fall back to direct files if needed
const servicesRoot = path.join(__dirname, '../src/services');
let QueueService, CampaignService, BeneficiaryService, WalletService;

try {
  ({ QueueService, CampaignService, BeneficiaryService, WalletService } =
    require(servicesRoot)); // exports should include BeneficiaryService (singular)
} catch (_) {
  // fallback to direct files if the index doesn't re-export
  QueueService       = require(path.join(servicesRoot, 'QueueService'));
  CampaignService    = require(path.join(servicesRoot, 'CampaignService'));
  BeneficiaryService = require(path.join(servicesRoot, 'BeneficiaryService'));
  WalletService      = require(path.join(servicesRoot, 'WalletService'));
}

const CAMPAIGN_ID = 6;
const USER_ID     = 27;
const AMOUNT      = '25';          // string is fine
const TOKEN_TYPE  = 'papertoken';  // or 'smstoken'

(async () => {
  try {
    const [campaign, beneficiaryRow, wallet] = await Promise.all([
      CampaignService.getCampaignById(CAMPAIGN_ID),
      // NB: method lives on BeneficiaryService (singular)
      BeneficiaryService.getApprovedBeneficiary(CAMPAIGN_ID, USER_ID),
      WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID),
    ]);

    if (!campaign) throw new Error('Campaign not found');
    if (!wallet?.uuid) throw new Error('Beneficiary wallet not found');

    // Some installs return null here if you haven’t explicitly approved in DB
    const beneficiary =
      beneficiaryRow ??
      { UserId: USER_ID, CampaignId: CAMPAIGN_ID }; // minimal shape used by the consumer

    // This goes to TransactionConsumer → sendBForConfirmation consumer
    await QueueService.sendBForConfirmation(
      /* hash */ undefined,
      /* amount */ AMOUNT,
      /* transactionId */ undefined,
      /* wallet_uuid */ wallet.uuid,
      campaign,
      beneficiary,
      /* budget */ campaign.budget,
      /* lastIndex */ 0,
      /* token_type */ TOKEN_TYPE
    );

    console.log(`✅ queued sendBForConfirmation for user ${USER_ID}, campaign ${CAMPAIGN_ID}`);
  } catch (e) {
    console.error('❌ issue-papertoken failed:', e.message);
    process.exit(1);
  }
})();