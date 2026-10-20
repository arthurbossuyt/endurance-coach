// Pure logic for scripts/parity: read a skill rule tree (directory or git
// ref), normalize its lines, take the multiset difference of two trees and
// match it against an expected-diff manifest.
//
// Nothing here prints or exits; callers get data back and errors are thrown
// as ParityError (setup problems, exit 2 in the CLI).

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const yaml = require("js-yaml");
const athleteHome = require("./athlete-home.cjs");

class ParityError extends Error {}

const SKILL_SUBDIR = "skills/endurance-coach";
const RULE_DIRS = ["references", "adapters"];

// ---- tree reading -------------------------------------------------------

// True for the files the rules diff covers, given a path relative to the
// skill root: SKILL.md, references/*.md, adapters/*.md (not recursive).
function isRuleFile(rel) {
  const parts = rel.split("/");
  if (parts.length === 1) return parts[0] === "SKILL.md";
  return parts.length === 2 && RULE_DIRS.includes(parts[0]) && parts[1].endsWith(".md");
}

function git(repo, args) {
  const r = spawnSync("git", ["-C", repo, ...args], { maxBuffer: 1 << 30 });
  return r;
}

function readDirTree(dir) {
  let root = dir;
  if (!fs.existsSync(path.join(root, "SKILL.md"))) {
    const nested = path.join(dir, SKILL_SUBDIR);
    if (fs.existsSync(path.join(nested, "SKILL.md"))) root = nested;
    else throw new ParityError(`no SKILL.md in ${dir}`);
  }
  const files = [{ rel: "SKILL.md", text: fs.readFileSync(path.join(root, "SKILL.md"), "utf8") }];
  for (const sub of RULE_DIRS) {
    const d = path.join(root, sub);
    if (!fs.existsSync(d)) continue;
    for (const name of fs.readdirSync(d).sort()) {
      const rel = `${sub}/${name}`;
      const full = path.join(d, name);
      if (isRuleFile(rel) && fs.statSync(full).isFile()) {
        files.push({ rel, text: fs.readFileSync(full, "utf8") });
      }
    }
  }
  return { label: root, files };
}

function readGitTree(repo, ref) {
  const prefix = `${SKILL_SUBDIR}/`;
  const ls = git(repo, ["ls-tree", "-r", "--name-only", ref, "--", prefix]);
  if (ls.status !== 0) throw new ParityError(`git ls-tree ${ref} failed: ${String(ls.stderr).trim()}`);
  const rels = String(ls.stdout)
    .split("\n")
    .filter(Boolean)
    .map((p) => p.slice(prefix.length))
    .filter(isRuleFile)
    .sort();
  if (!rels.includes("SKILL.md")) throw new ParityError(`no ${prefix}SKILL.md at ${ref}`);
  const files = rels.map((rel) => {
    const r = git(repo, ["show", `${ref}:${prefix}${rel}`]);
    if (r.status !== 0) throw new ParityError(`git show ${ref}:${prefix}${rel} failed`);
    return { rel, text: String(r.stdout) };
  });
  // SKILL.md first, like readDirTree.
  files.sort((a, b) => (a.rel === "SKILL.md" ? -1 : b.rel === "SKILL.md" ? 1 : a.rel < b.rel ? -1 : 1));
  return { label: `${ref}:${prefix.slice(0, -1)}`, files };
}

// spec: an existing directory (the skill root, or a repo holding
// skills/endurance-coach/), else a git ref in `repo`.
function readTree(spec, repo) {
  if (fs.existsSync(spec) && fs.statSync(spec).isDirectory()) return readDirTree(path.resolve(spec));
  const r = git(repo, ["rev-parse", "--verify", "--quiet", `${spec}^{commit}`]);
  if (r.status !== 0) throw new ParityError(`${spec} is neither a directory nor a git ref in ${repo}`);
  return readGitTree(repo, spec);
}

// ---- normalization ------------------------------------------------------

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// Reduce a relative link target to its file name, anchor kept:
// "../adapters/notion.md#x" -> "notion.md#x". Absolute paths, URLs and
// pure anchors are left alone.
function reduceTarget(target) {
  if (!target || SCHEME.test(target) || target.startsWith("#") || target.startsWith("/")) return target;
  const hash = target.indexOf("#");
  const p = hash === -1 ? target : target.slice(0, hash);
  const anchor = hash === -1 ? "" : target.slice(hash);
  const base = p.replace(/\/+$/, "").split("/").pop();
  return base + anchor;
}

// Trim, then rewrite inline link targets `](target ...)` and reference
// definitions `[label]: target`.
function normalizeLine(line) {
  let s = String(line).trim();
  s = s.replace(/\]\(([^)\s]+)/g, (_, t) => `](${reduceTarget(t)}`);
  s = s.replace(/^(\[[^\]]+\]:\s*)(\S+)/, (_, head, t) => head + reduceTarget(t));
  return s;
}

