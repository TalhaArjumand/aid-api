const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..', 'tests', 'nonprod', 'blockchain_api', 'cases');

function required(record, key) {
  if (!record[key]) {
    throw new Error(`Missing required key: ${key}`);
  }
}

function main() {
  if (!fs.existsSync(root)) {
    throw new Error(`Cases directory not found: ${root}`);
  }
  const files = fs.readdirSync(root).filter((f) => f.endsWith('.json')).sort();
  let checked = 0;
  for (const file of files) {
    const fullPath = path.join(root, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    required(data, 'date');
    required(data, 'pair');
    required(data, 'focus');
    required(data, 'checklist');
    checked += 1;
  }
  console.log(`Validated ${checked} nonprod case file(s) in ${root}`);
}

main();

