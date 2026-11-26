// Transpiles src/lib TypeScript modules with the project's TypeScript compiler so
// Node's built-in test runner can import them without a build step. This replaces
// the old regex-based type stripping, which silently broke whenever a function
// signature changed.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.resolve(here, "../../src/lib");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "shiftnote-tests-"));

/** Pure modules with no React Native / Expo imports. */
const PURE_MODULES = ["types", "ndis-catalogue", "transcript-parser"];

for (const name of PURE_MODULES) {
  const source = fs.readFileSync(path.join(libDir, `${name}.ts`), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
    fileName: `${name}.ts`,
  });
  // Point relative imports at the transpiled .mjs siblings
  const rewritten = outputText.replace(/from\s+"\.\/([\w-]+)"/g, 'from "./$1.mjs"');
  fs.writeFileSync(path.join(outDir, `${name}.mjs`), rewritten);
}

export async function loadLib(name) {
  return import(pathToFileURL(path.join(outDir, `${name}.mjs`)).href);
}
