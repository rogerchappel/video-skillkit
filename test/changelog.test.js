import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseChangelog, readChangelog } from "../src/changelog.js";

test("parses unreleased and dated Keep a Changelog sections", async () => {
  const fixture = await readFile(new URL("../fixtures/changelog/standard.md", import.meta.url), "utf8");
  assert.deepEqual(parseChangelog(fixture), [
    { title: "Unreleased", version: "Unreleased", date: null, url: null, changes: ["Add a parser.", "Fix an edge case."] },
    { title: "1.2.0 - 2026-08-14", version: "1.2.0 - 2026-08-14", date: "2026-08-14", url: null, changes: ["Ship the release."] },
    { title: "1.1.0", version: "1.1.0", date: null, url: null, changes: [] }
  ]);
});

test("accepts an empty changelog and rejects non-text input", () => {
  assert.deepEqual(parseChangelog("# Changelog\n\nNo releases yet."), []);
  assert.throws(() => parseChangelog(null), /must be a string/);
});

test("reads the conventional top-level changelog", async () => {
  const releases = await readChangelog(".");
  assert.equal(releases[0].title, "Unreleased");
  assert.ok(releases[0].changes.length > 0);
});
