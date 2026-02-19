import { readFile, writeFile, copyFile } from "fs/promises";

const ENV_PATH = process.env.SETUP_ENV_PATH || "/opt/op1/.env";

const VALID_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Sanitize a value for safe inclusion in a .env file.
 * Strips control characters, escapes special chars, wraps in double quotes.
 */
function sanitizeEnvValue(value: string): string {
  const cleaned = value
    .replace(/[\r\n]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  return `"${cleaned}"`;
}

/**
 * Updates specific key=value pairs in the .env file.
 * Replaces matching keys in-place, appends new keys at the end.
 * Preserves comments and ordering.
 */
export async function updateEnvFile(
  updates: Record<string, string>,
): Promise<void> {
  // Validate all keys before making any changes
  for (const key of Object.keys(updates)) {
    if (!VALID_KEY_RE.test(key)) {
      throw new Error(`Invalid environment variable key: ${key}`);
    }
  }

  let content: string;
  try {
    content = await readFile(ENV_PATH, "utf-8");
  } catch {
    throw new Error(`Cannot read .env file at ${ENV_PATH}`);
  }

  // Backup before modifying
  await copyFile(ENV_PATH, `${ENV_PATH}.bak`);

  const lines = content.split("\n");
  const updatedKeys = new Set<string>();

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) return line;

    // Match KEY=value pattern (with optional export prefix)
    const match = trimmed.match(/^(export\s+)?([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match) return line;

    const key = match[2];
    if (key in updates) {
      updatedKeys.add(key);
      const prefix = match[1] || "";
      return `${prefix}${key}=${sanitizeEnvValue(updates[key])}`;
    }
    return line;
  });

  // Append keys that weren't found in the existing file
  const newKeys = Object.entries(updates).filter(
    ([key]) => !updatedKeys.has(key),
  );
  if (newKeys.length > 0) {
    updatedLines.push(""); // blank line separator
    for (const [key, value] of newKeys) {
      updatedLines.push(`${key}=${sanitizeEnvValue(value)}`);
    }
  }

  const result = updatedLines.join("\n");

  // Sanity check: new file should not be significantly shorter than original
  if (result.length < content.length * 0.8) {
    console.error(
      `updateEnvFile: output (${result.length} bytes) much shorter than input (${content.length} bytes), aborting write`,
    );
    throw new Error("Env file update would lose content, aborting");
  }

  await writeFile(ENV_PATH, result);
}
