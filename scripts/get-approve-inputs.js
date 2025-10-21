// scripts/get-approve-inputs.js
require('dotenv').config();
const path = require('path');

const services = require(path.join(__dirname, '../src/services'));
// handle either name from the services index
const BeneficiaryService = services.BeneficiaryService || services.BeneficiariesService;
const { BlockchainService, WalletService, CampaignService } = services;

const CAMPAIGN_ID = 6;
const USER_ID     = 27;

(async () => {
  try {
    // 1) Ensure campaign & wallet exist
    const [campaign, wallet] = await Promise.all([
      CampaignService.getCampaignById(CAMPAIGN_ID),
      WalletService.findUserCampaignWallet(USER_ID, CAMPAIGN_ID),
    ]);

    if (!campaign) throw new Error(`Campaign ${CAMPAIGN_ID} not found`);
    if (!wallet?.address || !wallet?.uuid) {
      throw new Error(`Wallet for user ${USER_ID} in campaign ${CAMPAIGN_ID} not found`);
    }

    // 2) Ensure beneficiary exists and is approved
    let beneficiary = await BeneficiaryService?.getApprovedBeneficiary?.(CAMPAIGN_ID, USER_ID);
    if (!beneficiary) {
      // if your service uses a different method name, adjust here:
      if (BeneficiaryService?.updateCampaignBeneficiary) {
        await BeneficiaryService.updateCampaignBeneficiary(CAMPAIGN_ID, USER_ID, {
          approved: true,
          rejected: false
        });
        beneficiary = { UserId: USER_ID, CampaignId: CAMPAIGN_ID };
      } else {
        // fallback: just shape the object; approval will be handled by queue later
        beneficiary = { UserId: USER_ID, CampaignId: CAMPAIGN_ID };
      }
    }

    // 3) Get campaign signer keypair
    const campaignKeys = await BlockchainService.setUserKeypair(`campaign_${CAMPAIGN_ID}`);
    if (!campaignKeys?.privateKey) throw new Error('Failed to derive campaign keypair');

    // 4) Print payload for approveOneBeneficiary
    const out = {
      campaign: {
        id: campaign.id,
        OrganisationId: campaign.OrganisationId,
        title: campaign.title
      },
      beneficiary: {
        UserId: beneficiary.UserId ?? USER_ID,
        CampaignId: CAMPAIGN_ID
      },
      wallet: {
        uuid: wallet.uuid,
        address: wallet.address
      },
      campaignPrivateKey: campaignKeys.privateKey
    };

    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error('❌ get-approve-inputs failed:', err.message || err);
    process.exit(1);
  }
})();