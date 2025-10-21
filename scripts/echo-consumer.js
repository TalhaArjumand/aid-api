// scripts/echo-consumer.js
require('dotenv').config();
const Amqp = require('@droidsolutions-oss/amqp-ts');

const AMQP_URL = process.env.AMQP_URL || 'amqp://admin:admin@localhost:5672';
const RK = 'processVendorOrder';
const EXCHANGE = 'app.direct';

(async () => {
  console.log('[ECHO] connecting ->', AMQP_URL);
  const conn = new Amqp.Connection(AMQP_URL);

  const ex = conn.declareExchange(EXCHANGE, 'direct', { durable: true });
  const q  = conn.declareQueue(RK, { durable: true });

  // ensure binding exists before consuming
  await Promise.all([ex.initialized, q.initialized]);
  console.log(`[ECHO] binding queue "${RK}" to exchange "${EXCHANGE}" with key "${RK}"`);
  await q.bind(ex, RK).initialized;

  console.log('[ECHO] consumer activating on queue:', RK);
  await q.activateConsumer(msg => {
    try {
      const content = msg.getContent();
      console.log('================= [ECHO] GOT MESSAGE =================');
      console.log('[ECHO] raw fields:', {
        exchange: msg.fields.exchange,
        routingKey: msg.fields.routingKey,
        redelivered: msg.fields.redelivered
      });
      console.log('[ECHO] payload:', JSON.stringify(content, null, 2));
      console.log('=======================================================');
      msg.ack();
    } catch (e) {
      console.error('[ECHO] error handling message:', e);
      msg.reject(); // don’t requeue forever while testing
    }
  }, { noAck: false });

  console.log('[ECHO] ready ✅');
})();