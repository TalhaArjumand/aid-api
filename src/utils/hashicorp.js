const axios = require('axios');
const { hashicorpConfig } = require('../config');
const Logger = require('../libs/Logger');
const { GenerateSecrete } = require('./string');
require('dotenv').config();

/**
 * Env-driven toggles & config
 * HASHICORP_DISABLED=true  -> bypass Vault entirely (dev)
 * HASHICORP_URL=http://127.0.0.1:8200
 * HASHICORP_TOKEN=<root-or-role-token>  (if you use token auth)
 */
const DISABLE_VAULT = process.env.HASHICORP_DISABLED === 'true';
const VAULT_URL = hashicorpConfig?.address || process.env.HASHICORP_URL || '';
const VAULT_NAMESPACE = hashicorpConfig?.namespace || process.env.HASHICORP_NAMESPACE || '';
const SECRET_ENGINE = hashicorpConfig?.secretengine || process.env.HASHICORP_SECRET_ENGINE || 'chats-key';

const Axios = VAULT_URL
  ? axios.create({ baseURL: VAULT_URL })
  : axios.create();

/** Helper: fail fast if Vault is required but not configured */
function ensureVaultEnabled() {
  if (DISABLE_VAULT) return false;
  if (!VAULT_URL) {
    throw new Error(
      'Hashicorp/Vault not configured: set HASHICORP_URL or enable HASHICORP_DISABLED=true for development.'
    );
  }
  return true;
}

const generateClientToken = async () => {
  if (!ensureVaultEnabled()) return null; // bypass in dev

  const dataValues = {
    role_id: hashicorpConfig.role_id,
    secret_id: hashicorpConfig.secret_id
  };

  const { data: hashData } = await Axios.post(
    `/v1/auth/approle/login`,
    dataValues,
    {
      headers: VAULT_NAMESPACE ? { 'X-Vault-Namespace': VAULT_NAMESPACE } : {}
    }
  );
  return hashData?.auth?.client_token;
};

exports.encryptData = (secrete, encryptData) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!ensureVaultEnabled()) {
        // Dev bypass: just return what we got so callers keep flowing
        return resolve({ bypassed: true, data: encryptData });
      }
      const client_token = await generateClientToken();
      const payload = { data: { ...encryptData } };

      const { data: encr } = await Axios.post(
        `/v1/${SECRET_ENGINE}/data/${secrete}`,
        payload,
        {
          headers: {
            ...(client_token ? { 'X-Vault-Token': client_token } : {}),
            ...(VAULT_NAMESPACE ? { 'X-Vault-Namespace': VAULT_NAMESPACE } : {})
          }
        }
      );
      resolve(encr);
    } catch (error) {
      Logger.error(`${error?.message}`, 'error');
      reject(error);
    }
  });
};

exports.decryptData = (secrete) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!ensureVaultEnabled()) {
        // Dev bypass: auto-provision a secret shape so the rest of the code works
        return resolve({ data: { data: { secretKey: GenerateSecrete() } } });
      }

      const client_token = await generateClientToken();
      const { data } = await Axios.get(
        `/v1/${SECRET_ENGINE}/data/${secrete}`,
        {
          headers: {
            ...(client_token ? { 'X-Vault-Token': client_token } : {}),
            ...(VAULT_NAMESPACE ? { 'X-Vault-Namespace': VAULT_NAMESPACE } : {})
          }
        }
      );
      resolve(data);
    } catch (error) {
      if (error?.response?.status === 404) {
        // auto-create when missing (same behavior as your original)
        const data = await this.encryptData(secrete, { secretKey: GenerateSecrete() });
        resolve(data);
        return;
      }
      Logger.error(`${error}`, 'error');
      reject(error);
    }
  });
};