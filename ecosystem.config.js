// must be run with pm2
// npm install -g pm2
// pm2 start ecosystem.config.js
// pm2 monit

module.exports = {
  apps: [
    {
      name: "dispatch",
      script: "/usr/share/miniconda3/envs/teleoscope/bin/python",
      args: ["-m", "backend.dispatch"],
      watch: false,
      interpreter: ""
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm run start",
      args: "",
      watch: false,
      interpreter: "",
      max_memory_restart: "1G"
    }
  ]
};