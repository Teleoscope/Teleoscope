// must be run with pm2
// npm install -g pm2
// pm2 start ecosystem.config.js
// pm2 monit
require('dotenv').config(); // Make sure to require dotenv at the top

module.exports = {
  apps: [
    {
      name: "dispatch",
      script: process.env.PYTHON_INTERPRETER,
      args: ["-m", "backend.dispatch"],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 4,
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm run start",
      args: "",
      watch: false,
      interpreter: "",
      max_memory_restart: "1G"
    },
    {
      name:"chromadb",
      cwd:"./backend",
      script:"./chroma.sh",
      args:"",
      watch: false,
      interpreter: "",
      // max_memory_restart: "1G"
    },
    {
      name: "embeddings",
      script: process.env.PYTHON_INTERPRETER,
      args: ["-m", "backend.embeddings"],
      watch: false,
      interpreter: "",
      max_memory_restart: "16G",
      instances: 1,
    },

  ]
};

