import fs from 'fs';

const nitroPkg = JSON.parse(fs.readFileSync('C:/Users/abdus/Downloads/Nitroo/package.json'));
const phalanxPkg = JSON.parse(fs.readFileSync('C:/Users/abdus/Downloads/NitroStack/phalanx/package.json'));

nitroPkg.dependencies = { ...nitroPkg.dependencies, ...phalanxPkg.dependencies };
nitroPkg.devDependencies = { ...nitroPkg.devDependencies, ...phalanxPkg.devDependencies };

nitroPkg.scripts.postbuild = "node -e \"import fs from 'fs'; fs.cpSync('src/data','dist/data',{recursive:true})\"";

fs.writeFileSync('C:/Users/abdus/Downloads/Nitroo/package.json', JSON.stringify(nitroPkg, null, 2));
