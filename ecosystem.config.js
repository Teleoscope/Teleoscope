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
      instances: 1,
      time: true,
    },
    {
      name: "frontend",
      cwd: "./teleoscope.ca",
      script: "pnpm start",
      args: "",
      watch: false,
      interpreter: "",
      max_memory_restart: "1G",
      time: true,
    },
    {
      name:"vectorizer",
      script:"python",
      args:["-m", "backend.vectorizer"],
      watch: false,
      interpreter: "",
    },
    {
      name:"uploader",
      script:"python",
      args:["-m", "backend.uploader"],
      watch: false,
      interpreter: "",
      time: true,
    },
    {
      name: "graph",
      script: 'python',
      args: ["-m", "backend.graph"],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 1,
      time: true,
    },
    {
      name: "monitor",
      script: 'python',
      args: ["-m", "backend.monitor"],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 1,
      time: true,
    },
    {
      name: "files",
      script: 'gunicorn',
      args: [
        '-w', '1', // Number of workers
        '-k', 'uvicorn.workers.UvicornWorker', // Use Uvicorn worker class
        'backend.files:app', // The FastAPI app (module:instance)
        '--bind', '0.0.0.0:8000'
      ],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 1,
      time: true,
    },

  ]
};

