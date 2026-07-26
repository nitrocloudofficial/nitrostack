import { isAbsolute, relative, sep } from "path";
function createRelativePathModifier(basePath = process.cwd()) {
    const isWindows = '\\' === sep;
    const toUnix = (p)=>isWindows ? p.replace(/\\/g, '/') : p;
    const normalizedBase = toUnix(basePath);
    return async (frames)=>{
        for (const frame of frames)if (!(!frame.filename || frame.filename.startsWith('node:') || frame.filename.startsWith('data:'))) {
            if (isAbsolute(frame.filename)) frame.filename = toUnix(relative(normalizedBase, toUnix(frame.filename)));
        }
        return frames;
    };
}
export { createRelativePathModifier };
