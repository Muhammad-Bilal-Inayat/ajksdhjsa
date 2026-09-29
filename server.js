const fs = require('fs');
const path = require('path');

const cjsPath = path.join(__dirname, 'dist', 'server.cjs');
const jsPath = path.join(__dirname, 'dist', 'server.js');

if (fs.existsSync(cjsPath)) {
  require(cjsPath);
} else if (fs.existsSync(jsPath)) {
  require(jsPath);
} else {
  console.error('Build output missing! Please run npm run build first.');
  process.exit(1);
}
