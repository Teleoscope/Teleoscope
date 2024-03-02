
// Import necessary modules
import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';


import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";


export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    res.status(401).json({ message: "You must be logged in." });
    return;
  }

  const data = await req.formData()
  const file: File | null = data.get('file') as unknown as File
  
    if (!file) {
      return NextResponse.json({ success: false })
    }
  
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
  
    // With the file data in the buffer, you can do whatever you want with it.
    // For this, we'll just write it to the filesystem in a new location
    const path = `/tmp/${file.name}`
    await writeFile(path, buffer)
    console.log(`open ${path} to see the uploaded file`)
  
    return NextResponse.json({ success: true })

}
