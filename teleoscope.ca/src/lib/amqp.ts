import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const username = process.env.RABBITMQ_USERNAME
const password = process.env.RABBITMQ_PASSWORD
const host = process.env.RABBITMQ_HOST
const port = process.env.RABBITMQ_PORT
const vhost = process.env.RABBITMQ_VHOST
const database = process.env.MONGODB_DATABASE

const rabbitMqUrl = `amqp://${username}:${password}@${host}:${port}/${vhost}`

// RABBITMQ_DISPATCH_QUEUE is the canonical name used by the backend monitor and
// workers. RABBITMQ_QUEUE is an older alias kept for backward compatibility.
const DISPATCH_QUEUE =
    process.env.RABBITMQ_DISPATCH_QUEUE ||
    process.env.RABBITMQ_QUEUE ||
    'teleoscope-dispatch';

async function send(task: string, args: any) {
    const queue = DISPATCH_QUEUE;

    const kwargs = {
        ...args,
        database: database
    }
    // console.log("task", task)
    // console.log("kwargs", kwargs)
    try {    
        // Connect to RabbitMQ server
        const connection = await amqp.connect(rabbitMqUrl);
        const channel = await connection.createChannel();

        // Ensure the queue exists
        await channel.assertQueue(queue, {
            durable: true
        });

        const message = {
            id: uuidv4(),
            task: task,
            args: kwargs,
            kwargs: kwargs,
            retries: 0,
            eta: new Date().toISOString()
        };

        const msg = JSON.stringify(message)

        // Send a message to the queue
        channel.sendToQueue(queue, Buffer.from(msg));

        await channel.close();
        await connection.close();

        // console.log(`Sent ${msg} to RabbitMQ.`)
    } catch (error) {
        console.log(error)

    }
}

export default send;
