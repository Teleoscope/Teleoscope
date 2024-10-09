import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const secret = process.env.WEBHOOK_SECRET || 'webhook-secret';
const build_command = process.env.BUILD_COMMAND || 'echo $(date) >> hookbuild.log'; 
const logFilePath = path.join(process.cwd(), 'webhook.log');

// Utility function to log messages
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, { encoding: 'utf8' });
};

const verifySignature = (req: NextRequest, body: string) => {
  const signature = req.headers.get('x-hub-signature-256');
  if (!signature) {
    logToFile('Missing x-hub-signature-256 header');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(body).digest('hex')}`;

  // Ensure both buffers have the same length
  if (signature.length !== digest.length) {
    logToFile(`Signature length mismatch: received ${signature.length} bytes, expected ${digest.length} bytes`);
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    logToFile('Invalid request method');
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }

  const body = await request.text();
  if (!verifySignature(request, body)) {
    logToFile('Invalid signature attempt');
    return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
  }

  const event = request.headers.get('x-github-event');

  if (event === 'push') {
    const { ref } = JSON.parse(body);

    if (ref === 'refs/heads/frontend') {
      return new Promise((resolve) => {
        exec(build_command, (error, stdout, stderr) => {
          if (error) {
            const errorMessage = `Error executing command: ${error.message}`;
            logToFile(errorMessage);
            resolve(NextResponse.json({ message: 'Error during rebuild' }, { status: 500 }));
            return;
          }

          logToFile(`Rebuild triggered successfully. Output: ${stdout}, Stderr: ${stderr}`);
          resolve(NextResponse.json({ message: 'Rebuild triggered' }, { status: 200 }));
        });
      });
    } else {
      logToFile(`Push event not on frontend branch: ${ref}`);
      return NextResponse.json({ message: 'Not the frontend branch' }, { status: 200 });
    }
  } else {
    logToFile(`Unhandled GitHub event: ${event}`);
    return NextResponse.json({ message: 'Not a push event' }, { status: 400 });
  }
}
