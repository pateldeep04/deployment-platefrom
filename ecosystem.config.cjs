module.exports = {
  apps: [
    {
      name: "deployhub-server",
      script: "server/index.ts",
      interpreter: "ts-node",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
