#!/usr/bin/env node
// Validate athlete homes against schemas/.
//
//   node scripts/validate.mjs examples        every examples/<athlete>/ folder (CI)
//   node scripts/validate.mjs local [<home>]  one real athlete home (local only, never CI);
//                                             default $ENDURANCE_COACH_HOME, else ~/.endurance-coach
//
// An athlete home holds profile.yaml, plans/<id>/plan.yaml and an optional
// session-log.yaml. Errors print the file, the key path and the rule broken,
// never the value, so running this on real data does not echo it.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import athleteHome from "./lib/athlete-home.cjs";

const { homeDir, planFiles, loadYaml } = athleteHome;

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);

const load = (name) =>
  ajv.compile(JSON.parse(readFileSync(join(repo, "schemas", `${name}.schema.json`), "utf8")));
const schemas = {
  profile: load("profile"),
  plan: load("plan"),
  sessionLog: load("session-log"),
};

let failed = 0;

function check(file, validate, label) {
  let doc;
  try {
    doc = loadYaml(file);
  } catch (err) {
    failed++;
    console.log(`FAIL ${label}: not valid YAML (line ${err.mark?.line ?? "?"})`);
    return;
  }
  if (validate(doc)) {
    console.log(`ok   ${label}`);
    return;
  }
  failed++;
  console.log(`FAIL ${label}`);
  for (const e of validate.errors) {
    console.log(`     ${e.instancePath || "/"} ${e.message}`);
  }
}

function checkHome(home, name, maskIds) {
  const profile = join(home, "profile.yaml");
  if (existsSync(profile)) {
    check(profile, schemas.profile, `${name}/profile.yaml`);
  } else {
    failed++;
    console.log(`FAIL ${name}/profile.yaml: missing`);
  }

  const plans = planFiles(home);
  if (plans.length === 0) {
    failed++;
    console.log(`FAIL ${name}/plans/<id>/plan.yaml: none found`);
  }
  plans.forEach(({ id, file }, i) => {
    // Real plan ids are personal data: print a position, not the name.
    const shown = maskIds ? `#${i + 1}` : id;
    const label = `${name}/plans/${shown}/plan.yaml`;
    check(file, schemas.plan, label);
    let doc;
    try {
      doc = loadYaml(file);
    } catch {
      return; // already reported by check()
    }
    if (doc?.id !== id) {
      failed++;
      console.log(`FAIL ${label}: id does not match its folder`);
    }
  });

  const log = join(home, "session-log.yaml");
  if (existsSync(log)) check(log, schemas.sessionLog, `${name}/session-log.yaml`);
}

const [mode, arg] = process.argv.slice(2);

if (mode === "examples") {
  const root = join(repo, "examples");
  const athletes = readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory());
  if (athletes.length === 0) {
    console.log("FAIL examples/: no athlete folders");
    process.exit(1);
  }
  for (const a of athletes) checkHome(join(root, a), relative(repo, join(root, a)), false);
} else if (mode === "local") {
  const home = homeDir(arg);
  if (!existsSync(home)) {
    console.log("FAIL <home>: folder not found (set ENDURANCE_COACH_HOME or create ~/.endurance-coach)");
    process.exit(1);
  }
  checkHome(home, "<home>", true);
} else {
  console.log("usage: validate.mjs examples | local <athlete home>");
  process.exit(2);
}

process.exit(failed ? 1 : 0);
