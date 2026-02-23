import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

export function readJson<T>(fileName: string, fallback: T): T {
  const filePath = path.join(dataDir, fileName);
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(fileName: string, data: T) {
  const filePath = path.join(dataDir, fileName);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
