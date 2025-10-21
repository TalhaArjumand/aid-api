const {WalletService, QueueService} = require('../src/services');

(async () => {
  const campaignId     = 6;   // FAST campaign
  const beneficiaryUid = 27;  // Example One

  // 1️⃣ get wallets
  const campaign = await WalletService.findSingleWallet({ CampaignId: campaignId, UserId: null });
  const beneficiary = await WalletService.findSingleWallet({ CampaignId: campaignId, UserId: beneficiaryUid });

  // 2️⃣ trigger queue
  console.log("🔔 Queuing allowance...");
  await QueueService.approveOneBeneficiary(
    campaign.privateKey,      // from DB
    beneficiary.address,
    10000,                    // or whatever the campaign funded
    beneficiary.uuid,
    campaign,
    beneficiary
  );
  console.log("✅ approval message sent. Watch your consumer logs.");
  process.exit(0);
})();