// [{ text, file, line }] for every non-blank line of the tree.
function treeLines(tree) {
  const out = [];
  for (const { rel, text } of tree.files) {
    text.split(/\r?\n/).forEach((raw, i) => {
      const t = normalizeLine(raw);
      if (t) out.push({ text: t, file: rel, line: i + 1 });
    });
  }
  return out;
}

// ---- multiset difference ------------------------------------------------

function groupByText(lines) {
  const m = new Map();
  for (const l of lines) {
    if (!m.has(l.text)) m.set(l.text, []);
    m.get(l.text).push(l);
  }
  return m;
}

// { oldOnly, newOnly }: one item per excess occurrence of a line,
// { text, file, line, of } where `of` is the total count of that line on its
// side (the excess occurrences are reported at the last positions).
function diffLines(oldLines, newLines) {
  const og = groupByText(oldLines);
  const ng = groupByText(newLines);
  const side = (mine, theirs) => {
    const out = [];
    for (const [text, locs] of mine) {
      const excess = locs.length - (theirs.get(text) || []).length;
      for (const l of locs.slice(locs.length - Math.max(excess, 0))) out.push({ ...l, of: locs.length });
    }
    return out;
  };
  return { oldOnly: side(og, ng), newOnly: side(ng, og) };
}

// ---- manifest -----------------------------------------------------------

// Manifest YAML: entries: [{ old: <line>|null, new: <line>|null, reason }].
// Lines are normalized like tree lines, so raw lines with full link paths
// can be pasted. Returns [{ index, old, new, reason }] (index is 1-based).
function loadManifest(file) {
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
  } catch (e) {
    throw new ParityError(`cannot read manifest ${file}: ${e.code || e.name}`);
  }
  return parseManifest(doc, file);
}

