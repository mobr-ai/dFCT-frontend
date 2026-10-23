import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const ROOT = process.cwd();

const read = (relative) =>
  fs.readFileSync(
    path.join(ROOT, relative),
    "utf8",
  );


test("registers the claim route", () => {
  const source = read("src/index.jsx");

  assert.match(
    source,
    /path: "\/instant-assessments\/:publicId\/claim"/,
  );
  assert.match(
    source,
    /<InstantAssessmentClaimPage \/>/,
  );
});


test("preserves only safe internal return paths", () => {
  const indexSource = read("src/index.jsx");
  const authSource = read("src/pages/AuthPage.jsx");
  const helperSource = read(
    "src/auth/safeReturnPath.js",
  );

  assert.match(
    indexSource,
    /safeInternalReturnPath\(options\?\.returnTo\)/,
  );
  assert.match(
    authSource,
    /searchParams\.get\("returnTo"\)/,
  );
  assert.match(
    helperSource,
    /value\.startsWith\("\/\/"\)/,
  );
  assert.match(
    helperSource,
    /parsed\.origin !== window\.location\.origin/,
  );
});


test("continues email Google and Cardano login", () => {
  const source = read("src/pages/AuthPage.jsx");

  assert.match(source, /completeLogin\(result\)/);
  assert.match(source, /completeLogin\(apiResponse\)/);
  assert.match(source, /onLogin=\{completeLogin\}/);

  assert.doesNotMatch(source, /handleLogin\(result\)/);
  assert.doesNotMatch(source, /handleLogin\(apiResponse\)/);
});


test("redeems using the authenticated token", () => {
  const source = read(
    "src/pages/InstantAssessmentClaimPage.jsx",
  );

  assert.match(
    source,
    /Authorization: `Bearer \$\{user\.access_token\}`/,
  );
  assert.match(
    source,
    /body: JSON\.stringify\(\{ token \}\)/,
  );
  assert.match(
    source,
    /navigate\(topicPath/,
  );
});


test("contains English and Portuguese copy", () => {
  const en = JSON.parse(
    read("src/locales/en/translation.json"),
  );
  const pt = JSON.parse(
    read("src/locales/pt/translation.json"),
  );

  assert.ok(en.instantAssessmentClaim?.title);
  assert.ok(pt.instantAssessmentClaim?.title);
});
