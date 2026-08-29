declare module 'archiver' {
  import { Readable } from 'stream';

  interface ArchiveOptions {
    zlib?: object;
    forceLocalTime?: boolean;
    forceUTC?: boolean;
  }

  interface EntryData {
    name: string;
    date?: Date;
    stats?: any;
    [key: string]: any;
  }

  interface Archiver extends NodeJS.EventEmitter {
    append(source: Buffer | string | Readable, data: EntryData): this;
    file(sourcePath: string, data: EntryData): this;
    glob(pattern: string, options?: any, data?: EntryData): this;
    directory(dirPath: string, destPath: string, data?: EntryData): this;
    symlink(targetPath: string, relativePath: string, data?: EntryData): this;
    finalize(): Promise<void>;
    abort(): void;
    pointer(): number;
    pipe(destination: NodeJS.WritableStream): NodeJS.WritableStream;
  }

  function create(format: string, options?: ArchiveOptions): Archiver;

  namespace create {
    function zip(options?: ArchiveOptions): Archiver;
    function tar(options?: ArchiveOptions): Archiver;
  }

  export = create;
}