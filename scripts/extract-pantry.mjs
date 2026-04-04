import fs from "fs";
const html = fs.readFileSync("public/index.html", "utf8");
const start = html.indexOf("const FULL_PANTRY = [");
const end = html.indexOf("\n];", start);
const block = html.slice(start, end);
const chunks = block.split(/\},\s*\n/).map((s) => s.trim().replace(/^\{/, "{"));
const items = [];
for (const ch of chunks) {
  if (!ch.includes("name:")) continue;
  const idm = ch.match(/id:(\d+)/);
  const nm = ch.match(/name:"([^"]*)"/);
  const cm = ch.match(/cat:"([^"]*)"/);
  if (idm && nm && cm) items.push({ id: +idm[1], name: nm[1], cat: cm[1] });
}
items.sort((a, b) => a.id - b.id);
console.log(JSON.stringify({ count: items.length, first: items[0], last: items.at(-1) }));
