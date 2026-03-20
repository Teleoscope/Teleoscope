// must be run with pm2
// npm install -g pm2
// pm2 start ecosystem.config.js
// pm2 monit
//
// Vectorizer: by default it waits for workspace activity on VECTORIZER_CONTROL_PORT (8765).
// Point the Next.js app at it with VECTORIZER_CONTROL_URL (e.g. http://127.0.0.1:8765).
// Use VECTORIZER_ALWAYS_ON=1 on the vectorizer process for CI or to skip the control server.

module.exports = {
  apps: [
    {
      name: "worker-tasks",
      script: "python",
      args: [
        "-m",
        "celery",
        "-A",
        "backend.tasks",
        "worker",
        "--loglevel=info",
        "-Q",
        "teleoscope-tasks",
      ],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 1,
      time: true,
    },
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
      env: {
        VECTORIZER_CONTROL_HOST: "0.0.0.0",
        VECTORIZER_CONTROL_PORT: "8765",
      },
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
      cwd: "backend",
      script: 'gunicorn -w 4 -k uvicorn.workers.UvicornWorker files:app --bind 0.0.0.0:8000',
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 1,
      time: true,
    },

  ]
};

