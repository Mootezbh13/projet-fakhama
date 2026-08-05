const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const repoRoot = path.resolve(__dirname, '..');
const assetsPath = path.join(repoRoot, 'lib', 'assets.js');
const pagePath = path.join(repoRoot, 'app', 'page.jsx');

function extractDataUri(content, name) {
  const re = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*"(data:[^"]+)";`);
  const m = content.match(re);
  return m ? m[1] : null;
}

function replaceDataUri(content, name, newDataUri) {
  const re = new RegExp(`(export\\s+const\\s+${name}\\s*=\\s*")[^"]+(";)`);
  return content.replace(re, `$1${newDataUri}$2`);
}

function extractInlineConst(content, constName) {
  const re = new RegExp(`const\\s+${constName}\\s*=\\s*"(data:[^"]+)"`);
  const m = content.match(re);
  return m ? m[1] : null;
}

function replaceInlineConst(content, constName, newDataUri) {
  const re = new RegExp(`(const\\s+${constName}\\s*=\\s*")[^"]+("")`);
  if (re.test(content)) return content.replace(re, `$1${newDataUri}$2`);
  // fallback: replace the first long data:image/jpeg occurrence near constName
  const idx = content.indexOf(`const ${constName}`);
  if (idx === -1) return content;
  const part = content.slice(idx, idx + 4000);
  const match = part.match(/"(data:image\/[^"]+)"/);
  if (match) {
    return content.replace(match[0], `"${newDataUri}"`);
  }
  return content;
}

(async function(){
  try {
    const assets = fs.readFileSync(assetsPath, 'utf8');
    let dataUri = extractDataUri(assets, 'FACTURE_FRAME_BASE64');
    if (!dataUri) {
      console.error('FACTURE_FRAME_BASE64 not found in lib/assets.js');
      process.exit(1);
    }
    console.log('Found FACTURE_FRAME_BASE64, length', dataUri.length);
    const base64 = dataUri.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    const img = await Jimp.read(buf);
    const w = img.bitmap.width, h = img.bitmap.height;
    console.log('Image size', w, h);

    // sample 8x8 blocks at four corners
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

    const threshold = 40; // color distance threshold - may adjust
    const thresholdSq = threshold*threshold;

    img.scan(0,0,w,h,function(x,y,idx){
      const r = this.bitmap.data[idx+0];
      const g = this.bitmap.data[idx+1];
      const b = this.bitmap.data[idx+2];
      const da = (r-bg.r)*(r-bg.r) + (g-bg.g)*(g-bg.g) + (b-bg.b)*(b-bg.b);
      if (da <= thresholdSq) {
        // make pixel transparent
        this.bitmap.data[idx+3] = 0;
      }
    });

    const outBuf = await img.getBufferAsync(Jimp.MIME_PNG);
    const newDataUri = 'data:image/png;base64,' + outBuf.toString('base64');

    const newAssets = replaceDataUri(assets, 'FACTURE_FRAME_BASE64', newDataUri);
    fs.writeFileSync(assetsPath, newAssets, 'utf8');
    console.log('Updated lib/assets.js with transparent PNG data URI');

    // Also try to replace inline const FAKHAMA_FRAME_BASE64 in page.jsx if exists
    let page = fs.readFileSync(pagePath, 'utf8');
    const inline = extractInlineConst(page, 'FAKHAMA_FRAME_BASE64');
    if (inline) {
      page = replaceInlineConst(page, 'FAKHAMA_FRAME_BASE64', newDataUri);
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

