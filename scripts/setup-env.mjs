import fs from "node:fs";
import crypto from "node:crypto";

// Never overwrite an existing configuration or print secrets to the terminal.
const file = ".env.local";
let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : fs.readFileSync(".env.example", "utf8");
const read = (key) => text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();
function set(key, value) {
  text = new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`;
}
for (const key of ["AUTH_SECRET", "MYSQL_PASSWORD", "MYSQL_ROOT_PASSWORD", "MONGO_ROOT_PASSWORD", "QDRANT_API_KEY", "SEED_ADMIN_PASSWORD", "SEED_STAFF_PASSWORD"]) {
  if (!read(key) || read(key).startsWith("replace-")) set(key, crypto.randomBytes(32).toString("hex"));
}
if (!read("MYSQL_URL") || read("MYSQL_URL") === "mysql://medmatch:medmatch@localhost:3306/medmatch") set("MYSQL_URL", `mysql://medmatch:${read("MYSQL_PASSWORD")}@localhost:3306/medmatch`);
if (!read("MONGODB_URL") || read("MONGODB_URL") === "mongodb://localhost:27017") set("MONGODB_URL", `mongodb://medmatch_root:${read("MONGO_ROOT_PASSWORD")}@localhost:27017/?authSource=admin`);
if (!read("COMPOSE_PROJECT_NAME")) set("COMPOSE_PROJECT_NAME", "medmatch");
fs.writeFileSync(file, text, { mode: 0o600 });
console.log("Local configuration is ready. Read seed account passwords in .env.local; do not commit this file. Existing database volumes keep their original credentials.");
