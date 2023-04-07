import clientPromise from "../../../util/mongodb";


export default async (req, res) => {
    const client = await clientPromise;
    const db = await client.db(req.query.db);
    const { authenticate } = req.query;
    const ret = await db.collection("registeredUsers").findOne({ username: authenticate });
    res.json(ret);

    // // validate
    // if (!(user && bcrypt.compareSync(password, user.hash))) {
    //     throw 'Username or password is incorrect';
    // }

    // // create a jwt token that is valid for 7 days
    // const token = jwt.sign({ sub: user.id }, serverRuntimeConfig.secret, { expiresIn: '7d' });

    // // return basic user details and token
    // return res.status(200).json({
    //     id: user.id,
    //     username: user.username,
    //     firstName: user.firstName,
    //     lastName: user.lastName,
    //     token
    // });
};