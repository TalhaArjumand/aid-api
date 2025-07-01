const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', '..', 'tests', 'nonprod', 'admin_api', 'cases');

const files = fs.existsSync(root) ? fs.readdirSync(root).filter((f) => f.endsWith('.json')).sort() : [];
let checked = 0;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  if (!data.date || !data.pair || !data.focus || !data.operations) {
    throw new Error(`Invalid case schema in ${file}`);
  }
  checked += 1;
}
console.log(`Validated ${checked} admin/api nonprod case(s)`);

