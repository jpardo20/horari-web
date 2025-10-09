// Lightweight clock-style time picker (24h) — no deps
// Usage: TimePicker.pick({ value: '08:30', step: 5, title: 'Selecciona hora' }).then(v => console.log(v));
(function(){
  if (window.TimePicker) return;
  const STYLE = `
  .tp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:9999}
  .tp-dialog{background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);width:320px;max-width:92vw;padding:16px}
  .tp-header{font-size:.8rem;color:#666;margin-bottom:8px;letter-spacing:.08em}
  .tp-disp{display:flex;align-items:center;gap:4px;margin-bottom:12px}
  .tp-digit{font-size:44px;font-weight:700;padding:6px 10px;border-radius:8px;background:#f2eeff;line-height:1}
  .tp-colon{font-size:36px;color:#666}
  .tp-toggle{margin-left:auto;display:flex;border:1px solid #ddd;border-radius:8px;overflow:hidden}
  .tp-toggle button{font-size:.8rem;padding:6px 8px;border:0;background:#fff;cursor:pointer}
  .tp-toggle button.sel{background:#f2eeff}
  .tp-face{position:relative;width:280px;height:280px;margin:0 auto 10px auto;border-radius:50%;background:#f4f4f6;display:flex;align-items:center;justify-content:center}
  .tp-num{position:absolute;transform:translate(-50%,-50%);width:42px;height:42px;border-radius:50%;border:0;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.05);cursor:pointer}
  .tp-num.sel{background:#6d4cff;color:#fff}
  .tp-actions{display:flex;justify-content:flex-end;gap:16px;margin-top:6px}
  .tp-actions button{background:none;border:0;color:#6d4cff;font-weight:600;cursor:pointer}
  @media (max-width:400px){.tp-face{width:240px;height:240px}.tp-num{width:38px;height:38px} .tp-dialog{padding:12px} }
  `;
  function ensureStyle(){
    if (document.getElementById('tp-style')) return;
    const st = document.createElement('style');
    st.id = 'tp-style'; st.textContent = STYLE;
    document.head.appendChild(st);
  }
  function polarToXY(cx, cy, r, angleDeg){
    const a = (angleDeg - 90) * Math.PI/180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  function ring(container, values, selected, onPick){
    const rect = container.getBoundingClientRect();
    const cx = rect.width/2, cy = rect.height/2, r = Math.min(cx, cy) - 28;
    container.innerHTML = '';
    const step = 360 / values.length;
    values.forEach((val, idx)=>{
      const p = polarToXY(cx, cy, r, idx*step);
      const b = document.createElement('button');
      b.className = 'tp-num' + (val===selected ? ' sel' : '');
      b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
      b.textContent = String(val).padStart(2,'0');
      b.addEventListener('click', ()=> onPick(val));
      container.appendChild(b);
    });
  }
  function parseValue(v){
    if (!v || !/^\d{2}:\d{2}$/.test(v)) return {h:8,m:30};
    const [h,m] = v.split(':').map(Number); return {h, m};
  }
  function fmt(h,m){ return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0'); }
  window.TimePicker = {
    pick(opts={}){
      ensureStyle();
      const step = Math.max(1, Number(opts.step || 5));
      const init = parseValue(opts.value);
      let h = init.h, m = Math.round(init.m/step)*step;
      let half = h >= 12 ? 12 : 0; // 0..11 or 12..23
      let mode = 'hour'; // hour -> minute
      return new Promise((resolve, reject)=>{
        const ov = document.createElement('div'); ov.className = 'tp-overlay';
        const dg = document.createElement('div'); dg.className = 'tp-dialog';
        dg.innerHTML = `
          <div class="tp-header">${opts.title||'SELECCIONA HORA'}</div>
          <div class="tp-disp">
            <div class="tp-digit" data-part="h">${String(h).padStart(2,'0')}</div>
            <div class="tp-colon">:</div>
            <div class="tp-digit" data-part="m">${String(m).padStart(2,'0')}</div>
            <div class="tp-toggle">
              <button data-half="0" class="${half===0?'sel':''}">0–11</button>
              <button data-half="12" class="${half===12?'sel':''}">12–23</button>
            </div>
          </div>
          <div class="tp-face"></div>
          <div class="tp-actions">
            <button class="tp-cancel">Cancel·la</button>
            <button class="tp-ok">OK</button>
          </div>`;
        ov.appendChild(dg);
        document.body.appendChild(ov);

        const face = dg.querySelector('.tp-face');
        const digitH = dg.querySelector('[data-part="h"]');
        const digitM = dg.querySelector('[data-part="m"]');
        const toggles = dg.querySelectorAll('.tp-toggle button');

        function setHalf(v){
          half = Number(v);
          toggles.forEach(b=>b.classList.toggle('sel', Number(b.dataset.half)===half));
          renderFace();
        }
        function renderFace(){
          if (mode==='hour'){
            const vals = Array.from({length:12}, (_,i)=> i + half);
            let sel = Math.max(0, Math.min(23, h));
            ring(face, vals, sel, (val)=>{ h = val; digitH.textContent = String(h).padStart(2,'0'); mode='minute'; renderFace(); });
          }else{
            const vals = Array.from({length:60/step}, (_,i)=> i*step);
            let sel = m;
            ring(face, vals, sel, (val)=>{ m = val; digitM.textContent = String(m).padStart(2,'0'); });
          }
        }
        digitH.addEventListener('click', ()=>{ mode='hour'; renderFace(); });
        digitM.addEventListener('click', ()=>{ mode='minute'; renderFace(); });
        toggles.forEach(b=> b.addEventListener('click', ()=> setHalf(b.dataset.half)));

        dg.querySelector('.tp-cancel').addEventListener('click', ()=>{ document.body.removeChild(ov); reject('cancel'); });
        dg.querySelector('.tp-ok').addEventListener('click', ()=>{ document.body.removeChild(ov); resolve(fmt(h,m)); });
        ov.addEventListener('click', (e)=>{ if (e.target===ov){ document.body.removeChild(ov); reject('cancel'); } });

        // init
        setHalf(half);
        renderFace();
      });
    }
  };
})();