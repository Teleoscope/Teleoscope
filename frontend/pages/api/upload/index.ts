// Import necessary modules
import { promises as fs } from 'fs';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth/next';
import { IncomingForm } from 'formidable';
import send from '@/util/amqp';

// Disable Next.js's built-in body parser to handle 'multipart/form-data'
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define the handler function as an async function
const handler = async (req, res) => {
  // Check for the session
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    // If not authenticated, return 401 Unauthorized
    return res.status(401).json({ message: "You must be logged in." });
  } else {
    console.log(session)
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Use formidable to parse the form data
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(files)
      resolve({ fields, files });
    });
  });

  console.log(data)

  const headerLine = parseInt(data.fields.headerLine[0]);
  const uniqueId = data.fields.id[0];
  const title = data.fields.title[0];
  const text = data.fields.text[0];
  const groups = data.fields.groups[0].split(",")

  

  // Assuming files.file is an array and taking the first file
  const file = data.files.file && data.files.file.length ? data.files.file[0] : null;

  if (!file) {
    // If no file is uploaded, return an error
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  // Check for file MIME type
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // For .xlsx
    'text/csv' // For .csv
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    // If file type is not allowed, return an error
    return res.status(400).json({ success: false, message: 'Invalid file type. Only .xlsx and .csv files are allowed.' });
}

// After checking the file type and ensuring it's either .xlsx or .csv
let firstLines;
if (file.mimetype === 'text/csv') {
  firstLines = await readFirstLinesCsv(file.filepath);
} else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  firstLines = readFirstLinesXlsx(file.filepath);
}

console.log(firstLines); // Output the first few lines for debugging

  // Process the uploaded file
try {
  if (!file.filepath) { // Ensure the filepath property exists
    throw new Error('File path is undefined');
  }

  const fileData = await fs.readFile(file.filepath); // Use the correct property for the file path
  
  const path = `${process.env.FILES}/${file.newFilename}`; 
  
  await fs.writeFile(path, fileData);

  console.log(`File uploaded to ${path}`);

  const args = {
    'userid': session.user.id,
    'path': path,
    'headerLine': headerLine,
    'uniqueId': uniqueId,
    'title': title,
    'text': text,
    'groups': groups
  }

  await send('file_upload', args)
  
  return res.status(200).json({ success: true });
} catch (error) {
  console.error('Error processing the upload:', error);
  return res.status(500).json({ success: false, message: 'Server error processing the file.' });
}
};

// Export the handler as the default export
export default handler;


import readline from 'readline';
import { createReadStream } from 'fs';

async function readFirstLinesCsv(filePath, numLines = 5) {
  const stream = createReadStream(filePath);
  const reader = readline.createInterface({ input: stream });
  const lines = [];

  for await (const line of reader) {
    lines.push(line);
    if (lines.length >= numLines) break;
  }

  reader.close();
  return lines;
}


import xlsx from 'xlsx';

function readFirstLinesXlsx(filePath, numLines = 5) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  return rows.slice(0, numLines);
}