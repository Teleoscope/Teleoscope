// middleware uses teh express-jwt library to validate JWT tokens
// in requests sent to protected API routes, if a token is invalid
// an error is thrown which causes the global error handler to 
// return a 401 Unauthorized response.

// JWT : JSON Web Tokens
const { expressjwt: jwt }= require('express-jwt');
const util = require('util');
import getConfig from 'next/config';

const { serverRuntimeConfig } = getConfig();

export { jwtMiddleware };

function jwtMiddleware(req, res) {
   const middleware = jwt({ secret: serverRuntimeConfig.secret, algorithms: ['HS256'] }).unless({
      path: [
          // public routes that don't require authentication
          '/api/users/register',
          '/api/users/authenticate'
      ]
  });

  return util.promisify(middleware)(req, res);
}
