import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const violations = [];
const forbiddenPath = /(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|id_rsa|id_ed25519|proof\.json)$|\.(?:pem|key|p12|pfx|sqlite3?|db|mp4|mov|jpg|png)$/i;
const rules = [
  ['wallet/address literal', /0x[a-f\d]{40}(?![a-f\d])/i],
  ['transaction/key literal', /0x[a-f\d]{64}(?![a-f\d])/i],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub credential', /(?:gh[pousr]_[A-Za-z\d]{30,}|github_pat_[A-Za-z\d_]{30,})/],
  ['service credential', /(?:sk-(?:proj-)?[A-Za-z\d_-]{24,}|AKIA[A-Z\d]{16}|art_v\d_[A-Za-z\d_]{20,})/],
  ['personal filesystem path', /\/(?:Users|home)\/[^/\s'"`]+/],
  ['private deployment identity', /appgprj_[A-Za-z\d]+|[a-z\d-]+\.chatgpt\.site/i],
];
for (const file of files) {
  if (forbiddenPath.test(file)) violations.push(`${file}: forbidden publication artifact`);
  let data;
  try {
    data = execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    violations.push(`${file}: staged content could not be read safely`);
    continue;
  }
  for (const [name, pattern] of rules) if (pattern.test(data)) violations.push(`${file}: ${name}`);
}
if (violations.length) {
  // Never print matched values: diagnostics themselves must not disclose secrets.
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else console.log(`Publication scan passed: ${files.length} tracked files; no prohibited literals or artifacts.`);
