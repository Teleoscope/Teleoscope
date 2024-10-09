import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename query parameter is missing' }, { status: 400 });
  }

  try {
    // Call the FastAPI backend to download the file
    const fastapiResponse = await fetch(`http://${process.env.RABBITMQ_HOST}:8000/download/${filename}`);

    if (fastapiResponse.status === 200) {
      const fileBlob = await fastapiResponse.blob();
      const arrayBuffer = await fileBlob.arrayBuffer();

      // Return the file as a download with appropriate headers
      return new NextResponse(Buffer.from(arrayBuffer), {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Type': 'application/octet-stream',
        },
      });
    } else {
      return NextResponse.json(
        { error: 'File not found' },
        { status: fastapiResponse.status }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error downloading file' }, { status: 500 });
  }
}
