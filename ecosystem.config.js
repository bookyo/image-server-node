module.exports = {
  apps: [
    {
      name: "image-server",
      script: "./app.js",
      env: {
        PORT: 3888,
        NODE_ENV: "development"
      },
      env_uat: {
        PORT: 3888,
        NODE_ENV: "uat"
      },
      env_production: {
        PORT: 3888,
        NODE_ENV: "production"
      }
    }
  ]
}
