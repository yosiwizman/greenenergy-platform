import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PNG_1X1_TRANSPARENT_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAp7W6AAAAABJRU5ErkJggg==';

const pngBytes = Buffer.from(PNG_1X1_TRANSPARENT_BASE64, 'base64');

// Build a minimal ICO file that embeds a PNG.
// https://en.wikipedia.org/wiki/ICO_(file_format)
const header = Buffer.alloc(6 + 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type (1 = icon)
header.writeUInt16LE(1, 4); // count

// ICONDIRENTRY (16 bytes)
header.writeUInt8(1, 6); // width
header.writeUInt8(1, 7); // height
header.writeUInt8(0, 8); // color count
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // planes
header.writeUInt16LE(32, 12); // bit count
header.writeUInt32LE(pngBytes.length, 14); // bytes in resource
header.writeUInt32LE(6 + 16, 18); // image offset

const icoBytes = Buffer.concat([header, pngBytes]);

export function GET() {
  return new NextResponse(icoBytes, {
    status: 200,
    headers: {
      'content-type': 'image/x-icon',
      // Cache aggressively; content is stable.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
