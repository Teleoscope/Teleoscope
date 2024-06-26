import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const username = process.env.NEXT_PUBLIC_RABBITMQ_USERNAME
const password = process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD
const host = process.env.RABBITMQ_HOST
const port = process.env.RABBITMQ_PORT
const vhost = process.env.NEXT_PUBLIC_RABBITMQ_VHOST

const rabbitMqUrl = `amqp://${username}:${password}@${host}:${port}/${vhost}`

async function send(task, args) {
    const queue = `${process.env.NEXT_PUBLIC_RABBITMQ_QUEUE}`;
    console.log("task", task)
    console.log("args", args)
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
            args: args,
            kwargs: args,
            retries: 0,
            eta: new Date().toISOString()
        };

        const msg = JSON.stringify(message)

        // Send a message to the queue
        channel.sendToQueue(queue, Buffer.from(msg));

        await channel.close();
        await connection.close();

        console.log(`Sent ${msg} to RabbitMQ.`)
    } catch (error) {
        console.log(error)

    }
}

export default send;
