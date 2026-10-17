// Evidence writer for the Build node: one markdown file per spec, ending in a PASS/FAIL token line.
// Never pass secrets in `lines`.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** ./evidence at the repository root (gitignored) unless EVIDENCE_DIR names another folder. */
const DEFAULT_EVIDENCE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../evidence");

/**
 * @param {string} name   file stem and heading, e.g. "adapter"
 * @param {string} token  token prefix, e.g. "ADAPTER" -> final line "ADAPTER=PASS" | "ADAPTER=FAIL"
 * @param {boolean} passed
 * @param {string[]} lines commands run and results observed, one per entry
 * @returns {string} the path written
 */
export function writeEvidence(name, token, passed, lines) {
  const dir = process.env.EVIDENCE_DIR || DEFAULT_EVIDENCE_DIR;
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.md`);
  const body = [
    `# Evidence — ${name}`,
    "",
    `Run time: ${new Date().toISOString()}`,
    "",
    "## Commands and observed results",
    "",
    ...lines.map((line) => `- ${line}`),
    "",
    `${token}=${passed ? "PASS" : "FAIL"}`,
    "",
  ].join("\n");
  writeFileSync(file, body);
  return file;
}
