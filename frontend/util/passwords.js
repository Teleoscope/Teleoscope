const prompt = require('prompt');
const bcrypt = require("bcryptjs")
prompt.start();

var salt = bcrypt.genSaltSync(10);


const properties = [
  {
    name: 'username',
    validator: /^[a-zA-Z\s-]+$/,
    warning: 'Username must be only letters, spaces, or dashes'
  },
  {
    name: 'password',
    hidden: true,
    before: (x) => bcrypt.hashSync(x, salt)
  }
];

prompt.get(properties, function (err, result) {
  if (err) {
    return onErr(err);
  }
  console.log('Command-line input received:');
  console.log('  Username: ' + result.username);
  console.log('  Password: ' + result.password);
});

function onErr(err) {
  console.log(err);
  return 1;
}

// $2a$10$AQPHBgvIjjLnFUQZTauN.uX8URnkx47wciIEzy7lV6IZ64lJ5MN7i
// bcrypt.compareSync(xxx, hash); // true