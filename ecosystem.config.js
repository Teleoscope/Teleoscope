// must be run with pm2
// npm install -g pm2
// pm2 start ecosystem.config.js
// pm2 monit
module.exports = {
  apps: [
    {
      name: "worker",
      cwd: "./backend",
      script: "/usr/local/bin/python3",
      args: "-m celery -A dispatch worker --loglevel=INFO -n worker.paul@%%h",
      watch: false,
      interpreter: "",
      max_memory_restart: "1G"
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm",
      args:"start",
    }
  ]
};