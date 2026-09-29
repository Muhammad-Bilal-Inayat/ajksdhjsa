const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cjsPath = path.join(__dirname, 'dist', 'server.cjs');
const jsPath = path.join(__dirname, 'dist', 'server.js');

if (!fs.existsSync(cjsPath) && !fs.existsSync(jsPath)) {
  console.log('[AUTO-BUILD] Production build missing in dist/. Building now...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  } catch (err) {
    console.error('[AUTO-BUILD FAILED]', err?.message || err);
  }
}

if (fs.existsSync(cjsPath)) {
  require(cjsPath);
} else if (fs.existsSync(jsPath)) {
  require(jsPath);
} else {
  console.error('Build output missing! Please run npm run build first.');
  process.exit(1);
}

