const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..', 'tests', 'nonprod', 'ngo_api', 'cases');

function assertField(rec, field) {
  if (!rec[field]) throw new Error(`Missing ${field}`);
}

const files = fs.existsSync(root) ? fs.readdirSync(root).filter((f) => f.endsWith('.json')).sort() : [];
let total = 0;
for (const file of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  assertField(rec, 'date');
  assertField(rec, 'pair');
  assertField(rec, 'focus');
  assertField(rec, 'tasks');
  total += 1;
}
console.log(`Validated ${total} NGO/API nonprod case(s)`);

