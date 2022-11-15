import useSWRAbstract from "../util/swr";
import Router from 'next/router'

const bcrypt = require('bcryptjs');

export const authenticateService = {
   authenticateHash,
   verifyToken
}

function authenticateHash(username: string, password: string) {
   const { user } = useSWRAbstract("user", `/api/authenticate/${session_id}`);

   if (!user) {
      Router.push({
         pathname: '/account/login'
      })
      return false;
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

