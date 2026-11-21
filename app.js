const I18N = {
  en: { preset:"Preset", params:"Parameters", iterations:"Iterations", angle:"Angle", random:"Randomness",
    width:"Branch width", hue:"Hue", leaves:"Leaves", seed:"Seed", regen:"↻ Regenerate", png:"⤓ Export PNG",
    tree:"Tree", bush:"Bush", fern:"Fern", coral:"Coral", vine:"Vine" },
  de: { preset:"Preset", params:"Parameter", iterations:"Iterationen", angle:"Winkel", random:"Zufall",
    width:"Zweigstärke", hue:"Farbton", leaves:"Blätter", seed:"Seed", regen:"↻ Neu generieren", png:"⤓ PNG exportieren",
    tree:"Baum", bush:"Busch", fern:"Farn", coral:"Koralle", vine:"Ranke" }
};
let lang = localStorage.getItem('ag-lang') || 'en';
const t = k => I18N[lang][k] || k;
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i]').forEach(el => el.textContent = t(el.dataset.i));
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  renderPresets();
}
document.querySelectorAll('.lang button').forEach(b => b.onclick = () => { lang=b.dataset.lang; localStorage.setItem('ag-lang',lang); applyLang(); });

// seeded RNG (mulberry32)
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let z=Math.imul(seed^seed>>>15,1|seed); z=z+Math.imul(z^z>>>7,61|z)^z; return ((z^z>>>14)>>>0)/4294967296; }; }

const PRESETS = {
  tree:  { axiom:'F', rules:{F:'FF+[+F-F-F]-[-F+F+F]'}, it:4, angle:22.5 },
  bush:  { axiom:'F', rules:{F:'F[+F]F[-F]F'}, it:4, angle:25 },
  fern:  { axiom:'X', rules:{X:'F[+X]F[-X]+X', F:'FF'}, it:4, angle:20 },
  coral: { axiom:'F', rules:{F:'F[+F]F[-F][F]'}, it:4, angle:30 },
  vine:  { axiom:'V', rules:{V:'F[+V]F[-V]F', F:'FF'}, it:4, angle:18 }
};
let presetName = 'tree';
function renderPresets(){
  const wrap = document.getElementById('presets');
  wrap.innerHTML = '';
  for (const name of Object.keys(PRESETS)){
    const b = document.createElement('button');
    b.textContent = t(name); b.dataset.p = name;
    b.onclick = () => { presetName = name; loadPreset(); };
    wrap.appendChild(b);
  }
}

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
function resize(){ cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();

const $ = id => document.getElementById(id);
const read = () => ({
  it: +$('it').value, angle: +$('an').value, rand: +$('ra').value/100,
  width: +$('wi').value, hue: +$('hu').value, leaf: $('leaf').checked,
  seed: +$('seed').value || 1
});
['it','an','ra','wi','hu'].forEach(id => $(id).oninput = e => {
  $('it-val').textContent=$('it').value; $('an-val').textContent=$('an').value+'°';
  $('ra-val').textContent=$('ra').value+'%'; $('wi-val').textContent=$('wi').value;
  $('hu-val').textContent=$('hu').value+'°';
});
function syncLabels(){
  $('it-val').textContent=$('it').value; $('an-val').textContent=$('an').value+'°';
  $('ra-val').textContent=$('ra').value+'%'; $('wi-val').textContent=$('wi').value; $('hu-val').textContent=$('hu').value+'°';
}

function loadPreset(){
  const p = PRESETS[presetName];
  $('it').value=p.it; $('an').value=p.angle; $('ra').value=18; $('wi').value=4;
  $('hu').value = {tree:130,bush:95,fern:150,coral:340,vine:60}[presetName];
  syncLabels(); draw();
}
function setPreset(){ loadPreset(); }

function expand(p){
  let s = p.axiom;
  for (let i=0;i<p.it;i++){
    let out='';
    for (const ch of s){
      out += p.rules[ch] ?? ch;
      if (out.length > 2_000_000) break;
    }
    s = out;
  }
  return s;
}

function draw(){
  const p = read();
  const preset = PRESETS[presetName];
  const str = expand({...preset, it:p.it});
  const rand = rng(p.seed);
  const dpr = devicePixelRatio;
  const W = cv.width, H = cv.height;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const w = cv.clientWidth, h = cv.clientHeight;
  ctx.clearRect(0,0,w,h);
  // ground glow
  const g = ctx.createRadialGradient(w/2,h*0.85,10,w/2,h*0.85,w*0.5);
  g.addColorStop(0,'rgba(139,226,139,.12)'); g.addColorStop(1,'transparent');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  ctx.strokeStyle = `hsl(${p.hue},45%,32%)`;
  ctx.fillStyle = `hsl(${p.hue},60%,45%)`;
  ctx.lineCap='round';

  // estimate length: step = height/3^it scaled
  let step = h / Math.pow(2.2, p.it+1);
  step = Math.min(step, w/40);
  let x=w/2, y=h*0.92, dir=-Math.PI/2, lw=p.width;
  const stack=[];
  const jitter = p.rand * 0.5;

  for (const ch of str){
    if (ch==='F'){
      const nx = x + Math.cos(dir)*step, ny = y + Math.sin(dir)*step;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(nx,ny); ctx.stroke();
      // leaf blobs near tips
      if (p.leaf && rand() < 0.06){
        ctx.fillStyle = `hsla(${p.hue+rand()*40-20},70%,${55+rand()*20}%,.8)`;
        ctx.beginPath(); ctx.arc(nx,ny, 2+rand()*4,0,7); ctx.fill();
      }
      x=nx; y=ny;
    } else if (ch==='+'||ch==='-'){
      const sgn = ch==='+'?1:-1;
      dir += sgn * (p.angle + (rand()*2-1)*jitter*10) * Math.PI/180;
    } else if (ch==='['){ stack.push([x,y,dir,lw]); lw*=0.72; }
    else if (ch===']'){ const s=stack.pop(); if(s){[x,y,dir,lw]=s;} }
    else if (ch==='f'){ /* move without draw */ x+=Math.cos(dir)*step*0.5; y+=Math.sin(dir)*step*0.5; }
    if (x<-w*0.2||x>w*1.2||y<-h*0.2||y>h*1.2) continue;
  }
}

$('dice').onclick = () => { $('seed').value = Math.floor(Math.random()*99999); draw(); };
$('regen').onclick = () => draw();
$('png').onclick = () => {
  const a = document.createElement('a');
  a.download = `axiom-grove-${presetName}-${$('seed').value}.png`;
  a.href = cv.toDataURL('image/png'); a.click();
};
['it','an','ra','wi','hu','leaf'].forEach(id => $(id).addEventListener('input', draw));
$('seed').addEventListener('change', draw);

syncLabels(); loadPreset(); applyLang();
