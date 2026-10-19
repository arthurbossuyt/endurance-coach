// Shared athlete-home helpers for scripts/leak-scan and scripts/validate.mjs.
//
// An athlete home holds profile.yaml, plans/<id>/plan.yaml and an optional
// session-log.yaml. <home> = the given path, else $ENDURANCE_COACH_HOME,
// else ~/.endurance-coach.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const yaml = require("js-yaml");

function homeDir(arg) {
  return path.resolve(
    arg || process.env.ENDURANCE_COACH_HOME || path.join(os.homedir(), ".endurance-coach")
  );
}

// [{ id, file }] for every plans/<id>/plan.yaml, sorted by id.
function planFiles(home) {
  const dir = path.join(home, "plans");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .sort()
    .map((id) => ({ id, file: path.join(dir, id, "plan.yaml") }))
    .filter(({ file }) => fs.existsSync(file));
}

// CORE_SCHEMA keeps dates as strings, so format: date applies and values
// match the text they came from.
function loadYaml(file) {
  return yaml.load(fs.readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
}

module.exports = { homeDir, planFiles, loadYaml };
