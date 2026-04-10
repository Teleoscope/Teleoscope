import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const username = process.env.RABBITMQ_USERNAME
const password = process.env.RABBITMQ_PASSWORD
const host = process.env.RABBITMQ_HOST
const port = process.env.RABBITMQ_PORT
const vhost = process.env.RABBITMQ_VHOST
const database = process.env.MONGODB_DATABASE

const encodedVhost = encodeURIComponent(vhost || '/');
const rabbitMqUrl = `amqp://${username}:${password}@${host}:${port}/${encodedVhost}`

// RABBITMQ_DISPATCH_QUEUE is the canonical name used by the backend monitor and
// workers. RABBITMQ_QUEUE is an older alias kept for backward compatibility.
const DISPATCH_QUEUE =
    process.env.RABBITMQ_DISPATCH_QUEUE ||
    process.env.RABBITMQ_QUEUE ||
    'teleoscope-dispatch';

const VECTORIZE_QUEUE =
    process.env.RABBITMQ_VECTORIZE_QUEUE ||
    'teleoscope-vectorize';

async function publishToQueue(queue: string, payload: unknown) {
    try {
        const connection = await amqp.connect(rabbitMqUrl);
        const channel = await connection.createChannel();

        await channel.assertQueue(queue, {
            durable: true
        });

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)));

        await channel.close();
        await connection.close();
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function send(task: string, args: any) {
    const queue = DISPATCH_QUEUE;

    const kwargs = {
        ...args,
        database: database
    }
    // console.log("task", task)
    // console.log("kwargs", kwargs)
    const message = {
        id: uuidv4(),
        task: task,
        args: kwargs,
        kwargs: kwargs,
        retries: 0,
        eta: new Date().toISOString()
    };

    await publishToQueue(queue, message);
}

export async function wakeVectorizer(workspaceId?: string | null) {
    // In the production topology, monitor.py starts the GPU EC2 when this queue
    // is non-empty. The vectorizer safely acknowledges empty document batches.
    return publishToQueue(VECTORIZE_QUEUE, {
        documents: [],
        workspace_id: workspaceId || '',
        database
    });
}

export default send;
