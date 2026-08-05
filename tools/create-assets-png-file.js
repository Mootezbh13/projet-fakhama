const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
(async ()=>{
  const repoRoot = path.resolve(__dirname,'..');
  const assetsPath = path.join(repoRoot,'lib','assets.js');
  const outPath = path.join(repoRoot,'lib','assets_facture_png.js');
  const s = fs.readFileSync(assetsPath,'utf8');
  const marker = 'export const FACTURE_FRAME_BASE64';
  const idx = s.indexOf(marker);
  if(idx===-1){ console.error('marker not found'); process.exit(1); }
  const after = s.slice(idx);
  const firstQuote = after.indexOf('"');
  const lastQuote = after.indexOf('"', firstQuote+1);
  const oldData = after.slice(firstQuote+1, lastQuote);
  const base64 = oldData.split(',')[1];
  const buf = Buffer.from(base64,'base64');
  const img = await Jimp.Jimp.read(buf);
  const w=img.bitmap.width,h=img.bitmap.height;
  console.log('image',w,h);
  const block = Math.max(8, Math.round(Math.min(w,h)*0.03));
  function sample(x0,y0){ let r=0,g=0,b=0,c=0; for(let x=x0;x<x0+block&&x<w;x++){ for(let y=y0;y<y0+block&&y<h;y++){ const i=(w*y+x)*4; r+=img.bitmap.data[i]; g+=img.bitmap.data[i+1]; b+=img.bitmap.data[i+2]; c++;}} return {r:Math.round(r/c),g:Math.round(g/c),b:Math.round(b/c)} }
  const tl=sample(0,0), tr=sample(w-block,0), bl=sample(0,h-block), br=sample(w-block,h-block);
  const bg = {r:Math.round((tl.r+tr.r+bl.r+br.r)/4), g:Math.round((tl.g+tr.g+bl.g+br.g)/4), b:Math.round((tl.b+tr.b+bl.b+br.b)/4)};
  const threshold=40; const thSq=threshold*threshold;
  img.scan(0,0,w,h,function(x,y,idx){ const r=this.bitmap.data[idx+0], g=this.bitmap.data[idx+1], b=this.bitmap.data[idx+2]; const d=(r-bg.r)*(r-bg.r)+(g-bg.g)*(g-bg.g)+(b-bg.b)*(b-bg.b); if(d<=thSq) this.bitmap.data[idx+3]=0; });
  const outBuf = await new Promise((res,rej)=> img.getBuffer('image/png',(e,b)=> e?rej(e):res(b)));
  const newDataUri = 'data:image/png;base64,' + outBuf.toString('base64');
  const js = `// Auto-generated PNG frame for facture (transparent center)\nexport const FACTURE_FRAME_PNG_BASE64 = \"${newDataUri}\";\n`;
  fs.writeFileSync(outPath, js, 'utf8');
  console.log('Wrote', outPath);
})();
