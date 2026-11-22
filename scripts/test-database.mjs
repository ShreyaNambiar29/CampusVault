import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const name = `campusvault_test_${randomUUID().replaceAll("-", "")}`;
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0)
    throw new Error(
      result.stderr || result.error?.message || `${command} failed`,
    );
  return result.stdout;
};
// Local socket only. Inline migrations without transaction boundaries so every test role/schema rolls back.
const input = readFileSync("tests/database.sql", "utf8")
  .split("\n")
  .map((line) =>
    line.startsWith("\\ir ../")
      ? readFileSync(line.slice(7), "utf8").replace(/^begin;|^commit;/gim, "")
      : line,
  )
  .join("\n");
run("createdb", ["-h", "/tmp", name]);
try {
  console.log(
    run(
      "psql",
      ["-h", "/tmp", "-X", "-v", "ON_ERROR_STOP=1", "-q", "-d", name],
      { input: "BEGIN;\n" + input + "\nROLLBACK;\n" },
    ),
  );
} finally {
  run("dropdb", ["-h", "/tmp", name]);
}
