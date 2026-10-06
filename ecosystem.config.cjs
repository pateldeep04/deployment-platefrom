module.exports = {
  apps: [
    {
      name: "deployhub-server",
      script: "./server/dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
