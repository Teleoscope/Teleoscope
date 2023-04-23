// Marked as can be deleted

import Router from 'next/router'
import { Stomp } from '../components/Stomp'


const bcrypt = require('bcryptjs');

const authenticateHash = (user, username, password) => {
   if (!user) {
      alert("User not found");
      return '/account/login';
   }


   if (bcrypt.compareSync(password, user.password)) {
      // TODO: sends the username and password to the backend, and let backend verify it.
      const client = Stomp.getInstance();
      client.request_tokens(username);
      Router.push('/');
   } else {
      Router.push({
         pathname: '/account/login',
         query: {error: true}
      })
      alert("Invalid username or password")
   }  
}

export default authenticateHash;


