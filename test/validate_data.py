#!/usr/bin/env python3
"""Schema validator for data/states.json.

Run: python3 test/validate_data.py
Exit 0 = valid. Exit 1 = one or more violations (all printed, not just the first).

This is the guard that keeps unsourced claims off the page. Every provision must
carry a `source`; every explainer must carry an `annotation`. If it cannot be
attributed, it does not render as fact.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, os.pardir, "data", "states.json")

# Position of the ENACTED text relative to the CA SB 53 baseline.
TAGS = {"baseline", "copies-SB53", "weaker", "frontier-advancing", "orthogonal"}
# How the enacted text got there during passage. Orthogonal to `tag`.
TRAJECTORIES = {"ratcheted-down", "ratcheted-up"}
STATUSES = {"frontier-law", "partial", "orthogonal", "none"}
CONFIDENCES = {"high", "medium", "low", "contested"}

# The category taxonomy is fixed by the owner's 2026-07-31 ruling: nine cells, this order.
# Encoded here (not just in the JS tests) so a hand-edit to states.json cannot quietly
# reintroduce a retired cell or drop one.
EXPECTED_CATEGORIES = [
    "frontier-ai-framework",
    "transparency-reports",
    "incident-reporting",
    "whistleblower",
    "independent-verification",
    "enforcement",
    "thresholds-scoping",
    "internal-use-risk",
    "minimum-bar-standards",
]
# Deleted outright — no compressed legacy row, no remnant category, no provision tag.
RETIRED_CATEGORIES = {
    "published-safety-framework",
    "third-party-audit",
    "thresholds",
    "deployment-restraint",
    "liability",
    "researcher-safe-harbor",
    "private-right-of-action",
    "kill-switch",
}

POSTAL = re.compile(r"^[A-Z]{2}$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL = re.compile(r"^https?://")
# Provenance strings are prose that CONTAINS a URL, not a bare URL.
HAS_URL = re.compile(r"https?://")

errors = []


def err(path, msg):
    errors.append("%s: %s" % (path, msg))


def require(obj, key, path, pred=None, why=""):
    if key not in obj or obj[key] in (None, "", []):
        err(path, "missing required field %r" % key)
        return False
    if pred and not pred(obj[key]):
        err("%s.%s" % (path, key), "invalid value %r %s" % (obj[key], why))
        return False
    return True


def validate_provision(p, path):
    require(p, "summary", path)
    require(p, "tag", path, lambda v: v in TAGS, "(expected one of %s)" % sorted(TAGS))
    # The single hardest rule in the file: no claim renders as fact without a source.
    require(p, "source", path)
    require(p, "confidence", path, lambda v: v in CONFIDENCES,
            "(expected one of %s)" % sorted(CONFIDENCES))
    if "trajectory" in p and p["trajectory"] is not None:
        if p["trajectory"] not in TRAJECTORIES:
            err(path + ".trajectory", "invalid value %r" % p["trajectory"])
        if not p.get("trajectory_note"):
            err(path, "trajectory set but trajectory_note missing")
    if p.get("tag") == "orthogonal" and p.get("category") is not None:
        err(path, "orthogonal provisions must have category null (category error guard)")


def validate_bill(b, path, categories):
    require(b, "id", path)
    require(b, "name", path)
    require(b, "text_url", path, lambda v: bool(URL.match(v)), "(must be http(s) URL)")
    if b.get("signed_date") and not ISO_DATE.match(b["signed_date"]):
        err(path, "signed_date %r is not ISO YYYY-MM-DD" % b["signed_date"])

    for j, e in enumerate(b.get("explainers", [])):
        ep = "%s.explainers[%d]" % (path, j)
        require(e, "url", ep, lambda v: bool(URL.match(v)), "(must be http(s) URL)")
        # A bare link is a research artifact, not a product. Annotation is mandatory.
        require(e, "annotation", ep)

    for j, p in enumerate(b.get("provisions", [])):
        pp = "%s.provisions[%d]" % (path, j)
        validate_provision(p, pp)
        cat = p.get("category")
        if cat is not None and cat not in categories:
            err(pp, "category %r not declared in categories[]" % cat)
        if cat in RETIRED_CATEGORIES:
            err(pp, "provision still carries retired category %r" % cat)


def main():
    with open(DATA) as fh:
        d = json.load(fh)

    require(d, "last_updated", "root", lambda v: bool(ISO_DATE.match(v)))
    require(d, "maintainer", "root")

    cats = d.get("categories", [])
    if not cats:
        err("root", "categories[] is empty")
    if [c.get("category") for c in cats] != EXPECTED_CATEGORIES:
        err("root.categories", "taxonomy drift: expected %r, got %r"
            % (EXPECTED_CATEGORIES, [c.get("category") for c in cats]))
    cat_names = set()
    for i, c in enumerate(cats):
        cp = "categories[%d]" % i
        require(c, "category", cp)
        require(c, "label", cp)
        require(c, "definition", cp)
        require(c, "rationale", cp)
        cat_names.add(c.get("category"))
        # Borrowed copy must record where it came from, even though the cell does not
        # render it (owner's ruling: the citations page is the reader-facing record).
        require(c, "definition_source", cp, lambda v: bool(HAS_URL.search(v)),
                "(definition_source must carry a URL)")
        # strongest_state may be null -- that is the headline "empty cell".
        if c.get("strongest_state") is None:
            if not c.get("frontier_note"):
                err(cp, "null strongest_state requires a frontier_note explaining the gap")
        else:
            require(c, "provision_cite", cp)

    seen = set()
    for i, s in enumerate(d.get("states", [])):
        sp = "states[%d](%s)" % (i, s.get("state", "?"))
        require(s, "state", sp, lambda v: bool(POSTAL.match(v)), "(2-letter postal)")
        require(s, "state_name", sp)
        require(s, "status", sp, lambda v: v in STATUSES,
                "(expected one of %s)" % sorted(STATUSES))
        # A headline ABOUT A LAW borrows someone's words or asserts a fact about a statute,
        # so it must record its source. Unreviewed states carry a generic coverage note in
        # our own voice, which has nothing to source.
        if s.get("status") != "none":
            require(s, "headline_source", sp, lambda v: bool(HAS_URL.search(v)),
                    "(headline_source must carry a URL)")
        if s.get("state") in seen:
            err(sp, "duplicate state key")
        seen.add(s.get("state"))
        for j, b in enumerate(s.get("bills", [])):
            validate_bill(b, "%s.bills[%d]" % (sp, j), cat_names)
        if s.get("status") != "none" and not s.get("bills"):
            err(sp, "status %r but no bills listed" % s.get("status"))

    # The citations page is the provenance record for every borrowed passage on the site.
    # An entry that cannot be traced to an author and a URL is not a citation.
    cites = d.get("citations", [])
    if not cites:
        err("root", "citations[] is empty — borrowed copy needs a provenance record")
    for i, c in enumerate(cites):
        cpp = "citations[%d]" % i
        require(c, "source", cpp)
        require(c, "authors", cpp)
        require(c, "url", cpp, lambda v: bool(URL.match(v)), "(must be http(s) URL)")
        require(c, "used_in", cpp)

    if errors:
        print("FAIL (%d violation%s)" % (len(errors), "" if len(errors) == 1 else "s"))
        for e in errors:
            print("  - " + e)
        return 1
    print("PASS: %d states, %d categories, schema clean" % (len(d.get("states", [])), len(cats)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
