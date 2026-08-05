const fs = require('fs');
const path = require('path');
const JimpModule = require('jimp');

(async ()=>{
  try{
    const repoRoot = path.resolve(__dirname, '..');
    const assetsPath = path.join(repoRoot, 'lib', 'assets.js');
    const backupPath = path.join(repoRoot, 'lib', 'assets.js.bak');

    const s = fs.readFileSync(assetsPath, 'utf8');
    const marker = 'export const FACTURE_FRAME_BASE64';
    const idx = s.indexOf(marker);
    if (idx === -1) throw new Error('marker not found');
    const after = s.slice(idx);
    const firstQuote = after.indexOf('"');
    const lastQuote = after.indexOf('"', firstQuote+1);
    if (firstQuote === -1 || lastQuote === -1) throw new Error('quotes not found');
    const oldData = after.slice(firstQuote+1, lastQuote);
    if (!oldData.startsWith('data:')) throw new Error('oldData does not start with data:');

    console.log('Old data length:', oldData.length);
    const base64 = oldData.split(',')[1];
    const buf = Buffer.from(base64, 'base64');

    const img = await JimpModule.Jimp.read(buf);
    const w = img.bitmap.width, h = img.bitmap.height;
    console.log('Image size', w, h);

    const block = Math.max(8, Math.round(Math.min(w,h) * 0.03));
    function sampleArea(x0,y0){
      let r=0,g=0,b=0,c=0;
      for(let x=x0;x<x0+block && x<w; x++){
        for(let y=y0;y<y0+block && y<h; y++){
          const i = (w*y + x) * 4;
          r += img.bitmap.data[i]; g += img.bitmap.data[i+1]; b += img.bitmap.data[i+2]; c++;
        }
      }
      return { r: Math.round(r/c), g: Math.round(g/c), b: Math.round(b/c) };
    }

    const tl = sampleArea(0,0);
    const tr = sampleArea(w-block,0);
    const bl = sampleArea(0,h-block);
    const br = sampleArea(w-block,h-block);
    const bg = {
      r: Math.round((tl.r+tr.r+bl.r+br.r)/4),
      g: Math.round((tl.g+tr.g+bl.g+br.g)/4),
      b: Math.round((tl.b+tr.b+bl.b+br.b)/4)
    };
    console.log('Detected background color', bg);

    const threshold = 40;
    const thresholdSq = threshold*threshold;
    let transparentCount = 0;

    img.scan(0,0,w,h,function(x,y,idx2){
      const r = this.bitmap.data[idx2+0];
      const g = this.bitmap.data[idx2+1];
      const b = this.bitmap.data[idx2+2];
      const da = (r-bg.r)*(r-bg.r) + (g-bg.g)*(g-bg.g) + (b-bg.b)*(b-bg.b);
      if (da <= thresholdSq) { this.bitmap.data[idx2+3] = 0; transparentCount++; }
    });

    console.log('Pixels made transparent (approx):', transparentCount);
    const outBuf = await new Promise((res,rej)=> img.getBuffer('image/png', (e,b)=> e?rej(e):res(b)));
    const newDataUri = 'data:image/png;base64,' + outBuf.toString('base64');

    // write backup then replace
    fs.copyFileSync(assetsPath, backupPath);
    console.log('Backup written to', backupPath);

    const newS = s.slice(0, idx + firstQuote + 1) + newDataUri + s.slice(idx + lastQuote);
    fs.writeFileSync(assetsPath, newS, 'utf8');
    console.log('Replaced FACTURE_FRAME_BASE64 in', assetsPath);

    // sanity checks
    const newFile = fs.readFileSync(assetsPath,'utf8');
    if (newFile.indexOf('data:image/png;base64,') === -1) throw new Error('png data URI not found after write');
    console.log('Verified png data URI present');

    process.exit(0);
  }catch(err){
    console.error('Error:', err);
    process.exit(1);
  }
})();