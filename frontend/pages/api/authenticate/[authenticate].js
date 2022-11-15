import clientPromise from "../../../util/mongodb";
import { ObjectId } from "bson";

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
import getConfig from 'next/config';

//import { apiHandler, usersRepo } from '../../../helpers/index';

const { serverRuntimeConfig } = getConfig();

export default async (req, res) => {
    const client = await clientPromise;
    const db = await client.db('aita');
    const { user } = req.query;
    console.log('user', ObjectId(user));
    let ret;

    ret = await db.collection("registeredUsers").findOne({firstName: user[0]});

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