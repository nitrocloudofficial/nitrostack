import fs from 'fs';

const imgPath = 'C:/Users/Lenovo/.gemini/antigravity/brain/5b955216-2787-4483-a419-fe1aafb5263e/clash_guide_transparent_1785021814428.jpg';
const buffer = fs.readFileSync(imgPath);
const b64 = buffer.toString('base64');
const dataUri = `data:image/jpeg;base64,${b64}`;

fs.writeFileSync('d:/yatra/yatra/src/widgets/app/OmniGame/avatar_data.ts', `export const NARRATOR_AVATAR_BASE64 = ${JSON.stringify(dataUri)};\n`);

console.log('Successfully updated avatar_data.ts with clean character image!');
