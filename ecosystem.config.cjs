module.exports = {
  apps: [
    {
      name: 'zeroroku',
      script: '.output/server/index.mjs',
      cwd: __dirname,
      env_file: '.env',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NITRO_PORT: '6047',
        NITRO_HOST: '0.0.0.0',
      },
    },
  ],
}
