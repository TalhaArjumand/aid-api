"use strict";
require("dotenv").config();

// src/libs/RabbitMQ/Connection.js
const amqp = require('@droidsolutions-oss/amqp-ts');

let connection = null;

if (!connection) {
  console.log('📡 Creating RabbitMQ connection...');
  connection = new amqp.Connection('amqp://admin:admin@localhost:5672');
}

module.exports = connection;