const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', '..', 'tests', 'nonprod', 'beneficiary_api', 'cases');

const files = fs.existsSync(root) ? fs.readdirSync(root).filter((f) => f.endsWith('.json')).sort() : [];
let total = 0;
for (const file of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const keys = ['date', 'pair', 'focus', 'checks'];
  for (const k of keys) {
    if (!rec[k]) throw new Error(`Missing ${k} in ${file}`);
  }
  total += 1;
}
console.log(`Validated ${total} beneficiary/api nonprod case(s)`);

