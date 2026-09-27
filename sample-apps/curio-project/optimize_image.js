import fs from 'fs';
import path from 'path';

// Read the original avatar JPEG
const originalPath = 'd:/yatra/yatra/public/narrator_guide_avatar.jpg';
const buffer = fs.readFileSync(originalPath);

console.log('Original image size:', buffer.length, 'bytes');

// Let's create an optimized data URI string using node
// We can also copy to public directory cleanly
const publicDest = 'd:/yatra/yatra/public/clash_guide_avatar.png';
fs.copyFileSync(originalPath, publicDest);

// Base64 string of original image
const b64 = buffer.toString('base64');
const dataUri = `data:image/jpeg;base64,${b64}`;

fs.writeFileSync('d:/yatra/yatra/src/widgets/app/OmniGame/avatar_data.ts', `export const NARRATOR_AVATAR_BASE64 = ${JSON.stringify(dataUri)};\n`);

console.log('Successfully written avatar_data.ts with exact image base64!');
