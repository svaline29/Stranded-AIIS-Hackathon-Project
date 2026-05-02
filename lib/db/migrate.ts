import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "stranded.db");
const MIGRATIONS_PATH = path.join(process.cwd(), "drizzle");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: MIGRATIONS_PATH });
console.log("Migrations applied successfully.");
sqlite.close();
