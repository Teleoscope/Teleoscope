import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const secret = process.env.WEBHOOK_SECRET || 'webhook-secret';
const logFilePath = path.join(process.cwd(), 'hookbuild.log');
const build_command = process.env.BUILD_COMMAND || 'echo $(date) BUILD >> hookbuild.log';
const git_pull_command = process.env.PULL_COMMAND || 'echo $(date) GIT PULL >> hookbuild.log'; 
const restart_command = process.env.RESTART_COMMAND ||  'echo $(date) RESTART >> hookbuild.log';


// Utility function to log messages
const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  console.log(logMessage);  // For debugging
  fs.appendFileSync(logFilePath, logMessage, { encoding: 'utf8' });
};

// Verify the signature for security
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
  const body = await request.text();
  if (!verifySignature(request, body)) {
    logToFile('Invalid signature attempt');
    return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
  }

  const event = request.headers.get('x-github-event');

  // Handle the push event
  if (event === 'push') {
    const { ref } = JSON.parse(body);

    // Check if it's the frontend branch
    if (ref === 'refs/heads/frontend') {
      try {
        // Step 1: Pull the latest code
        logToFile('Starting git pull...');
        const { stdout: gitPullOut, stderr: gitPullErr } = await execAsync(git_pull_command);
        logToFile(`Git pull stdout: ${gitPullOut}`);
        logToFile(`Git pull stderr: ${gitPullErr}`);

        // Proceed even if there's non-critical output in stderr
        if (gitPullErr) {
          logToFile(`Git pull warnings: ${gitPullErr}`);  // Only log it, don't stop the process
        }

        // Step 2: Run the build
        logToFile('Starting build process...');
        const { stdout: buildOut, stderr: buildErr } = await execAsync(build_command);
        logToFile(`Build stdout: ${buildOut}`);
        if (buildErr) {
          logToFile(`Build stderr: ${buildErr}`);
          return NextResponse.json({ message: 'Build failed' }, { status: 500 });
        }

        // Step 3: Restart the application if the build was successful
        logToFile('Build successful, restarting frontend...');
        const { stdout: restartOut, stderr: restartErr } = await execAsync(restart_command);
        logToFile(`PM2 restart stdout: ${restartOut}`);
        if (restartErr) {
          logToFile(`PM2 restart stderr: ${restartErr}`);
          return NextResponse.json({ message: 'Restart failed' }, { status: 500 });
        }

        logToFile('Frontend restarted successfully');
        return NextResponse.json({ message: 'Rebuild and restart successful' }, { status: 200 });

      } catch (error: any) {
        const errorMessage = `Error during process: ${error.message}`;
        logToFile(errorMessage);
        return NextResponse.json({ message: 'Error during rebuild and restart process' }, { status: 500 });
      }
    } else {
      logToFile(`Push event not on frontend branch: ${ref}`);
      return NextResponse.json({ message: 'Not the frontend branch' }, { status: 200 });
    }
  } else {
    logToFile(`Unhandled GitHub event: ${event}`);
    return NextResponse.json({ message: 'Not a push event' }, { status: 400 });
  }
}