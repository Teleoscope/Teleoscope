// authDecorator.js
import cookie from 'cookie';

var jwt = require('jsonwebtoken');

function authToken(token) {
    try {
    // decoded JWT payload
    const decoded = jwt.verify(token, `${process.env.SECRET_KEY}`);
    // a string that represents the expiration date
    const dateStr = decoded['eat'];
    // an Date object that is the expiration date set in the JWT
    const expDate = new Date(dateStr);
    // the current date
    const currDate = new Date();


    // check if the JWT is valid
    if (expDate.getTime() < currDate.getTime()) {
        return false;
    }
    return true;
    } catch(err) {
        // the JWT cannot be decoded with the SECRET_KEY, i.e. invalid
        return false;
    }
}

const authDecorator = (handler) => async (req, res) => {
    // get the cookie that contains the JWT
    const cookies = cookie.parse(req.headers.cookie);
    const token = cookies.token;

    if (process.env.NEXT_PUBLIC_NEED_AUTH == 'true' && !authToken(token)) {
        // not authorized
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // authorized, pass the request to the original handler
    return handler(req, res);
};

export default authDecorator;