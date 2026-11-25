/**
 * PM2 Process Manager Configuration for Production
 *
 * Usage: pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: 'handwriteai-backend',
      script: 'dist/index.js',
      cwd: './backend',
      instances: 1, // Set to 'max' for cluster mode (requires Redis for session sharing)
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      // Auto-restart
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      // Memory limit
      max_memory_restart: '500M',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    // Frontend can be served via nginx or a separate static server
    // For simplicity, we only manage the backend with PM2
  ],
};