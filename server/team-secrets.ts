// Decrypts the committed .env.team. The key is DOTENV_PRIVATE_KEY_TEAM, from the environment
// (Vercel) or the git-ignored .env.keys (laptops). Without it, nothing is returned.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@dotenvx/dotenvx";

export function teamSecrets(root = process.cwd()): Record<string, string> {
  const file = join(root, ".env.team");
  if (!existsSync(file)) return {};
  const keysFile = join(root, ".env.keys");
  const privateKey =
    process.env.DOTENV_PRIVATE_KEY_TEAM ||
    (existsSync(keysFile) ? /^DOTENV_PRIVATE_KEY_TEAM=["']?([^"'\s]+)/m.exec(readFileSync(keysFile, "utf8"))?.[1] : undefined);
  if (!privateKey) return {};
  const values = parse(readFileSync(file, "utf8"), { privateKey }) as Record<string, string>;
  return Object.fromEntries(Object.entries(values).filter(([name, value]) => value && !value.startsWith("encrypted:") && !name.startsWith("DOTENV_PUBLIC_KEY")));
}
