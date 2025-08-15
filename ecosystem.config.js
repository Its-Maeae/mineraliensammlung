// ecosystem.config.js - PM2 Konfiguration für Produktionsumgebung
module.exports = {
  apps: [{
    name: 'mineraliensammlung',
    script: 'server.js',
    
    // Instanz-Einstellungen
    instances: 1,
    exec_mode: 'fork',
    
    // Restart-Verhalten
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Umgebungsvariablen
    env: {
      NODE_ENV: 'production',
      PORT: 8084
    },
    
    // Development Umgebung
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      watch: true
    },
    
    // Cron-Restart (optional - täglich um 3 Uhr)
    cron_restart: '0 3 * * *',
    
    // Weitere Optionen
    node_args: '--max-old-space-size=512',
    kill_timeout: 5000,
    wait_ready: true,
    
    // Cluster-Modus (falls gewünscht)
    // instances: 'max',
    // exec_mode: 'cluster'
  }],
  
  deploy: {
    production: {
      user: 'pi',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:username/mineraliensammlung.git',
      path: '/home/pi/mineraliensammlung',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};