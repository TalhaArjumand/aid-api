// middleware/resolveOrgFromUser.js
const { Organisation, OrganisationMembers } = require('../models');

module.exports = async function resolveOrgFromUser(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing in token' });
    }

    const member = await OrganisationMembers.findOne({
      where: { UserId: userId }
    });

    if (!member) {
      return res.status(403).json({ message: 'You are not a member of any organisation' });
    }

    const organisation = await Organisation.findByPk(member.OrganisationId);

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    // ✅ Add these debug logs
    console.log("🧩 Org Member:", member.toJSON());
    console.log("🏢 Organisation Found:", organisation.toJSON());
    console.log("✅ is_verified:", organisation.is_verified);
    
    req.organisation = organisation;
    req.member = member;
    next();
  } catch (error) {
    console.error('❌ resolveOrgFromUser Error:', error);
    return res.status(500).json({ message: 'Server error in resolveOrgFromUser' });
  }
};