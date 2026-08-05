const fs = require('fs');
const path = require('path');
const JimpModule = require('jimp');

(async ()=>{
  const repoRoot = path.resolve(__dirname, '..');
  const assetsPath = path.join(repoRoot, 'lib', 'assets.js');
  const s = fs.readFileSync(assetsPath,'utf8');
  const marker = 'export const FACTURE_FRAME_BASE64';
  const idx = s.indexOf(marker);
  if(idx===-1){ console.error('not found'); process.exit(1); }
  const after = s.slice(idx);
  const firstQuote = after.indexOf('"');
  const lastQuote = after.indexOf('"', firstQuote+1);
  const oldData = after.slice(firstQuote+1, lastQuote);
  const base64 = oldData.split(',')[1];
  const buf = Buffer.from(base64,'base64');
  const img = await JimpModule.Jimp.read(buf);
  // sample corners to find bg color
  const w=img.bitmap.width, h=img.bitmap.height;
  function sample(x0,y0,wS,hS){ let r=0,g=0,b=0,c=0; for(let x=x0;x<x0+wS&&x<w;x++){ for(let y=y0;y<y0+hS&&y<h;y++){ const i=(w*y+x)*4; r+=img.bitmap.data[i]; g+=img.bitmap.data[i+1]; b+=img.bitmap.data[i+2]; c++;}} return {r:Math.round(r/c),g:Math.round(g/c),b:Math.round(b/c)} }
  const block = Math.max(8, Math.round(Math.min(w,h)*0.03));
  const tl=sample(0,0,block,block), tr=sample(w-block,0,block,block), bl=sample(0,h-block,block,block), br=sample(w-block,h-block,block,block);
  const bg = { r: Math.round((tl.r+tr.r+bl.r+br.r)/4), g: Math.round((tl.g+tr.g+bl.g+br.g)/4), b: Math.round((tl.b+tr.b+bl.b+br.b)/4)};
  const threshold=40; const thSq = threshold*threshold;
  img.scan(0,0,w,h,function(x,y,idx){ const r=this.bitmap.data[idx+0], g=this.bitmap.data[idx+1], b=this.bitmap.data[idx+2]; const d=(r-bg.r)*(r-bg.r)+(g-bg.g)*(g-bg.g)+(b-bg.b)*(b-bg.b); if(d<=thSq){ this.bitmap.data[idx+3]=0; }});
  const outBuf = await new Promise((res,rej)=> img.getBuffer('image/png',(e,b)=> e?rej(e):res(b)));
  const pngPath = path.join(__dirname,'facture_frame.png');
  const b64path = path.join(__dirname,'facture_frame.b64');
  fs.writeFileSync(pngPath,outBuf);
  fs.writeFileSync(b64path, outBuf.toString('base64'));
  console.log('Wrote', pngPath, b64path);
})();
