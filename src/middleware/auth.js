require('dotenv').config();

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Response } = require('../libs');
const { HttpStatusCode } = require('../utils');
const {
  Guest,
  SuperAdmin,
  GodMode,
  NgoAdmin,
  NgoSubAdmin,
  FieldAgent,
  Vendor,
  Beneficiary,
  Donor
} = require('../utils').AclRoles;

// ✅ Unified Auth middleware factory
const Auth =
  (roleIds = null) =>
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        Response.setError(HttpStatusCode.STATUS_UNAUTHORIZED, 'Missing auth token');
        return Response.send(res);
      }

      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, process.env.SECRET_KEY);

      // ✅ Fetch full user INCLUDING pin & password
      const user = await User.findByPk(payload.uid, {
        attributes: [
          'id',
          'email',
          'first_name',
          'last_name',
          'RoleId',
          'pin',          // make sure pin is included
          'password',     // include password (used for password change)
          'status',
          'is_verified',
          'is_verified_all',
          'is_nin_verified'
        ]
      });

      const userOrgs = payload.oids;

      if (!user || !userOrgs) {
        Response.setError(
          HttpStatusCode.STATUS_UNAUTHORIZED,
          'Unauthorised. User does not exist in our system'
        );
        return Response.send(res);
      }

      // ✅ Role restriction
      if (
        roleIds &&
        roleIds.length &&
        !roleIds.includes(parseInt(user.RoleId))
      ) {
        Response.setError(
          HttpStatusCode.STATUS_FORBIDDEN,
          'Access Denied, Unauthorised Access'
        );
        return Response.send(res);
      }

      // Attach to request
      req.user = user; // Sequelize model (still fine)
      req.userOrgs = userOrgs;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      Response.setError(
        HttpStatusCode.STATUS_UNAUTHORIZED,
        'Unauthorised. Token Invalid or Expired.'
      );
      return Response.send(res);
    }
  };


// ✅ Export the same role guards
exports.Auth = Auth();
exports.AdminVendor = Auth([SuperAdmin, Vendor]);
exports.SuperAdminAuth = Auth([SuperAdmin]);
exports.GodModeAuth = Auth([SuperAdmin, GodMode]);
exports.NgoAdminAuth = Auth([NgoAdmin, SuperAdmin, Donor]);
exports.NgoSubAdminAuth = Auth([NgoAdmin, SuperAdmin, NgoSubAdmin, Donor]);
exports.FieldAgentAuth = Auth([
  NgoAdmin,
  SuperAdmin,
  NgoSubAdmin,
  FieldAgent,
  Donor
]);
exports.VendorAuth = Auth([Vendor]);
exports.SuperNgoVendor = Auth([NgoAdmin, SuperAdmin, Vendor]);
exports.BeneficiaryAuth = Auth([Beneficiary]);
exports.FieldAgentBeneficiaryAuth = Auth([Beneficiary, FieldAgent]);
exports.VendorBeneficiaryAuth = Auth([Beneficiary, Vendor]);
exports.DonorAuth = Auth([Donor]);
exports.GuestAuth = Auth([
  Guest,
  SuperAdmin,
  GodMode,
  NgoAdmin,
  NgoSubAdmin,
  FieldAgent,
  Vendor,
  Beneficiary,
  Donor
]);