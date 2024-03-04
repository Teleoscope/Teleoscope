import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const rabbitMqUrl = `amqp://${process.env.NEXT_PUBLIC_RABBITMQ_USERNAME}:${process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD}@localhost:5672/${process.env.NEXT_PUBLIC_RABBITMQ_VHOST}`

async function send(task, args) {
    const queue = `${process.env.NEXT_PUBLIC_RABBITMQ_QUEUE}`;

    // Connect to RabbitMQ server
    const connection = await amqp.connect(rabbitMqUrl);
    const channel = await connection.createChannel();

    // Ensure the queue exists
    await channel.assertQueue(queue, {
        durable: false
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
}

export default send;
