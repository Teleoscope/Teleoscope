import clientPromise from "@/util/mongodb";
import amqplib from 'amqplib';
import bcrypt from 'bcrypt';

async function send(body, mid) {
  const rabbitmqServerUrl = `amqp://${process.env.NEXT_PUBLIC_RABBITMQ_USERNAME}:${process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD}@${process.env.NEXT_PUBLIC_RABBITMQ_HOST}:/teleoscope`;
  const dispatchQueue = 'dispatch_queue';
  const responseQueue = mid;

  try {
    const connection = await amqplib.connect(rabbitmqServerUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(dispatchQueue);

    const consumePromise = new Promise((resolve) => {
      channel.consume(responseQueue, (msg) => {
        const response = msg.content.toString();

        channel.ack(msg);
        resolve(response);
      });
    });

    const message = JSON.stringify(body);
    channel.sendToQueue(dispatchQueue, Buffer.from(message));
    const response = await consumePromise;

    await channel.close();
    await connection.close();

    return response;
  } catch (error) {
    console.log('Failed to send.', error);
    return undefined;
  }
}

export default async (req, res) => {


  const saltRounds = 10;
  
  const client = await clientPromise;
  const credentials = req.body;


  const db = await client.db("users");
  
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
     const body = {
      task: "register_account",
      message_id: credentials.username,
      args: {
        username: credentials.username,
        password: hash
      }
     }
     try {
      const response = await send(body, credentials.username);
      const newUser = await db.collection("users").findOne({ username: credentials.username })
      ret = {
        "username": newUser.username,
        "id": newUser._id,
      }
    } catch (error) {
      console.log('Failed to send.', error);
      res.json(ret);
    }
  }

  res.json(ret);
};
