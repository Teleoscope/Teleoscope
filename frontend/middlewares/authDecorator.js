// authDecorator.js
import cookie from 'cookie';

var jwt = require('jsonwebtoken');

function authToken(token) {
  try {
    const decoded = jwt.verify(token, `${process.env.SECRET_KEY}`);
    const dateStr = decoded['eat'];
    const expDate = new Date(dateStr);
    const currDate = new Date();
    if (expDate.getTime() < currDate.getTime()) {
      return false;
    }
    return true;
  } catch(err) {
    return false;
  }
}

const authDecorator = (handler) => async (req, res) => {
  const cookies = cookie.parse(req.headers.cookie);
  const token = cookies.token;
  
  if (!authToken(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return handler(req, res);
};

export default authDecorator;