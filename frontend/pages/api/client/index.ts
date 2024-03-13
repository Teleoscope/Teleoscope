// Define the handler function as an async function
import withSecureSession from "@/util/withSecureSession";
import send from '@/util/amqp';

const handler = async (req, res, session) => {
    // Only allow POST method
    if (req.method !== 'POST') {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
    await send(req.body.task, req.body.args)
    return res.status(200).json({message: "Post to client completed."})
}  

export default withSecureSession(handler)