function authToken(apiMethod) {
    return async (req, res) => {
        // const token = req.headers.token;
        // if (!token) {
        //     // res.status(302).json({ message: "Invalid token" });
        //     // res.redirect(307, '/account/login');
        //     res.setHeader('Location', '/account/login');
        //     res.statusCode = 302;
        //     res.end();
        //     return;
        // }
        // await apiMethod(req, res);
        res.setHeader('Location', '/account/login');
        res.statusCode = 302;
        res.end();
        return;
    };
  }
  
export default authToken;