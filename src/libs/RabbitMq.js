require('dotenv').config();
const { Connection } = require('@droidsolutions-oss/amqp-ts');

console.log(`🐰 Connecting to RabbitMQ URL: ${process.env.AMQP_URL}`);

module.exports = new Connection(
  process.env.AMQP_URL,
  {},
  { interval: 3000, retries: 3000 }
);