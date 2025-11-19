module.exports = {
  apps: [
    {
      name: "insuredmine-app",
      script: "main.js",
      watch: false,

      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      restart_delay: 5000,

      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      max_cpu: 70
    }
  ]
};
