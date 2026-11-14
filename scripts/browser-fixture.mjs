import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
const route = fileURLToPath(
  new URL("../app/qa-radio/page.tsx", import.meta.url),
);
const directory = fileURLToPath(new URL("../app/qa-radio/", import.meta.url));
const source =
  '// Temporary local-only browser diagnostic. Remove before publishing.\nexport { default } from "../../scripts/browser-check";\n';
const demoRoute = fileURLToPath(new URL("../app/qa-demo/page.tsx", import.meta.url));
const demoSource = '// Temporary local-only demo. Remove before publishing.\nexport { default } from "../../scripts/demo-fixture";\n';
if (existsSync(demoRoute) && readFileSync(demoRoute, "utf8") !== demoSource)
  throw new Error("Refusing to replace an unexpected demo route.");
if (existsSync(route) && readFileSync(route, "utf8") !== source)
  throw new Error("Refusing to replace an unexpected route.");
if (process.argv.includes("--remove")) {
  if (existsSync(route)) unlinkSync(route);
  if (existsSync(demoRoute)) unlinkSync(demoRoute);
  console.log("Temporary diagnostic route removed.");
} else {
  mkdirSync(directory, { recursive: true });
  writeFileSync(route, source);
  mkdirSync(fileURLToPath(new URL("../app/qa-demo/", import.meta.url)), { recursive: true });
  writeFileSync(demoRoute, demoSource);
  console.log(
    "Local diagnostic ready at /qa-radio. Remove with node scripts/browser-fixture.mjs --remove before building.",
  );
}
