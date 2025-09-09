module.exports = {
  apps: [
    // Production configs
    {
      name: 'cabra-bot',
      script: './bot.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true
    },
    {
      name: 'cabra-web',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4050
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true
    },
    // Development configs with file watching
    {
      name: 'cabra-bot-dev',
      script: './bot.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: true,
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', 'data'],
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      error_file: './logs/bot-dev-error.log',
      out_file: './logs/bot-dev-out.log',
      log_file: './logs/bot-dev-combined.log',
      time: true
    },
    {
      name: 'cabra-web-dev',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: true,
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', 'data', 'client'],
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4050
      },
      error_file: './logs/web-dev-error.log',
      out_file: './logs/web-dev-out.log',
      log_file: './logs/web-dev-combined.log',
      time: true
    }
  ]
};