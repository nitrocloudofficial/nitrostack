import fs from 'fs/promises';
import path from 'path';
import { ToolDecorator as Tool, z } from '@nitrostack/core';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

async function removeDirectoryContents(directory: string) {
  try {
    const items = await fs.readdir(directory);
    await Promise.all(items.map((item) => fs.rm(path.join(directory, item), { recursive: true, force: true })));
    return true;
  } catch {
    return false;
  }
}

export class ClearTemporaryFilesTool {
  @Tool({
    name: 'clearTemporaryFiles',
    description: 'Delete temporary uploaded PDFs and extracted report data from the local workspace',
    inputSchema: z.object({}).optional()
  })
  async clearTemporaryFiles() {
    await removeDirectoryContents(UPLOAD_DIR);

    return {
      status: 'success',
      message: 'Temporary uploaded files cleared.',
      uploads_directory: UPLOAD_DIR
    };
  }
}
