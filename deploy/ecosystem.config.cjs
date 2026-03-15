const path = require('path');

const appRoot = process.env.APP_ROOT || path.resolve(__dirname, '..');
const apiPort = Number(process.env.PORT || 3004);
const configuredInstances = process.env.WEB_CONCURRENCY || 'max';
const maxMemoryRestart = process.env.PM2_MAX_MEMORY_RESTART || '750M';

module.exports = {
  apps: [
    {
      name: 'green-force-assessment-api',
      cwd: path.join(appRoot, 'server'),
      script: 'server.js',
      interpreter: 'node',
      instances: configuredInstances,
      exec_mode: 'cluster',
      instance_var: 'PM2_INSTANCE_ID',
      env: {
        NODE_ENV: 'production',
        PORT: apiPort,
      },
      error_file: '/var/log/pm2/green-force-assessment-api-error.log',
      out_file: '/var/log/pm2/green-force-assessment-api-out.log',
      merge_logs: true,
      time: true,
      max_memory_restart: maxMemoryRestart,
      kill_timeout: 10000,
      listen_timeout: 10000,
    },
  ],
};
