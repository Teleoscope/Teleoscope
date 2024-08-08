// must be run with pm2
// npm install -g pm2
// pm2 start ecosystem.config.js
// pm2 monit

module.exports = {
  apps: [
    {
      name: "dispatch",
      script: 'python',
      args: ["-m", "backend.dispatch"],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 4,
    },
    {
      name: "frontend",
      cwd: "./teleoscope.ca",
      script: "pnpm start",
      args: "",
      watch: false,
      interpreter: "",
      max_memory_restart: "1G"
    },
    {
      name:"vectorizer",
      script:"uvicorn backend.vectorizer:app --host 127.0.0.1 --port 8000",
      args:"",
      watch: false,
      interpreter: "",
    },
    {
      name: "graph",
      script: 'python',
      args: ["-m", "backend.graph"],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 4,
    },

  ]
};

