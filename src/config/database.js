require('dotenv').config();
const fs = require('fs');
// const rdsCert = fs.readFileSync('./rdsCert.pem');
const tls = require('tls');

const config = {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_LOG: process.env.QUERY_LOGGING || false
};

module.exports = {
  development: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    logging: false,
    dialect: 'postgres',
    // dialectOptions: {
    //   ssl: {
    //     require: false,
    //     rejectUnauthorized: false
    //     // ca: [rdsCert],
    //     // checkServerIdentity: (host, cert) => {
    //     //   const error = tls.checkServerIdentity(host, cert);
    //     //   if (error && !cert.subject.CN.endsWith('.rds.amazonaws.com')) {
    //     //     return error;
    //     //   }
    //     // }
    //   }
    // }
    dialectOptions: {
      ssl: false
    }
  },
  test: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    logging: config.DB_LOG,
    dialect: 'postgres'
  },
  production: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    logging: config.DB_LOG,
    dialect: 'postgres'
  }
};
