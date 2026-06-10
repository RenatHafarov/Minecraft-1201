module.exports = {
  apps: [
    {
      name: "minecraft-forge",
      cwd: "/root/server",
      script: "./run.sh",
      args: "nogui",
      interpreter: "sh",
      autorestart: true,
      restart_delay: 15000,
      kill_timeout: 120000,
      max_memory_restart: "18G"
    },
    {
      name: "mc-restart-scheduler",
      cwd: "/root/server",
      script: "./scripts/scheduled-restart.js",
      interpreter: "node",
      autorestart: true,
      restart_delay: 10000,
      env: {
        MC_RCON_HOST: "127.0.0.1",
        MC_RCON_PORT: "25575",
        RCON_PASSWORD_FILE: "/root/server/.rcon-password",
        RESTART_INTERVAL_HOURS: "4",
        RESTART_WARNINGS_MINUTES: "10,5,1",
        POST_STOP_DELAY_SECONDS: "120"
      }
    }
  ]
};
