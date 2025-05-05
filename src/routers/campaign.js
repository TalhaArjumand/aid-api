const router = require('express').Router();
const {CampaignController} = require('../controllers');
const {Auth, BeneficiaryAuth, FieldAgentAuth} = require('../middleware');

// 👇 NEW PUBLIC CAMPAIGNS ROUTE (NO AUTH NEEDED)
router.get('/public', (req, res) => {
  return res.status(200).json([
    {
      id: 1,
      name: "Food Relief Campaign",
      location: "Pakistan",
      status: "Active"
    },
    {
      id: 2,
      name: "Medical Aid Campaign",
      location: "Lahore",
      status: "Completed"
    }
  ]);
});

// 👇 YOUR EXISTING ROUTES (REQUIRE AUTH)
router.route('/').get(Auth, CampaignController.getAllCampaigns);
router.route('/beneficiary').get(BeneficiaryAuth, CampaignController.getAllBeneficiaryCampaigns);
router.post('/field-agent/', FieldAgentAuth, CampaignController.getFieldAgentCampaigns);

router.get('/:id', Auth, CampaignController.getACampaign);
router.put('/:id', Auth, CampaignController.updatedCampaign);
router.post('/:id', Auth, CampaignController.deleteCampaign);
router.post('/onboard-beneficiaries/:campaignId', Auth, CampaignController.beneficiariesToCampaign);
router.get('/complaints/:campaignId', Auth, CampaignController.complaints);

module.exports = router;