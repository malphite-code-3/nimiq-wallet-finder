module.exports = {
  apps: [
    {
      name: 'nimiq-server-api',
      script: './server.js',
      instances: '4', // Number of instances (or 'max' for all CPUs)
      exec_mode: 'cluster', // Enable clustering mode
    }
  ]
};
