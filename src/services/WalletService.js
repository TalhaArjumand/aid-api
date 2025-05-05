const {Op} = require('sequelize');
const {walletConst, userConst} = require('../constants');
const {Wallet, User} = require('../models');
const {Logger} = require('../libs');

class WalletService {
  static findSingleWallet(where) {
    return Wallet.findOne({
      where,
      include: [
        'Organisation',
        {
          model: User,
          as: 'User',
          attributes: userConst.publicAttr
        }
      ]
    });
  }
  static findCampainSingleWallet(CampaignId) {
    return Wallet.findOne({
      where: {CampaignId}
    });
  }

  static async updateOrCreate({wallet_type, CampaignId, ownerId}, data) {
    Logger.info('🛠️ WalletService.updateOrCreate received:', {
      wallet_type,
      CampaignId,
      ownerId
    });
    return new Promise(async (resolve, reject) => {
      try {
        const where = {
          wallet_type
        };
        if (wallet_type == 'user') {
          where.UserId = ownerId;
        }
        if (wallet_type == 'organisation') {
          where.OrganisationId = ownerId;
        }
        if (CampaignId) {
          where.CampaignId = CampaignId;
        }

        const find = await Wallet.findOne({
          where
        });
        if (find) {
          Logger.info(`Updating Wallet`);
          await find.update(data);
          resolve(find);
        }
        Logger.info(`Creating Wallet`);
        const wallet = await Wallet.create({
          ...where,
          ...data
        });

        Logger.info(`Wallet Created: ${JSON.stringify(wallet)}`);
        resolve(wallet);
      } catch (error) {
        Logger.error(`Error creating wallet: ${JSON.stringify(error)}`);
        reject(error);
      }
    });
  }

  static findMainOrganisationWallet(OrganisationId) {
    return Wallet.findOne({
      where: {
        OrganisationId,
        wallet_type: 'organisation',
        CampaignId: null
      }
    });
  }

  static findOrganisationCampaignWallets(OrganisationId) {
    return Wallet.findAll({
      attributes: {
        exclude: walletConst.walletExcludes
      },
      where: {
        OrganisationId,
        CampaignId: {
          [Op.not]: null
        }
      },
      include: ['Campaign']
    });
  }

  static findOrganisationCampaignWallet(OrganisationId, CampaignId) {
    return Wallet.findOne({
      attributes: {
        exclude: walletConst.walletExcludes
      },
      where: {
        OrganisationId,
        CampaignId
      },
      include: ['Campaign']
    });
  }

  static findUserWallets(UserId) {
    return Wallet.findAll({
      where: {
        UserId
      },
      attributes: {
        exclude: walletConst.walletExcludes
      },
      include: ['Campaign']
    });
  }

  static findUserCampaignWallet(UserId, CampaignId) {
    return Wallet.findOne({
      where: {
        UserId,
        CampaignId
      },
      include: ['Campaign']
    });
  }

  static findCampaignFundWallet(OrganisationId, CampaignId) {
    return Wallet.findOne({
      where: {
        OrganisationId,
        CampaignId
      },
      include: ['Campaign']
    });
  }
}

module.exports = WalletService;
