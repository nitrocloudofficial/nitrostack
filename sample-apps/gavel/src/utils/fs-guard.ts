import * as fs from "fs/promises";
import * as path from "path";

export class GavelError extends Error {
  constructor(
    public code: "INVALID_PATH" | "NOT_A_DIRECTORY" | "PATH_NOT_FOUND",
    message: string
  ) {
    super(message);
    this.name = "GavelError";
  }
}

/**
  * Asserts that a target path exists and is a valid directory.
  * Throws GavelError if the path does not exist or is not a directory.
  */
export async function assertIsDirectory(targetPath: string): Promise<void> {
  if (!targetPath || typeof targetPath !== "string") {
    throw new GavelError("INVALID_PATH", "Project path must be a non-empty string.");
  }

  const absolutePath = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(process.cwd(), targetPath);

  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      throw new GavelError(
        "NOT_A_DIRECTORY",
        `Target path '${absolutePath}' exists but is a file, not a directory.`
      );
    }
  } catch (err: any) {
    if (err instanceof GavelError) throw err;
    if (err.code === "ENOENT") {
      throw new GavelError(
        "PATH_NOT_FOUND",
        `Target path '${absolutePath}' does not exist.`
      );
    }
    throw new GavelError("INVALID_PATH", `Cannot access path '${absolutePath}': ${err.message}`);
  }
}

/**
  * Safely reads a file with a maximum size cap (default 512KB).
  * Returns null if reading fails or file exceeds max bytes.
  */
export async function safeReadFile(filePath: string, maxBytes = 512_000): Promise<string | null> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile() || stats.size > maxBytes) {
      return null;
    }
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}
