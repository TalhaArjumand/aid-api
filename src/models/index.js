'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
// const AWS = require('aws-sdk');
// const rdsCert = fs.readFileSync('./rdsCert.pem');
const basename = path.basename(__filename);
const tls = require('tls');

const config = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  logging: false,
  // aws_region: process.env.AWS_DB_REGION,
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
  // },
  dialectOptions: {
    ssl: false
  },
  dialect: 'postgres'
  // logging: true
};
const db = {};

// const signer = new AWS.RDS.Signer();
// signer.getAuthToken({...config}, (error, token) => {
//   if (error) {
//     Logger
//     console.log(error);
//   }
// });

let sequelize = new Sequelize(config);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database: ' + error);
  }
};
connectDB();
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
