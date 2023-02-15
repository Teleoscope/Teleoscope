// must be run with pm2
// npm install -g pm2
// pm2 start ecosystem.config.js
// pm2 monit
const os = require("os");
let userInfo = os.userInfo();
console.log("User info:", userInfo);

module.exports = {
  apps: [
    {
      name: "dispatch",
      cwd: "./backend",
      script: "/usr/share/miniconda3/envs/teleoscope/bin/python",
      args: `-m celery -A dispatch worker --loglevel=INFO -n dispatch.${userInfo.username}@%h`,
      watch: false,
      interpreter: "",
      max_memory_restart: "1G"
    },
    {
      name: "worker",
      cwd: "./backend",
      script: "/usr/share/miniconda3/envs/teleoscope/bin/python",
      args: `-m celery -A tasks worker --loglevel=INFO -n worker.${userInfo.username}@%h --queues=dev-${userInfo.username}-task`,
      watch: false,
      interpreter: "",
      max_memory_restart: "1G"
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
