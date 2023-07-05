import clientPromise from "@/util/mongodb";

export default async (req, res) => {


  const bcrypt = require('bcrypt');
  const saltRounds = 10;
  
  const client = await clientPromise;
  const credentials = req.body;


  const db = await client.db(credentials.database);
  
  const myPlaintextPassword = credentials.password;
  
  const user = await db
    .collection("users")
    .findOne({ username: credentials.username });
  
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(myPlaintextPassword, salt);

  console.log("authenticating...", credentials, credentials.password, salt, hash)

  let ret = { "nothing": "nothing"}
  
  if (user) {
    const compare = bcrypt.compareSync(myPlaintextPassword, user.hash);
    if (compare) {
      ret = {
        "username": user.username,
        "id": user._id,
      }
    }
  } else {
     
  }
  
  res.json(ret);
};
