require('dotenv').config();
const path = require('path');

const {
  QueueService,
  BeneficiariesService,
  CampaignService,
  WalletService,
  BlockchainService,
} = require(path.join(__dirname, '../src/services'));
const { Beneficiary } = require(path.join(__dirname, '../src/models'));

const CAMPAIGN_ID = 6;
const USER_ID = 27;
const AMOUNT = '25';

(async () => {
  try {
    // 1) Load canonical rows/keys as Sequelize instances/objects
    const [campaign, wallet] = await Promise.all([
      CampaignService.getCampaignById(CAMPAIGN_ID),              // obj
      WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID) // obj
    ]);

    if (!campaign) throw new Error('Campaign not found');
    if (!wallet?.uuid || !wallet?.address) throw new Error('Beneficiary wallet missing');

    // IMPORTANT: get the *model instance* (not plain JSON)
    let beneficiary = await Beneficiary.findOne({
      where: { UserId: USER_ID, CampaignId: CAMPAIGN_ID }
    });
    if (!beneficiary) {
      // fallback to service (may return plain); ensure instance
      const b = await BeneficiariesService.getApprovedBeneficiary(CAMPAIGN_ID, USER_ID);
      if (!b) throw new Error('Approved beneficiary row not found');
      // If service returns plain, fetch instance by PK:
      beneficiary = await Beneficiary.findOne({ where: { UserId: USER_ID, CampaignId: CAMPAIGN_ID } });
      if (!beneficiary) throw new Error('Beneficiary instance fetch failed');
    }

    // campaign signer keys
    const campaignKeys = await BlockchainService.setUserKeypair(`campaign_${CAMPAIGN_ID}`);

    console.log('⏳ Queuing approveOneBeneficiary...');
    await QueueService.approveOneBeneficiary(
      campaignKeys.privateKey,     // campaignPrivateKey
      wallet.address,              // BAddress
      AMOUNT,                      // amount
      wallet.uuid,                 // wallet_uuid
      { id: campaign.id, OrganisationId: campaign.OrganisationId, title: campaign.title }, // minimal campaign obj is fine
      beneficiary                  // <-- Sequelize instance (has .update)
    );

    console.log('✅ approveOneBeneficiary queued successfully');
  } catch (err) {
    console.error('❌ approveOneBeneficiary failed:', err.message || err);
    process.exit(1);
  }
})();