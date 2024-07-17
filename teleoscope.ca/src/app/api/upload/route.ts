import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import send from "@/lib/amqp";
import { validateRequest } from "@/lib/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR!
const MONGODB_DATABASE = process.env.MONGODB_DATABASE!

interface FileFormData {
  file: File,
  workflow_id: string, //', workflow_id);
  workspace_id: string, //', workspace_id);
  headerLine_row: string, //', headerLine.toString());
  uid_column: string, //', uniqueId);
  title_column: string, //', title);
  text_column: string, //', text);
  group_columns: string, //', selectedHeaders.toString());
}


export const POST = async (req: NextRequest) => {
  const { user, session } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
  const formData = await req.formData();
  const body: FileFormData = Object.fromEntries(formData);

  const file = (body.file as File) || null;

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR);
    }
    const filepath = path.resolve(UPLOAD_DIR, path.parse(file.name).name + "_" + new Date().toISOString() + path.parse(file.name).ext)
    fs.writeFileSync(
      filepath,
      buffer
    );

    // userid: str,
    // workflow: str,
    // path: str, 

    // mimetype: str, 
    // headerLine: int, 
    // uniqueId: str, 
    // title: str, 
    // text: str, 
    // groups: list, **kwargs):
    send("file_upload", { 
      database: MONGODB_DATABASE,
      path: filepath, 
      userid: user.id,
      workflow: body.workflow_id,
      workspace: body.workspace_id,
      mimetype: file.type,
      headerLine: parseInt(body.headerLine_row.toString()),
      uniqueId: body.uid_column,
      title: body.title_column,
      text: body.text_column,
      groups: body.group_columns.toString().split(",")
    })

  } else {
    return NextResponse.json({
      success: false,
    });
  }

  return NextResponse.json({
    success: true,
    name: (body.file as File).name,
  });
};