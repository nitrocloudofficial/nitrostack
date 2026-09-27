import fs from 'fs';
const raw = fs.readFileSync('d:/yatra/yatra/public/avatar_base64.txt', 'utf8');
const b64 = raw.replace(/[\r\n\s]/g, '');
fs.writeFileSync('d:/yatra/yatra/src/widgets/app/OmniGame/avatar_data.ts', `export const NARRATOR_AVATAR_BASE64 = "data:image/jpeg;base64,${b64}";\n`);
console.log('Successfully generated clean avatar_data.ts!');
