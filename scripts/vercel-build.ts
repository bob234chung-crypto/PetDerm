import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, CI: "1" },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");
const databaseUrl = process.env.DATABASE_URL ?? "";
if (!process.env.DIRECT_URL && process.env.DATABASE_URL_UNPOOLED) {
  process.env.DIRECT_URL = process.env.DATABASE_URL_UNPOOLED;
}

if (databaseUrl.startsWith("postgres")) {
  let schema = readFileSync(schemaPath, "utf8");
  schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
  if (process.env.DIRECT_URL && !schema.includes("directUrl")) {
    schema = schema.replace(
      'url      = env("DATABASE_URL")',
      'url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")',
    );
  }
  writeFileSync(schemaPath, schema);
  console.log("Prisma provider patched to postgresql for Vercel");
}

run("npx", ["prisma", "generate"]);
if (databaseUrl.startsWith("postgres")) {
  run("npx", ["prisma", "db", "push"]);
}
run("npx", ["tsx", "scripts/fetch-model.ts"]);
run("npx", ["next", "build"]);
