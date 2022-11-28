import Router from 'next/router'


const bcrypt = require('bcryptjs');

const authenticateHash = (user, username, password) => {
   if (!user) {
      alert("User not found")
      return '/account/login';
   }


   if (bcrypt.compareSync(password, user.password)) {
      Router.push('/')
   } else {
      Router.push({
         pathname: '/account/login',
         query: {error: true}
      })
   }  
}

export default authenticateHash;


