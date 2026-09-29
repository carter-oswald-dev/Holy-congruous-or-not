#!/usr/bin/env node
// Usage: node build-wordlist.js –verses-only=douay-rheims kjv=pg10.txt web=pg8294.txt douay-rheims=pg1581.txt
// Each argument is  id=path/to/gutenberg.txt  (or just a path, id = file name).
// Writes words-<id>.json (unique words, most used first) for each Bible,
// plus bibles.json, the menu the page reads.

const fs = require(‘fs’);
const path = require(‘path’);

// Optional: –verses-only=id1,id2  keeps only paragraphs that start with
// “chapter:verse.” (drops commentary/annotations, e.g. Challoner’s notes in Douay-Rheims).
const versesOnly = new Set();
const args = process.argv.slice(2).filter(a => {
if (a.startsWith(’–verses-only=’)) { a.slice(14).split(’,’).forEach(x => versesOnly.add(x)); return false; }
return true;
});
if (!args.length) {
console.error(‘Usage: node build-wordlist.js id=file.txt [id=file.txt …]’);
process.exit(1);
}

// Must match the tokenizer in index.html
function tokens(s) {
return s.normalize(‘NFKC’).toLowerCase().replace(/[\u2018\u2019`]/g, “’”)
.match(/\p{L}+(?:’\p{L}+)*/gu) || [];
}

function keepVerses(text) {
return text.split(/\r?\n\s*\r?\n/).filter(p => /^\s*\d+:\d+./.test(p)).join(’\n\n’);
}

function stripGutenberg(text) {
const start = text.match(/***\s*START OF[^\n]*\n/i);
if (start) text = text.slice(start.index + start[0].length);
const end = text.search(/***\s*END OF/i);
if (end !== -1) text = text.slice(0, end);
return text;
}

const menu = [];
for (const arg of args) {
const eq = arg.indexOf(’=’);
const file = eq === -1 ? arg : arg.slice(eq + 1);
const id = eq === -1 ? path.basename(file, path.extname(file)) : arg.slice(0, eq);

const raw = fs.readFileSync(file, ‘utf8’);
const title = (raw.match(/eBook of ([^\r\n]+)/i) || [])[1] || id;
let body = stripGutenberg(raw);
if (versesOnly.has(id)) body = keepVerses(body);
const words = tokens(body);

const counts = new Map();
for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
const sorted = […counts.entries()]
.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
.map(([w]) => w);

const out = ‘words-’ + id + ‘.json’;
fs.writeFileSync(out, JSON.stringify({ id, title, totalWords: words.length, words: sorted }));
menu.push({ id, title, file: out, totalWords: words.length, uniqueWords: sorted.length });
console.log(id + ‘: ’ + words.length.toLocaleString() + ’ words, ’ + sorted.length.toLocaleString() + ’ unique’);
}
fs.writeFileSync(‘bibles.json’, JSON.stringify(menu, null, 1));