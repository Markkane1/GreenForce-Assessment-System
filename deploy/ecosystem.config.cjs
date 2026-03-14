const path = require('path');

const appRoot = process.env.APP_ROOT || path.resolve(__dirname, '..');
const apiPort = Number(process.env.PORT || 3004);

module.exports = {
  apps: [
    {
      name: 'green-force-assessment-api',
      cwd: path.join(appRoot, 'server'),
      script: 'server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: apiPort,
      },
      error_file: '/var/log/pm2/green-force-assessment-api-error.log',
      out_file: '/var/log/pm2/green-force-assessment-api-out.log',
      time: true,
      max_memory_restart: '300M',
    },
  ],
};