function parseManifest(doc, label = "manifest") {
  if (!doc || !Array.isArray(doc.entries)) throw new ParityError(`${label}: needs a top-level entries list`);
  return doc.entries.map((e, i) => {
    const where = `${label}: entry ${i + 1}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) throw new ParityError(`${where} is not a mapping`);
    for (const k of Object.keys(e)) {
      if (!["old", "new", "reason"].includes(k)) throw new ParityError(`${where} has unknown key ${k}`);
    }
    for (const k of ["old", "new"]) {
      if (e[k] !== null && e[k] !== undefined && typeof e[k] !== "string") {
        throw new ParityError(`${where} key ${k} must be a string or null`);
      }
    }
    const o = e.old == null ? null : normalizeLine(e.old) || null;
    const n = e.new == null ? null : normalizeLine(e.new) || null;
    if (!o && !n) throw new ParityError(`${where} needs old or new`);
    if (typeof e.reason !== "string" || !e.reason.trim()) throw new ParityError(`${where} needs a reason`);
    return { index: i + 1, old: o, new: n, reason: e.reason.trim() };
  });
}

// Match diff lines against entries. Each entry maps one occurrence of each
// of its non-null sides, and only when all of them are still unmapped
// (a reword entry with one side missing maps nothing). Paired entries are
// matched before one-sided ones.
// Returns { mapped: [{ entry, old, new }], unmappedOld, unmappedNew, unused }.
function applyManifest(diff, entries) {
  const pool = (items) => {
    const m = new Map();
    for (const it of items) {
      if (!m.has(it.text)) m.set(it.text, []);
      m.get(it.text).push(it);
    }
    return m;
  };
  const oldPool = pool(diff.oldOnly);
  const newPool = pool(diff.newOnly);
  const has = (p, t) => t === null || (p.get(t) || []).length > 0;
  const take = (p, t) => (t === null ? null : p.get(t).shift());

  const ordered = [...entries.filter((e) => e.old && e.new), ...entries.filter((e) => !(e.old && e.new))];
  const mapped = [];
  const unused = [];
  for (const e of ordered) {
    if (has(oldPool, e.old) && has(newPool, e.new)) {
      mapped.push({ entry: e, old: take(oldPool, e.old), new: take(newPool, e.new) });
    } else {
      unused.push(e);
    }
  }
  const rest = (p) => [...p.values()].flat();
  const byPos = (a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1);
  mapped.sort((a, b) => a.entry.index - b.entry.index);
  unused.sort((a, b) => a.index - b.index);
  return {
    mapped,
    unmappedOld: rest(oldPool).sort(byPos),
    unmappedNew: rest(newPool).sort(byPos),
    unused,
  };
}

// Full rules check. opts: { old, new, manifest (path or null), repo }.
// Returns { oldLabel, newLabel, result, ok }.
function runRules(opts) {
  const oldTree = readTree(opts.old, opts.repo);
  const newTree = readTree(opts.new, opts.repo);
  const entries = opts.manifest ? loadManifest(opts.manifest) : [];
  const diff = diffLines(treeLines(oldTree), treeLines(newTree));
  const result = applyManifest(diff, entries);
  const ok = !result.unmappedOld.length && !result.unmappedNew.length && !result.unused.length;
  return { oldLabel: oldTree.label, newLabel: newTree.label, oldTree, newTree, result, ok };
}

// ---- answers ------------------------------------------------------------

const QUESTIONS = [1, 2, 3, 4, 5];
const ANSWER_KEYS = ["session", "intensity", "fuel.before", "fuel.during", "fuel.after", "fuel.log", "shoe"];

// Parse one answers file: blocks `## Q1`..`## Q5`, each with `- key: value`
// lines. Returns { answers: { <n>: { <key>: <trimmed value> } }, problems }
// where problems are value-free strings ("Q2 missing block", "Q3 fuel.log
// missing key", "Q1 shoe duplicate key", "Q4 foo unknown key").
function parseAnswers(text) {
  const answers = {};
  const problems = [];
  let cur = null;
  let curN = 0;
  for (const raw of text.split(/\r?\n/)) {
    const h = /^##\s+Q(\d+)\s*$/.exec(raw.trim());
    if (h) {
      const n = Number(h[1]);
      if (!QUESTIONS.includes(n)) {
        cur = null;
        problems.push(`Q${n} unknown block`);
      } else if (answers[n]) {
        cur = null;
        problems.push(`Q${n} duplicate block`);
      } else {
        cur = answers[n] = {};
        curN = n;
      }
      continue;
    }
    if (!cur) continue;
    const m = /^\s*-\s+([A-Za-z_.]+)\s*:(.*)$/.exec(raw);
    if (!m) continue;
    const n = curN;
    if (!ANSWER_KEYS.includes(m[1])) problems.push(`Q${n} ${m[1]} unknown key`);
    else if (m[1] in cur) problems.push(`Q${n} ${m[1]} duplicate key`);
    else {
      cur[m[1]] = m[2].trim();
      if (!cur[m[1]]) problems.push(`Q${n} ${m[1]} empty value`);
    }
  }
  for (const n of QUESTIONS) {
    if (!answers[n]) {
      problems.push(`Q${n} missing block`);
      continue;
    }
    for (const k of ANSWER_KEYS) if (!(k in answers[n])) problems.push(`Q${n} ${k} missing key`);
  }
  return { answers, problems };
}

// Compare <dir>/old.md and <dir>/new.md. Returns { ok, rows } where rows are
// value-free: "old.md: Q2 missing block", "new.md: Q3 fuel.log missing key",
// "Q1 fuel.during" (mismatch).
function runAnswers(dir) {
  const read = (name) => {
    const f = path.join(dir, name);
    if (!fs.existsSync(f)) throw new ParityError(`missing ${f}`);
    return parseAnswers(fs.readFileSync(f, "utf8"));
  };
  const o = read("old.md");
  const n = read("new.md");
  const rows = [];
  for (const p of o.problems) rows.push(`old.md: ${p}`);
  for (const p of n.problems) rows.push(`new.md: ${p}`);
  for (const q of QUESTIONS) {
    if (!o.answers[q] || !n.answers[q]) continue;
    for (const k of ANSWER_KEYS) {
      if (k in o.answers[q] && k in n.answers[q] && o.answers[q][k] !== n.answers[q][k]) rows.push(`Q${q} ${k}`);
    }
  }
  return { ok: rows.length === 0, rows };
}

// ---- hash stamp ---------------------------------------------------------

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

// sha256 over the tree's files: sorted relative path + content.
function treeHash(tree) {
  const h = crypto.createHash("sha256");
  for (const f of [...tree.files].sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))) {
    h.update(f.rel);
    h.update("\0");
    h.update(f.text);
    h.update("\0");
  }
  return h.digest("hex");
}

// Active plan: the only plan under <home>/plans, else the last id (plan.yaml
// carries no active marker). Returns { id, file }.
function activePlan(home) {
  const plans = athleteHome.planFiles(home);
  if (!plans.length) throw new ParityError(`no plans/<id>/plan.yaml in ${home}`);
  return plans[plans.length - 1];
}

// Hashes of the athlete files: { "profile.yaml", "plan.yaml" } plus the plan id.
function athleteHashes(home) {
  const profile = path.join(home, "profile.yaml");
  if (!fs.existsSync(profile)) throw new ParityError(`no profile.yaml in ${home}`);
  const plan = activePlan(home);
  return { planId: plan.id, profile: sha256(fs.readFileSync(profile)), plan: sha256(fs.readFileSync(plan.file)) };
}

// The run's own files: stamped so an edit after the PASS makes verify fail.
const RUN_FILES = ["old.md", "new.md", "fixture.md"];

function runFileHashes(dir) {
  const out = {};
  for (const name of RUN_FILES) {
    const f = path.join(dir, name);
    if (!fs.existsSync(f)) throw new ParityError(`missing ${f}`);
    out[name] = sha256(fs.readFileSync(f));
  }
  return out;
}

// Like runFileHashes, but a missing file hashes to "" (verify reports it as changed).
function runFileHashesSoft(dir) {
  const out = {};
  for (const name of RUN_FILES) {
    const f = path.join(dir, name);
    out[name] = fs.existsSync(f) ? sha256(fs.readFileSync(f)) : "";
  }
  return out;
}

const FENCE = "```parity-result";

function formatResult(r) {
  const lines = [
    `result: ${r.ok ? "PASS" : "FAIL"}`,
    `date: ${r.date}`,
    `old: ${r.old.spec}`,
    `old.sha256: ${r.old.hash}`,
    `new: ${r.new.spec}`,
    `new.sha256: ${r.new.hash}`,
    `home: ${r.home}`,
    `plan: ${r.planId}`,
    `profile.yaml.sha256: ${r.profile}`,
    `plan.yaml.sha256: ${r.plan}`,
    ...RUN_FILES.map((n) => `${n}.sha256: ${r.files[n]}`),
  ];
  return `# Coach parity result\n\n${FENCE}\n${lines.join("\n")}\n\`\`\`\n`;
}

function parseResult(text) {
  const m = /^```parity-result\n([\s\S]*?)\n```/m.exec(text);
  if (!m) throw new ParityError("no parity-result block in result.md");
  const kv = {};
  for (const l of m[1].split("\n")) {
    const i = l.indexOf(": ");
    if (i > 0) kv[l.slice(0, i)] = l.slice(i + 2);
  }
  for (const k of ["result", "date", "old", "old.sha256", "new", "new.sha256", "home", "plan", "profile.yaml.sha256", "plan.yaml.sha256", ...RUN_FILES.map((n) => `${n}.sha256`)]) {
    if (!kv[k]) throw new ParityError(`result.md block lacks ${k}`);
  }
  return kv;
}

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Stamp a gate run. `run` is runRules' return; specs are the --old/--new args.
function buildResult({ ok, run, oldSpec, newSpec, dir }) {
  const home = athleteHome.homeDir();
  const a = athleteHashes(home);
  return {
    ok,
    date: today(),
    old: { spec: isDirSpec(oldSpec) ? path.resolve(oldSpec) : oldSpec, hash: treeHash(run.oldTree) },
    new: { spec: isDirSpec(newSpec) ? path.resolve(newSpec) : newSpec, hash: treeHash(run.newTree) },
    home,
    planId: a.planId,
    profile: a.profile,
    plan: a.plan,
    files: runFileHashes(dir),
  };
}

function isDirSpec(s) {
  return fs.existsSync(s) && fs.statSync(s).isDirectory();
}

// Recompute the stamped hashes. Returns { ok, rows } (rows value-free).
function verifyResult(dir, repo) {
  const f = path.join(dir, "result.md");
  if (!fs.existsSync(f)) throw new ParityError(`missing ${f}`);
  const kv = parseResult(fs.readFileSync(f, "utf8"));
  const rows = [];
  if (kv.result !== "PASS") rows.push("result is not PASS");
  if (kv.date !== today()) rows.push(`result dated ${kv.date}, not today`);
  for (const side of ["old", "new"]) {
    const h = treeHash(readTree(kv[side], repo));
    if (h !== kv[`${side}.sha256`]) rows.push(`${side} rule tree changed`);
  }
  const home = path.resolve(kv.home);
  const profile = path.join(home, "profile.yaml");
  if (!fs.existsSync(profile) || sha256(fs.readFileSync(profile)) !== kv["profile.yaml.sha256"]) {
    rows.push("profile.yaml changed");
  }
  const planFile = path.join(home, "plans", kv.plan, "plan.yaml");
  if (!fs.existsSync(planFile) || sha256(fs.readFileSync(planFile)) !== kv["plan.yaml.sha256"]) {
    rows.push("plan.yaml changed");
  }
  const files = runFileHashesSoft(dir);
  for (const name of RUN_FILES) {
    if (files[name] !== kv[`${name}.sha256`]) rows.push(`${name} changed`);
  }
  return { ok: rows.length === 0, rows };
}

module.exports = {
  ParityError,
  SKILL_SUBDIR,
  isRuleFile,
  readTree,
  reduceTarget,
  normalizeLine,
  treeLines,
  diffLines,
  loadManifest,
  parseManifest,
  applyManifest,
  runRules,
  parseAnswers,
  runAnswers,
  treeHash,
  formatResult,
  buildResult,
  verifyResult,
};
