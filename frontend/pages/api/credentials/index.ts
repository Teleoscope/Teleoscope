import bcrypt from 'bcryptjs';
import { MongoClient } from "mongodb";

export default async (req, res) => {

  try {
    const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
    const db = client.db("users");

    const credentials = req.body;

    const user = await db.collection("users").findOne({ username: credentials.username });


    if (user) {
      const compare = await bcrypt.compare(credentials.password, user.password);
      if (compare) {
        client.close();
        return res.json({
          "username": user.username,
          "id": user._id.toString(), // Ensure consistent string ID representation
        });
      } else {
        client.close();
        return res.status(401).send('Unauthorized'); // Correctly end the response with a message
      }
    } else {
      const saltRounds = 10;  
      const salt = await bcrypt.genSalt(saltRounds);
      const hash = await bcrypt.hash(credentials.password, salt);

      const newUser = await db.collection("users").insertOne({ 
        username: credentials.username,
        password: hash,
      });
      client.close();
      return res.json({
        "username": credentials.username,
        "id": newUser.insertedId.toString(),
      });
    }
  } catch (error) {
    console.error("Error:", error);
    // It's generally not a good idea to send the error message directly to the client,
    // especially in production, as it can expose internals. Consider a generic message instead.
    return res.status(500).send('An error occurred');
  }
};
