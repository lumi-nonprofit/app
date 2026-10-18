// Finds Czech text in the source code. The user interface text lives in the message catalogs
// (src/i18n/locales). Code, comments and test titles are English.
//
// What the script checks:
//   app/**, src/**     every line, without quoted spans in comments (comments can quote Czech data)
//   test/**            comments and the titles of describe/it/test calls (assertions stay free)
// Czech proper nouns in the allowlist below pass. Exit code 1 lists every finding as file:line.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CZECH = /[ěščřžýáíéúůťďňĚŠČŘŽÝÁÍÉÚŮŤĎŇ]/;
const ALLOWED = [
  "Linka bezpečí",
  "Lince bezpečí",
  "Linka první psychické pomoci",
  "Linka pomoci obětem",
  "Rodičovská linka",
  "Záchranná služba",
  "Česká asociace pracovišť linek důvěry",
  "ČAPLD",
  "Přehledy",
  "Nastavení",
  "Dech naslepo",
  "Tichá louka",
  "Večerka",
  "Všímavá procházka",
  "Ohlédnutí za týdnem",
  "Krizový plán",
  "Pomoc hned",
  "Pomoc blízkému",
  "Podej telefon",
  "Napětí",
  "Útlum",
];
const QUOTED = /"[^"\n]*"|„[^“\n]*“|'[^'\n]*'|`[^`\n]*`/g;

function withoutAllowed(text) {
  let out = text;
  for (const term of ALLOWED) out = out.split(term).join("");
  return out;
}

function listFiles(patterns) {
  const out = execFileSync("git", ["ls-files", "-z", "--", ...patterns], { encoding: "utf8" });
  return out.split("\0").filter((f) => f && !f.startsWith("src/i18n/locales/"));
}

// Splits a file into code lines and comment lines. The lexer is small on purpose: it knows
// strings, template literals, line comments and block comments, which is enough for this
// repository.
function splitCodeAndComments(source) {
  const code = [];
  const comments = [];
  let i = 0;
  let line = 1;
  let codeLine = "";
  let commentLine = "";
  const flush = () => {
    code.push(codeLine);
    comments.push(commentLine);
    codeLine = "";
    commentLine = "";
    line++;
  };
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "\n") {
      flush();
      i++;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") commentLine += source[i++];
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      commentLine += "/*";
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") flush();
        else commentLine += source[i];
        i++;
      }
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      codeLine += ch;
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") {
          codeLine += source[i] + (source[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (source[i] === "\n") flush();
        else codeLine += source[i];
        i++;
      }
      codeLine += source[i] ?? "";
      i++;
      continue;
    }
    codeLine += ch;
    i++;
  }
  flush();
  return { code, comments };
}

const findings = [];

for (const file of listFiles(["app/*", "app/**", "src/**"])) {
  if (!/\.(ts|tsx|js|mjs|cjs)$/.test(file)) continue;
  const { code, comments } = splitCodeAndComments(readFileSync(file, "utf8"));
  code.forEach((text, index) => {
    if (CZECH.test(withoutAllowed(text))) findings.push(`${file}:${index + 1}: Czech text in code`);
  });
  comments.forEach((text, index) => {
    const prose = withoutAllowed(text.replace(QUOTED, ""));
    if (CZECH.test(prose)) findings.push(`${file}:${index + 1}: Czech text in a comment`);
  });
}

const TITLE = /\b(?:describe|it|test)(?:\.(?:each|only|skip))?\s*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
for (const file of listFiles(["test/**"])) {
  if (!/\.(ts|tsx|js|mjs|cjs)$/.test(file)) continue;
  const source = readFileSync(file, "utf8");
  const { comments } = splitCodeAndComments(source);
  comments.forEach((text, index) => {
    const prose = withoutAllowed(text.replace(QUOTED, ""));
    if (CZECH.test(prose)) findings.push(`${file}:${index + 1}: Czech text in a comment`);
  });
  for (const match of source.matchAll(TITLE)) {
    if (CZECH.test(withoutAllowed(match[2]))) {
      const lineNumber = source.slice(0, match.index).split("\n").length;
      findings.push(`${file}:${lineNumber}: Czech test title`);
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join("\n"));
  console.error(`\n${findings.length} finding(s). Code, comments and test titles are English.`);
  process.exit(1);
}
console.log("No Czech text in code, comments or test titles.");
