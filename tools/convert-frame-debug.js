const fs = require('fs');
const path = require('path');
const JimpModule = require('jimp');

const repoRoot = path.resolve(__dirname, '..');
const assetsPath = path.join(repoRoot, 'lib', 'assets.js');

const s = fs.readFileSync(assetsPath, 'utf8');
const marker = 'export const FACTURE_FRAME_BASE64';
const idx = s.indexOf(marker);
console.log('marker idx', idx);
const after = s.slice(idx);
const firstQuote = after.indexOf('"');
const lastQuote = after.indexOf('"', firstQuote + 1);
console.log('firstQuote', firstQuote, 'lastQuote', lastQuote);
const oldData = after.slice(firstQuote+1, lastQuote);
console.log('oldData startsWith', oldData.slice(0,30));
console.log('oldData length', oldData.length);

const base64 = oldData.split(',')[1];
const buf = Buffer.from(base64, 'base64');
(async ()=>{
  const img = await JimpModule.Jimp.read(buf);
  console.log('img size', img.bitmap.width, img.bitmap.height);
  const newBuf = await new Promise((resolve,reject)=> img.getBuffer('image/png', (err,b)=> err?reject(err):resolve(b)));
  const newDataUri = 'data:image/png;base64,' + newBuf.toString('base64');
  const newS = s.slice(0, idx + firstQuote + 1) + newDataUri + s.slice(idx + lastQuote);
  console.log('newS contains png?', newS.indexOf('data:image/png;base64,') !== -1);
  // DO NOT write file in debug run
})();
