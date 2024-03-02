// Import necessary modules
import { promises as fs } from 'fs';
import formidable from 'formidable';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth/next';

// Disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    res.status(401).json({ message: "You must be logged in." });
    return;
  }

  const data = await new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });

  const file = data.files.file;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const fileContent = await fs.readFile(file.filepath);
  const path = `/tmp/${file.originalFilename}`;
  await fs.writeFile(path, fileContent);
  console.log(`open ${path} to see the uploaded file`);

  return res.status(200).json({ success: true });
}
