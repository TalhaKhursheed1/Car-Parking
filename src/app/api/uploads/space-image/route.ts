import { NextResponse } from 'next/server';
import { Readable } from 'stream';

import { cloudinary } from '@/lib/cloudinary';
import { getSessionFromRequest } from '@/lib/auth/session';

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  const session = getSessionFromRequest<{ user?: { role?: string } }>(request);

  if (!session?.user?.role || session.user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const fileSizeMb = file.size / (1024 * 1024);
  if (fileSizeMb > MAX_FILE_SIZE_MB) {
    return NextResponse.json({ error: `File must be under ${MAX_FILE_SIZE_MB}MB` }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
      width: number;
      height: number;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'parkspace/provider-spaces',
          resource_type: 'image',
          transformation: [{ width: 1600, height: 900, crop: 'limit' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Upload failed'));
            return;
          }
          resolve(result as typeof result & { secure_url: string; public_id: string });
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });

    return NextResponse.json(
      {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Cloudinary upload failed', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
