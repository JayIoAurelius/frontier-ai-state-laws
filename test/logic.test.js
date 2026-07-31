// Tests for the pure logic layer in app.js.
// Run: node --test test/logic.test.js
// These run against the REAL data file, so a data regression fails the build too.
// Taxonomy assertions (the nine-category ruling) live in test/taxonomy.test.js;
// rendering assertions live in test/render.test.js. Both are REQUIRED at the bottom of
// this file on purpose: the project's one documented command is
// `node --test test/logic.test.js`, and a suite that silently skips two thirds of its
// assertions is worse than no suite. Requiring them registers their tests in this run.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "states.json"), "utf8"));


// app.js is written for the browser; load it in a sandbox with a stub document
// so the pure functions can be exercised without a DOM.
const sandbox = {
  window: {},
  document: { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} },
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), sandbox);
const L = sandbox.window.Lawmap;

test("exposes the logic API", () => {
  for (const fn of ["parseHash", "stateByKey", "statusClass", "categoryRows", "provisionsFor", "ratchetedDown", "isEmptyCell", "reviewedStates"]) {
    assert.strictEqual(typeof L[fn], "function", fn + " should be a function");
  }
});

// app.js is evaluated in a vm realm, so returned objects have a foreign prototype.
// Compare fields, not object identity.
function route(hash) {
  const r = L.parseHash(hash);
  return r.view + ":" + r.key;
}

test("parseHash routes to a state, case-insensitively", () => {
  assert.strictEqual(route("#/CA"), "state:CA");
  assert.strictEqual(route("#/ny"), "state:NY");
});

test("parseHash routes to the categories view", () => {
  assert.strictEqual(route("#/categories"), "categories:null");
});

// The citations record lives on its own route so the main page stays clean (owner's
// ruling 2026-07-31). It must not be mistaken for a two-letter state key.
test("parseHash routes to the citations view", () => {
  assert.strictEqual(route("#/citations"), "citations:null");
  assert.strictEqual(route("#/CITATIONS"), "citations:null");
});

test("parseHash defaults to the map for empty or junk input", () => {
  assert.strictEqual(route(""), "map:null");
  assert.strictEqual(route("#/"), "map:null");
  assert.strictEqual(route("#/NOTASTATE"), "map:null");
});

test("stateByKey finds a populated state and returns null for unknown keys", () => {
  assert.strictEqual(L.stateByKey(DATA, "CA").state_name, "California");
  assert.strictEqual(L.stateByKey(DATA, "ca").state_name, "California");
  assert.strictEqual(L.stateByKey(DATA, "ZZ"), null);
});

test("every SVG-eligible state key resolves, including unreviewed ones", () => {
  const wy = L.stateByKey(DATA, "WY");
  assert.ok(wy, "WY should exist as an unreviewed state, not be missing");
  assert.strictEqual(wy.status, "none");
  assert.strictEqual(wy.bills.length, 0);
});

test("statusClass maps each status to a distinct css class", () => {
  const seen = new Set();
  for (const s of ["frontier-law", "partial", "orthogonal", "none"]) {
    const c = L.statusClass(s);
    assert.match(c, /^st-/);
    assert.ok(!seen.has(c), "class collision for " + s);
    seen.add(c);
  }
  assert.strictEqual(L.statusClass("bogus"), L.statusClass("none"));
});

test("categoryRows returns one row per declared category, in order", () => {
  const rows = L.categoryRows(DATA);
  assert.strictEqual(rows.length, DATA.categories.length);
  assert.strictEqual(rows[0].category, DATA.categories[0].category);
});


test("transparency-reports is a CONVERGED cell — CA and NY require materially the same summaries standard (falsified-transparency fix)", () => {
  const rows = L.categoryRows(DATA);
  const tr = rows.find((r) => r.category === "transparency-reports");
  assert.strictEqual(tr.kind, "converged");
  assert.strictEqual(tr.strongest_state, null, "no state should be recorded as leading on transparency after the correction");
  assert.ok(tr.provisions.length >= 2, "transparency-reports provisions exist across states");
  const ny = tr.provisions.find((p) => p.state === "NY");
  assert.strictEqual(ny.tag, "copies-SB53", "NY's transparency provision must be retagged, not left as frontier-advancing");
});

