const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', '..', 'tests', 'nonprod', 'field_api', 'cases');

const files = fs.existsSync(root) ? fs.readdirSync(root).filter((f) => f.endsWith('.json')).sort() : [];
let valid = 0;
for (const file of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  for (const key of ['date', 'pair', 'focus', 'controls']) {
    if (!rec[key]) throw new Error(`Missing ${key} in ${file}`);
  }
  valid += 1;
}
console.log(`Validated ${valid} field/api nonprod case(s)`);

