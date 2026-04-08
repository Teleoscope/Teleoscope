// Create teleoscope database and user for Docker Compose.
// Password is read from MONGODB_PASSWORD env var (set in .env / docker-compose);
// falls back to 'teleoscope_dev_password' for local dev without a .env.
db = db.getSiblingDB('admin');
db.createUser({
  user: 'teleoscope',
  pwd: process.env.MONGODB_PASSWORD || 'teleoscope_dev_password',
  roles: [
    { role: 'readWrite', db: 'teleoscope' },
    { role: 'readWrite', db: 'teleoscope_registrar' }
  ]
});
