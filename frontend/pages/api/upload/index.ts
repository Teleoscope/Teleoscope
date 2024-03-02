// Import necessary modules
import { writeFile } from 'fs/promises';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";

// Define the handler function
async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: "You must be logged in." });
  }

  try {
    const data = await req.formData();
    const file = data.get('file');

    if (!file || typeof file === 'string') {
      return res.status(400).json({ success: false, message: 'No file uploaded or invalid file data.' });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // With the file data in the buffer, you can do whatever you want with it.
    // For this example, we'll just write it to the filesystem in a new location
    const path = `/tmp/${file.name}`;
    await writeFile(path, buffer);
    console.log(`open ${path} to see the uploaded file`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing the upload:', error);
    return res.status(500).json({ success: false, message: 'Server error processing the file.' });
  }
}

// Export the handler as the default export
export default handler;
