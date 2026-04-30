import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          'Image upload is not configured (set BLOB_READ_WRITE_TOKEN — use `vercel env pull` or the Vercel dashboard).',
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, WebP, or GIF images are allowed.' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Image must be 5 MB or smaller.' },
      { status: 400 },
    );
  }

  const ext = MIME_TO_EXT[file.type] ?? '.img';
  const pathname = `survey-app/shop-images/${crypto.randomUUID()}${ext}`;

  try {
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    if (
      message.includes('private store') &&
      message.includes('public access')
    ) {
      return NextResponse.json(
        {
          error:
            'Your Vercel Blob store is private-only; this app uploads public shop images. In Vercel: Storage → create a Blob store that allows public access, connect it to the project, then update BLOB_READ_WRITE_TOKEN (vercel env pull / dashboard env).',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
