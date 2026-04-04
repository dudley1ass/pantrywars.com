import fs from "fs";

function stripInlineToolkitFields(html) {
  let i = 0;
  const parts = [];
  const startPat = ',ingredientToolkitAi:"';
  while (i < html.length) {
    const idx = html.indexOf(startPat, i);
    if (idx === -1) {
      parts.push(html.slice(i));
      break;
    }
    parts.push(html.slice(i, idx));
    let j = idx + startPat.length;
    while (j < html.length) {
      if (html[j] === "\\") {
        j += 2;
        continue;
      }
      if (html[j] === '"') break;
      j++;
    }
    const mid = '",ingredientToolkit:"';
    if (html.slice(j, j + mid.length) !== mid) {
      throw new Error("parse ingredientToolkitAi at " + idx);
    }
    j += mid.length;
    while (j < html.length) {
      if (html[j] === "\\") {
        j += 2;
        continue;
      }
      if (html[j] === '"') break;
      j++;
    }
    j++;
    i = j;
  }
  return parts.join("");
}

const gen = fs.readFileSync("scripts/generated-ingredient-toolkit.mjs", "utf8").trim();
let html = fs.readFileSync("public/index.html", "utf8");

html = stripInlineToolkitFields(html);

const needle = "const PANTRY_BY_NAME = Object.fromEntries(FULL_PANTRY.map(i => [i.name, i]));";
if (!html.includes(needle)) throw new Error("PANTRY_BY_NAME needle missing");
if (html.includes("const INGREDIENT_TOOLKIT_BY_NAME")) throw new Error("already merged");

html = html.replace(needle, needle + "\n\n" + gen + "\n");

fs.writeFileSync("public/index.html", html);
console.log("Merged INGREDIENT_TOOLKIT_BY_NAME and stripped inline toolkit fields.");