test("provisionsFor gathers provisions across states with their state key attached", () => {
  const wb = L.provisionsFor(DATA, "whistleblower");
  const states = wb.map((p) => p.state);
  assert.ok(states.includes("CA"));
  assert.ok(states.includes("NY"), "NY's absence-of-whistleblower record must appear");
  const ny = wb.find((p) => p.state === "NY");
  assert.strictEqual(ny.tag, "weaker");
});

test("orthogonal provisions never leak into an advocacy category", () => {
  for (const c of DATA.categories) {
    for (const p of L.provisionsFor(DATA, c.category)) {
      assert.notStrictEqual(p.tag, "orthogonal", "category error: " + p.state + " in " + c.category);
    }
  }
});

test("ratchetedDown surfaces the New York reversal", () => {
  const r = L.ratchetedDown(DATA);
  assert.ok(r.length >= 3, "expected several ratcheted-down provisions");
  assert.ok(r.every((p) => p.trajectory === "ratcheted-down"));
  assert.ok(r.every((p) => p.trajectory_note), "each needs a trajectory_note");
  const deploy = r.find((p) => p.category === "minimum-bar-standards");
  assert.strictEqual(deploy.state, "NY", "the repealed prohibition now lives in the minimum-bar cell");
  assert.match(deploy.summary, /shall not deploy/);
});

test("reviewedStates lists only states with an actual record, ordered by significance", () => {
  const r = L.reviewedStates(DATA);
  const keys = r.map((s) => s.state);
  assert.strictEqual(keys.slice(0, 3).join(","), "CA,NY,IL", "frontier states lead, in the order the template spread");
  assert.ok(keys.includes("CT"), "Connecticut must be reachable — it is invisible on the map");
  assert.ok(keys.includes("CO"), "Colorado must be reachable");
  assert.ok(!keys.includes("WY"), "unreviewed states must not appear as chips");
  assert.strictEqual(keys.length, 7);
});

test("every small state with a record is reachable without clicking the map", () => {
  const chips = new Set(L.reviewedStates(DATA).map((s) => s.state));
  for (const s of DATA.states) {
    if (s.status !== "none") assert.ok(chips.has(s.state), s.state + " has a record but no chip");
  }
});

test("isEmptyCell is true only where no state leads", () => {
  assert.strictEqual(L.isEmptyCell({ strongest_state: null }), true);
  assert.strictEqual(L.isEmptyCell({ strongest_state: "IL" }), false);
});

test("pre-amendment NY explainers carry an explicit date warning", () => {
  const ny = L.stateByKey(DATA, "NY").bills[0].explainers;
  const stale = ny.filter((e) => e.date_warning);
  assert.ok(stale.length >= 2, "the Carnegie and FPF pieces predate S8828 and must be flagged");
  for (const e of stale) assert.match(e.date_warning, /PRE-AMENDMENT/);
  // And the post-amendment ones must NOT be flagged.
  const mofo = ny.find((e) => e.url.includes("mofo.com"));
  assert.ok(mofo && !mofo.date_warning);
});

test("Connecticut's signing date is resolved to a primary source, with the conflicting date explained", () => {
  const b = L.stateByKey(DATA, "CT").bills[0];
  assert.strictEqual(b.signed_date, "2026-05-27", "primary-verified per the CGA bill-status page");
  assert.match(b.signed_date_note, /RESOLVED/);
});

// NOT TESTED here (see test/render.test.js and test/taxonomy.test.js for the rest):
//   - rendered HTML and the intro copy — render.test.js covers those against a stub DOM,
//     but no test exercises real layout, CSS, or the SVG map's click/keyboard wiring.
//   - the SUBSTANCE of each cite is unverified: nothing here reads the statute.
//   - `tag` correctness (copies-SB53 vs frontier-advancing) is a judgment no test checks.
//   - federal[] items are validated for shape only; three still carry "public source pending".
test("no provision renders without a source", () => {
  for (const s of DATA.states) {
    for (const b of s.bills || []) {
      for (const p of b.provisions || []) {
        assert.ok(p.source && p.source.length > 5, s.state + " provision missing source");
      }
      for (const e of b.explainers || []) {
        assert.ok(e.annotation && e.annotation.length > 20, s.state + " explainer missing annotation");
      }
    }
  }
});

// Sibling suites, run as part of the documented command (see header note).
require("./taxonomy.test.js");
require("./render.test.js");
require("./copy.test.js");
