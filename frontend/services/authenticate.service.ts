import Router from 'next/router'

const bcrypt = require('bcryptjs');

export const authenticateService = {
   authenticateHash,
   verifyToken
}

function authenticateHash(user, username: string, password: string) {
   if (!user) {
      alert("User not found")
      return '/account/login';
   }

   const salt = bcrypt.genSaltSync(10);
   const hashedPassword = bcrypt.hashSync(password, salt);

   const passCompare = (password === user.password);
   const userCompare = (username === user.username);


   if (passCompare && userCompare) {
      //Router.push('/')
      return true;
   } else {
      Router.push({
         pathname: '/account/login',
         query: {error: true}
      })
      return false;
   }

}

function verifyToken() {

}

