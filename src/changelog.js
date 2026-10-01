import { readFile } from "node:fs/promises";
import path from "node:path";

/** Parse a conventional Keep a Changelog Markdown file into release sections. */
export function parseChangelog(markdown) {
  if (typeof markdown !== "string") throw new TypeError("Changelog content must be a string");
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^##\s+(.+?)\s*$/.exec(lines[index]);
    if (match) headings.push({ title: match[1], line: index });
  }

  return headings.map(({ title, line }, index) => {
    const end = headings[index + 1]?.line ?? lines.length;
    const content = lines.slice(line + 1, end);
    const link = /^\[(.+)\]:\s*(\S+)(?:\s+"([^"]*)")?\s*$/.exec(title);
    return {
      title: link?.[1] ?? title,
      version: (link?.[1] ?? title).replace(/^v(?=\d)/, ""),
      date: / - (\d{4}-\d{2}-\d{2})$/.exec(title)?.[1] ?? null,
      url: link?.[2] ?? null,
      changes: content.filter((entry) => /^\s*[-*+]\s+/.test(entry)).map((entry) => entry.replace(/^\s*[-*+]\s+/, "").trim())
    };
  });
}

export async function readChangelog(repoDir) {
  const filename = path.join(repoDir, "CHANGELOG.md");
  return parseChangelog(await readFile(filename, "utf8"));
}
