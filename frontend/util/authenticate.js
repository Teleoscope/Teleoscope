import Router from 'next/router'
import { Stomp } from '../components/Stomp'


const bcrypt = require('bcryptjs');

const authenticateHash = (user, username, password) => {
   if (!user) {
      alert("User not found");
      return '/account/login';
   }


   if (bcrypt.compareSync(password, user.password)) {
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


