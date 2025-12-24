const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir); 
  list.forEach(function(file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const base = path.resolve(__dirname, '..', 'app', 'api');
if (!fs.existsSync(base)) {
  console.error('No app/api folder found at', base);
  process.exit(1);
}

const files = walk(base).filter(f => f.endsWith('route.ts'));
let suspicious = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const backticks = (content.match(/`/g) || []).length;
  const single = (content.match(/'/g) || []).length;
  const double = (content.match(/"/g) || []).length;
  const openBlock = (content.match(/\/\*/g) || []).length;
  const closeBlock = (content.match(/\*\//g) || []).length;
  const last200 = content.slice(-200);
  const odd = (backticks % 2 !== 0) || (single % 2 !== 0) || (double % 2 !== 0) || (openBlock !== closeBlock);
  if (odd) {
    suspicious.push({ file: f, backticks, single, double, openBlock, closeBlock, last200 });
  }
}

if (suspicious.length === 0) {
  console.log('No suspicious files found (balanced quotes/backticks and block comments).');
  process.exit(0);
}

console.log('Suspicious files:');
suspicious.forEach(s => {
  console.log('\nFile:', s.file);
  console.log('backticks:', s.backticks, 'single quotes:', s.single, 'double quotes:', s.double, '/*:', s.openBlock, '*/:', s.closeBlock);
  console.log('--- tail (last 200 chars) ---');
  console.log(s.last200);
});

process.exit(0);
