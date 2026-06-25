const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');

module.exports = () => {
  require('./setup-env');

  const prismaCli = require.resolve('prisma/build/index.js');

  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
};
