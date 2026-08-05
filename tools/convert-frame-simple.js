const fs = require('fs');
const path = require('path');
const JimpModule = require('jimp');

const repoRoot = path.resolve(__dirname, '..');
const assetsPath = path.join(repoRoot, 'lib', 'assets.js');
const pagePath = path.join(repoRoot, 'app', 'page.jsx');

function extractDataUriSimple(content, name) {
  const marker = 'export const ' + name;
  const idx = content.indexOf(marker);
  if (idx === -1) return null;
  const after = content.slice(idx);
  const firstQuote = after.indexOf('"');
  const lastQuote = after.indexOf('"', firstQuote + 1);
  if (firstQuote === -1 || lastQuote === -1) return null;
  return after.slice(firstQuote + 1, lastQuote);
}

function replaceDataUriSimple(content, name, newDataUri) {
  const marker = 'export const ' + name;
  const idx = content.indexOf(marker);
  if (idx === -1) return content;
  const after = content.slice(idx);
  const firstQuote = after.indexOf('"');
  const lastQuote = after.indexOf('"', firstQuote + 1);
  if (firstQuote === -1 || lastQuote === -1) return content;
  const before = content.slice(0, idx + firstQuote + 1);
  const afterTail = content.slice(idx + lastQuote);
  return before + newDataUri + afterTail;
}

function extractInlineConstSimple(content, constName) {
  const marker = 'const ' + constName;
  const idx = content.indexOf(marker);
  if (idx === -1) return null;
  const after = content.slice(idx);
  const firstQuote = after.indexOf('"');
  const lastQuote = after.indexOf('"', firstQuote + 1);
  if (firstQuote === -1 || lastQuote === -1) return null;
  return after.slice(firstQuote + 1, lastQuote);
}

function replaceInlineConstSimple(content, constName, newDataUri) {
  const marker = 'const ' + constName;
  const idx = content.indexOf(marker);
  if (idx === -1) return content;
  const after = content.slice(idx);
  const firstQuote = after.indexOf('"');
  const lastQuote = after.indexOf('"', firstQuote + 1);
  if (firstQuote === -1 || lastQuote === -1) return content;
  const before = content.slice(0, idx + firstQuote + 1);
  const afterTail = content.slice(idx + lastQuote);
  return before + newDataUri + afterTail;
}

(async function(){
  try {
    const assets = fs.readFileSync(assetsPath, 'utf8');
    let dataUri = extractDataUriSimple(assets, 'FACTURE_FRAME_BASE64');
    if (!dataUri) {
      console.error('FACTURE_FRAME_BASE64 not found in lib/assets.js');
      process.exit(1);
    }
    if (!dataUri.startsWith('data:')) dataUri = 'data:' + dataUri; // safety
    console.log('Found FACTURE_FRAME_BASE64, length', dataUri.length);
    const base64 = dataUri.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    const img = await JimpModule.Jimp.read(buf);
    const w = img.bitmap.width, h = img.bitmap.height;
    console.log('Image size', w, h);

    // sample corners
    function sampleArea(x0,y0,wS,hS) {
      let r=0,g=0,b=0,c=0;
      for (let x=x0; x<x0+wS && x<w; x++){
        for (let y=y0; y<y0+hS && y<h; y++){
          const i = (w*y + x) * 4;
          r += img.bitmap.data[i];
          g += img.bitmap.data[i+1];
          b += img.bitmap.data[i+2];
          c++;
        }
      }
      return { r: Math.round(r/c), g: Math.round(g/c), b: Math.round(b/c) };
    }

    const block = Math.max(8, Math.round(Math.min(w,h) * 0.03));
    const tl = sampleArea(0,0,block,block);
    const tr = sampleArea(w-block,0,block,block);
    const bl = sampleArea(0,h-block,block,block);
    const br = sampleArea(w-block,h-block,block,block);
    const bg = {
      r: Math.round((tl.r+tr.r+bl.r+br.r)/4),
      g: Math.round((tl.g+tr.g+bl.g+br.g)/4),
      b: Math.round((tl.b+tr.b+bl.b+br.b)/4)
    };
    console.log('Detected corner-average background color', bg);

    const threshold = 40;
    const thresholdSq = threshold*threshold;

    img.scan(0,0,w,h,function(x,y,idx){
      const r = this.bitmap.data[idx+0];
      const g = this.bitmap.data[idx+1];
      const b = this.bitmap.data[idx+2];
      const da = (r-bg.r)*(r-bg.r) + (g-bg.g)*(g-bg.g) + (b-bg.b)*(b-bg.b);
      if (da <= thresholdSq) {
        this.bitmap.data[idx+3] = 0;
      }
    });

    const outBuf = await new Promise((resolve, reject) => img.getBuffer('image/png', (err, buf) => err ? reject(err) : resolve(buf)));
    const newDataUri = 'data:image/png;base64,' + outBuf.toString('base64');

    const newAssets = replaceDataUriSimple(assets, 'FACTURE_FRAME_BASE64', newDataUri);
    fs.writeFileSync(assetsPath, newAssets, 'utf8');
    console.log('Updated lib/assets.js with transparent PNG data URI');

    // try replace inline const in page.jsx named FAKHAMA_FRAME_BASE64
    let page = fs.readFileSync(pagePath, 'utf8');
    const inline = extractInlineConstSimple(page, 'FAKHAMA_FRAME_BASE64');
    if (inline) {
      page = replaceInlineConstSimple(page, 'FAKHAMA_FRAME_BASE64', newDataUri);
      fs.writeFileSync(pagePath, page, 'utf8');
      console.log('Replaced inline FAKHAMA_FRAME_BASE64 in app/page.jsx');
    } else {
      console.log('No inline FAKHAMA_FRAME_BASE64 found in page.jsx — skipping');
    }

    console.log('Conversion completed successfully.');
  } catch (err) {
    console.error('Error during conversion:', err);
    process.exit(1);
  }
})();
