#!/usr/bin/env node
require('dotenv').config();
const amqp = require('amqplib');

(async () => {
  // Load the ACTUAL queue name from your constants
  const { PROCESS_VENDOR_ORDER } = require('../src/constants/queues.constant');

  const URL   = process.env.AMQP_URL || 'amqp://admin:admin@localhost:5672';
  const name  = process.argv[2] || PROCESS_VENDOR_ORDER; // default to the right value

  const conn = await amqp.connect(URL);
  const ch   = await conn.createChannel();

  // Make sure the queue exists (durable should match your declare)
  await ch.assertQueue(name, { durable: true });

  const q = await ch.checkQueue(name);
  console.log({ queue: q.queue, messageCount: q.messageCount, consumerCount: q.consumerCount });

  await ch.close();
  await conn.close();
})().catch(e => {
  console.error('rmq-queue-info error:', e.message);
  process.exit(1);
});