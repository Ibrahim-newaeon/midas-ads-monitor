// ecosystem.config.js — PM2 process manager config
// Install: npm install -g pm2
// Start:   pm2 start ecosystem.config.js
// Monitor: pm2 monit
// Logs:    pm2 logs midas-monitor

module.exports = {
  apps: [
    {
      name: 'midas-monitor',
      script: 'dist/index.js',
      interpreter: 'node',
      cwd: __dirname,

      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 10000,   // 10s between restarts

      // Memory guard — restart if > 1.5 GB
      max_memory_restart: '1500M',

      // Environment
      env: {
        NODE_ENV: 'production',
        SCHEDULE_MODE: 'MORNING_PEAK',   // 09:00 GST
      },

      // Log config
      log_file:    './logs/pm2-combined.log',
      out_file:    './logs/pm2-out.log',
      error_file:  './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 8000,
    },
  ],
};
