    // dropdownToggleHandler
    (function(){
      const dd = document.getElementById('actionsDropdown');
      if (!dd) return;
      const toggle = dd.querySelector('.dropdown-toggle');
      toggle.addEventListener('click', (e)=>{
        e.stopPropagation();
        dd.classList.toggle('open');
      });
      document.addEventListener('click', ()=> dd.classList.remove('open'));
    })();

    // --- Soft access gate (deterrent, not real security on GitHub Pages) ---
    // Change this to the SHA-256 of your chosen passphrase (see tools/hash.html)
    const ADMIN_HASH = "a0fc5ca44fd17293e959146e22fdd3d056c842707ca732b7c67e3d0486426ffd"; // sha256('canvia-ho')
    async function sha256Hex(str){
      const enc = new TextEncoder().encode(str);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    (function gateInit(){
      const ok = localStorage.getItem('admin_ok') === ADMIN_HASH;
      const gate = document.getElementById('gate');
      if (!ok){
        gate.style.display = 'flex';
        const inp = document.getElementById('gateInput');
        const okBtn = document.getElementById('gateOK');
        const cancelBtn = document.getElementById('gateCancel');
        const msg = document.getElementById('gateMsg');
        async function submit(){
          msg.style.display = 'none';
          const h = await sha256Hex(inp.value||"");
          if (h === ADMIN_HASH){
            localStorage.setItem('admin_ok', ADMIN_HASH);
            gate.remove();
          }else{
            msg.style.display = 'block';
            inp.focus(); inp.select();
          }
        }
        okBtn.addEventListener('click', submit);
        inp.addEventListener('keydown', (e)=>{ if (e.key==='Enter') submit(); });
        cancelBtn.addEventListener('click', ()=> history.back());
        setTimeout(()=> inp.focus(), 50);
      }
    })();
