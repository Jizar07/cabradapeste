module.exports = {
  apps: [
    {
      name: 'cabra-bot-dev',
      script: './bot.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: true,
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', 'data', 'client'],
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
      ignore_watch: ['node_modules', 'logs', 'data', 'client/build', 'client/node_modules'],
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4050
      },
      error_file: './logs/web-dev-error.log',
      out_file: './logs/web-dev-out.log',
      log_file: './logs/web-dev-combined.log',
      time: true
    },
    {
      name: 'cabra-client-dev',
      script: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/c', 'npm start'],
      cwd: './client',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        BROWSER: 'none'
      },
      error_file: './logs/client-dev-error.log',
      out_file: './logs/client-dev-out.log',
      log_file: './logs/client-dev-combined.log',
      time: true
    }
  ]
};