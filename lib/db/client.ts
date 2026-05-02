import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "stranded.db");

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better read/write concurrency during development
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
