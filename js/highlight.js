// Highlight current day/slot, only when embed=1
(function(){
  const params = new URLSearchParams(location.search);
  const embed = params.get('embed');
  if (!(embed === '1' || embed === 'true')) return; // only run in fixed/embed views

  function day15(){ const wd = new Date().getDay(); return (wd>=1 && wd<=5) ? wd : null; }
  function nowHM(){ const d = new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }

  function apply(){
    const schedule = document.getElementById('schedule');
    if (!schedule) return;
    const grid = schedule.querySelector('.grid');
    if (!grid) return;

    // clear previous
    grid.querySelectorAll('.hdr.today').forEach(el=> el.classList.remove('today'));
    grid.querySelectorAll('.hdr.now').forEach(el=> el.classList.remove('now'));
    grid.querySelectorAll('.cell.today').forEach(el=> el.classList.remove('today'));
    grid.querySelectorAll('.cell.now').forEach(el=> el.classList.remove('now'));

    const act = day15();
    const now = nowHM();

    if (act){
      const dh = grid.querySelector(`.hdr[data-day="${act}"]`);
      if (dh) dh.classList.add('today');
      grid.querySelectorAll(`.cell[data-day="${act}"]`).forEach(c=> c.classList.add('today'));
    }

    // find active slot by comparing to headers
    const headers = Array.from(grid.querySelectorAll('.hdr[data-slot]'));
    let activeKey = null;
    for (const h of headers){
      const key = h.getAttribute('data-slot');
      const [st, en] = key.split('-');
      if (st <= now && now < en){ activeKey = key; break; }
    }
    if (activeKey){
      const th = grid.querySelector(`.hdr[data-slot="${activeKey}"]`);
      if (th) th.classList.add('now');
      grid.querySelectorAll(`.cell[data-slot="${activeKey}"]`).forEach(c=> c.classList.add('now'));
    }
  }

  // Run after load and then every minute
  window.addEventListener('DOMContentLoaded', ()=>{
    // Try periodically until grid exists
    const iv = setInterval(()=>{
      const grid = document.querySelector('#schedule .grid');
      if (grid){
        clearInterval(iv);
        apply();
        // Re-apply every minute
        setInterval(apply, 60000);
        // Re-apply when grid changes (e.g., selector can re-render)
        const mo = new MutationObserver(()=> apply());
        mo.observe(grid.parentElement, {childList: true, subtree: true});
      }
    }, 250);
  });
})();