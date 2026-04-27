import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function configure() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    return null;
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  return true;
}

export async function POST(req: Request) {
  if (!configure()) {
    return NextResponse.json(
      { error: "Image upload is not configured (missing Cloudinary env vars)." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 5 MB or smaller." },
      { status: 400 }
    );
  }

  const folder =
    process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "survey-app/shop-images";

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (err, res) => {
          if (err || !res?.secure_url) reject(err ?? new Error("Upload failed"));
          else resolve({ secure_url: res.secure_url });
        }
      );
      stream.end(buffer);
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
