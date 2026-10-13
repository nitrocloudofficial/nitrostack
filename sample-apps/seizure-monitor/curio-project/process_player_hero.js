import fs from 'fs';
import path from 'path';

const userUploadedDir = 'C:/Users/Lenovo/.gemini/antigravity/brain/5b955216-2787-4483-a419-fe1aafb5263e/.user_uploaded';

// Find the latest uploaded player hero image
const files = fs.readdirSync(userUploadedDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
console.log('User uploaded files:', files);

// Find the latest file (starts with media__17850)
const latestPlayerImg = files[files.length - 1];
const playerImgPath = path.join(userUploadedDir, latestPlayerImg);

console.log('Using player hero image path:', playerImgPath);

const buffer = fs.readFileSync(playerImgPath);
const b64 = buffer.toString('base64');
const dataUri = `data:image/jpeg;base64,${b64}`;

fs.writeFileSync('d:/yatra/yatra/src/widgets/app/OmniGame/player_data.ts', `export const PLAYER_HERO_BASE64 = ${JSON.stringify(dataUri)};\n`);

// Also save to public directory
fs.writeFileSync('d:/yatra/yatra/public/player_hero.jpg', buffer);

console.log('Successfully generated player_data.ts and public/player_hero.jpg!');
