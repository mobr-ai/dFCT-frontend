import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const here = path.dirname(
  fileURLToPath(import.meta.url),
);

const source = fs.readFileSync(
  path.join(
    here,
    "pages",
    "TopicSubmissionPage.jsx",
  ),
  "utf8",
);


test(
  "topic composer sends unauthenticated users through login and returns to submit",
  () => {
    assert.match(
      source,
      /import\s*\{\s*loginPathForReturnTo\s*\}\s*from\s*["']\.\.\/auth\/safeReturnPath["']/,
    );

    assert.match(
      source,
      /loginPathForReturnTo\(["']\/submit["']\)/,
    );

    assert.match(
      source,
      /navigate\(\s*loginPathForReturnTo\(["']\/submit["']\),\s*\{\s*replace:\s*true\s*\}\s*\)/s,
    );

    assert.doesNotMatch(
      source,
      /if\s*\(!user\)\s*navigate\(["']\/["']\)/,
    );
  },
);
