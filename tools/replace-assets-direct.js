const fs = require('fs');
const path = require('path');
const JimpModule = require('jimp');

(async ()=>{
  try{
    const repoRoot = path.resolve(__dirname, '..');
    const assetsPath = path.join(repoRoot,'lib','assets.js');
    const outPath = path.join(repoRoot,'lib','assets_new.js');
    const s = fs.readFileSync(assetsPath,'utf8');
    const marker = 'export const FACTURE_FRAME_BASE64 = "';
    const idx = s.indexOf(marker);
    if(idx===-1){ console.error('marker not found'); process.exit(1); }
    const start = idx + marker.length;
    const end = s.indexOf('";', start);
    if(end===-1){ console.error('end quote not found'); process.exit(1); }
    const oldData = s.slice(start, end);
    console.log('oldData prefix', oldData.slice(0,30));
    const base64 = oldData.split(',')[1];
    const buf = Buffer.from(base64,'base64');
    const img = await JimpModule.Jimp.read(buf);
    const w=img.bitmap.width, h=img.bitmap.height;
    console.log('img size', w,h);
    // simple chroma: make near-bg transparent
    const block = Math.max(8, Math.round(Math.min(w,h)*0.03));
    function sample(x0,y0){ let r=0,g=0,b=0,c=0; for(let x=x0;x<x0+block&&x<w;x++){ for(let y=0;y<block&&y<h;y++){ const i=(w*y+x)*4; r+=img.bitmap.data[i]; g+=img.bitmap.data[i+1]; b+=img.bitmap.data[i+2]; c++;}} return {r:Math.round(r/c),g:Math.round(g/c),b:Math.round(b/c)} }
    const tl = sample(0,0), tr = sample(w-block,0), bl = sample(0,h-block), br = sample(w-block,h-block);
    const bg = {r:Math.round((tl.r+tr.r+bl.r+br.r)/4), g:Math.round((tl.g+tr.g+bl.g+br.g)/4), b:Math.round((tl.b+tr.b+bl.b+br.b)/4)};
    console.log('bg', bg);
    const threshold = 40; const thSq = threshold*threshold;
    img.scan(0,0,w,h,function(x,y,idx){ const r=this.bitmap.data[idx+0], g=this.bitmap.data[idx+1], b=this.bitmap.data[idx+2]; const d=(r-bg.r)*(r-bg.r)+(g-bg.g)*(g-bg.g)+(b-bg.b)*(b-bg.b); if(d<=thSq) this.bitmap.data[idx+3]=0; });
    const outBuf = await new Promise((res,rej)=> img.getBuffer('image/png',(e,b)=> e?rej(e):res(b)));
    const newData = 'data:image/png;base64,' + outBuf.toString('base64');
    const newS = s.replace(oldData, newData);
    fs.writeFileSync(outPath, newS, 'utf8');
    console.log('Wrote', outPath);
    console.log('new file contains png?', newS.indexOf('data:image/png;base64,')!==-1);
  }catch(err){ console.error(err); process.exit(1); }
})();
