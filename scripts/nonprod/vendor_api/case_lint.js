const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', '..', 'tests', 'nonprod', 'vendor_api', 'cases');

const files = fs.existsSync(root) ? fs.readdirSync(root).filter((f) => f.endsWith('.json')).sort() : [];
let count = 0;
for (const file of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  for (const key of ['date', 'pair', 'focus', 'verification']) {
    if (!rec[key]) throw new Error(`Missing ${key} in ${file}`);
  }
  count += 1;
}
console.log(`Validated ${count} vendor/api nonprod case(s)`);

