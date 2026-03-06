// Create teleoscope database and user for Docker Compose
db = db.getSiblingDB('admin');
db.createUser({
  user: 'teleoscope',
  pwd: 'teleoscope_dev_password',
  roles: [
    { role: 'readWrite', db: 'teleoscope' },
    { role: 'readWrite', db: 'teleoscope_registrar' }
  ]
});
