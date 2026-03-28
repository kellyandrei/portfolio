/*<!-- ══════════════════════════════════════════════════════════════
     THREE.JS — CHAMPAGNE PEARL BLOB
══════════════════════════════════════════════════════════════ -->*/
let chatHistory = [];

(function() {
  const canvas = document.getElementById('blob-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();

  // Orthographic-feel camera — perspective but tight FOV for pearl look
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  // Resize canvas to its CSS-driven dimensions
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Env map for real reflections ──
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
  scene.add(cubeCamera);

  // ── Lighting — champagne / warm gold pearl ──
  // Key: bright warm top-left
  const key = new THREE.DirectionalLight(0xfff8ee, 5.0);
  key.position.set(2, 4, 3);
  scene.add(key);

  // Fill: cool iridescent from bottom-right
  const fill = new THREE.DirectionalLight(0xd8eeff, 2.5);
  fill.position.set(-3, -2, 2);
  scene.add(fill);

  // Rim: warm gold rim from behind
  const rim = new THREE.DirectionalLight(0xf0d080, 3.5);
  rim.position.set(1, -3, -4);
  scene.add(rim);

  // Ambient soft fill
  scene.add(new THREE.AmbientLight(0xfff5e8, 0.5));

  // Moving specular hotspots
  const spot1 = new THREE.PointLight(0xfff5cc, 8, 7);
  spot1.position.set(1.8, 2.2, 2.2);
  scene.add(spot1);

  const spot2 = new THREE.PointLight(0xffe0a0, 5, 7);
  spot2.position.set(-2.2, -1.0, 1.8);
  scene.add(spot2);

  // ── Geometry: high-res sphere ──
  const geo = new THREE.SphereGeometry(1.5, 128, 128);
  const posAttr = geo.attributes.position;
  const vCount  = posAttr.count;
  const orig    = new Float32Array(posAttr.array);

  // ── Material: champagne pearl — high metalness, slightly rougher than chrome ──
  const mat = new THREE.MeshStandardMaterial({
    color:           new THREE.Color(0.88, 0.72, 0.40),  // warm champagne gold
    metalness:       0.95,
    roughness:       0.10,    // slightly softer than a mirror — pearl feel
    envMap:          cubeRenderTarget.texture,
    envMapIntensity: 2.6,
  });

  const pearl = new THREE.Mesh(geo, mat);
  scene.add(pearl);

  // ── Smooth noise — very low frequency, barely perceptible bumps ──
  // Pure trilinear hash (no fractal buildup → no spiky ridges)
  function fade(t) { return t*t*t*(t*(t*6-15)+10); }
  function lerp(a,b,t) { return a+t*(b-a); }
  function grad(h,x,y,z) {
    h &= 15;
    const u = h<8?x:y, v = h<4?y:h===12||h===14?x:z;
    return ((h&1)?-u:u)+((h&2)?-v:v);
  }
  // Build a permutation table once
  const p = new Uint8Array(512);
  for(let i=0;i<256;i++) p[i]=i;
  for(let i=255;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [p[i],p[j]]=[p[j],p[i]]; }
  for(let i=0;i<256;i++) p[i+256]=p[i];

  function pnoise(x,y,z) {
    const X=Math.floor(x)&255, Y=Math.floor(y)&255, Z=Math.floor(z)&255;
    x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
    const u=fade(x), v=fade(y), w=fade(z);
    const A=p[X]+Y, AA=p[A]+Z, AB=p[A+1]+Z, B=p[X+1]+Y, BA=p[B]+Z, BB=p[B+1]+Z;
    return lerp(
      lerp(lerp(grad(p[AA],x,y,z),grad(p[BA],x-1,y,z),u),lerp(grad(p[AB],x,y-1,z),grad(p[BB],x-1,y-1,z),u),v),
      lerp(lerp(grad(p[AA+1],x,y,z-1),grad(p[BA+1],x-1,y,z-1),u),lerp(grad(p[AB+1],x,y-1,z-1),grad(p[BB+1],x-1,y-1,z-1),u),v),
      w
    );
  }

  // Mouse / touch
  let mx=0, my=0, smX=0, smY=0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX/window.innerWidth - 0.5)*2;
    my = -(e.clientY/window.innerHeight - 0.5)*2;
  });
  document.addEventListener('touchmove', e => {
    mx = (e.touches[0].clientX/window.innerWidth - 0.5)*2;
    my = -(e.touches[0].clientY/window.innerHeight - 0.5)*2;
  }, { passive:true });

  const clock = new THREE.Clock();
  let frame = 0;

  function animate() {
    requestAnimationFrame(animate);
    frame++;
    const t = clock.getElapsedTime();

    smX += (mx - smX) * 0.03;
    smY += (my - smY) * 0.03;

    // ── Very gentle deformation ──
    // Low frequency (0.7), low strength (0.07) → smooth round pearl, not spiky
    const freq     = 0.70;
    const strength = 0.07;
    const speed    = 0.22;

    for (let i = 0; i < vCount; i++) {
      const ox=orig[i*3], oy=orig[i*3+1], oz=orig[i*3+2];
      const len = Math.sqrt(ox*ox+oy*oy+oz*oz) || 1;
      const nx=ox/len, ny=oy/len, nz=oz/len;

      // Single octave Perlin — keeps the surface glassy-smooth
      const n = pnoise(
        nx*freq + t*speed + smX*0.15,
        ny*freq + t*speed*0.8,
        nz*freq + t*speed*0.9 + smY*0.15
      );
      const d = 1.0 + n * strength;
      posAttr.setXYZ(i, ox*d, oy*d, oz*d);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Gentle continuous rotation
    pearl.rotation.y =  t * 0.10 + smX * 0.2;
    pearl.rotation.x =  Math.sin(t * 0.06) * 0.08 + smY * 0.1;

    // Animate light positions for shimmering reflections
    spot1.position.x = Math.sin(t * 0.55) * 2.2;
    spot1.position.y = Math.cos(t * 0.40) * 1.8 + 1.2;
    spot2.position.x = Math.cos(t * 0.48) * 2.5;
    spot2.position.y = Math.sin(t * 0.35) * 1.5 - 0.8;

    // Refresh env map every other frame
    if (frame % 2 === 0) {
      pearl.visible = false;
      cubeCamera.update(renderer, scene);
      pearl.visible = true;
    }

    renderer.render(scene, camera);
  }
  animate();
})();



  // ── CURSOR ──
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');
  let mx=0, my=0, rx=0, ry=0;
  document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });
  (function animCursor() {
    rx += (mx-rx)*0.12; ry += (my-ry)*0.12;
    cursor.style.transform = `translate(${mx-4}px,${my-4}px)`;
    ring.style.transform   = `translate(${rx-18}px,${ry-18}px)`;
    requestAnimationFrame(animCursor);
  })();

  // ── LOADER + restore saved photo ──
  window.addEventListener('load', () => {
    setTimeout(() => document.getElementById('loader').classList.add('hidden'), 1800);
    // Restore Kelly's photo from localStorage if previously saved
    const saved = localStorage.getItem('kelly_about_photo');
    if (saved) {
      document.getElementById('studio-photo').src = saved;
      document.getElementById('aboutImageBox').classList.add('has-photo');
    }
  });

  // ── NAV SCROLL ──
  window.addEventListener('scroll', () => {
    document.getElementById('mainNav').classList.toggle('scrolled', window.scrollY > 60);
  });

  // ── HAMBURGER MENU ──
  function toggleMenu() {
    const overlay  = document.getElementById('navOverlay');
    const burger   = document.getElementById('navHamburger');
    const isOpen   = overlay.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
  function closeMenu() {
    document.getElementById('navOverlay').classList.remove('open');
    document.getElementById('navHamburger').classList.remove('open');
    document.body.style.overflow = '';
  }
  // Close on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // ── REVEAL ON SCROLL ──
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  // ── COUNTER ──
  const cntObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.counter').forEach(c => {
        const target = +c.dataset.target, dur = 1800, start = performance.now();
        (function tick(now) {
          const p = Math.min((now-start)/dur, 1);
          c.textContent = Math.floor((1-Math.pow(1-p,3))*target);
          if (p < 1) requestAnimationFrame(tick); else c.textContent = target;
        })(start);
      });
      cntObs.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  const metricsEl = document.getElementById('metrics');
  if (metricsEl) cntObs.observe(metricsEl);

  // ── SERVICE ACCORDION ──
  function toggleService(idx) {
    document.querySelectorAll('.service-row').forEach((row, i) => {
      const body = document.getElementById('sb-'+i);
      if (i === idx) {
        const open = row.classList.toggle('open');
        body.classList.toggle('open', open);
      } else {
        row.classList.remove('open');
        body.classList.remove('open');
      }
    });
  }

  // ── PRICING TOGGLE ──
  const prices  = { monthly:['$1,200','$2,800','$5,500'], project:['$3,400','$6,800','$14,000'] };
  const periods = { monthly:'per month', project:'flat rate' };
  function setPricing(type) {
    document.querySelectorAll('.pricing-toggle button').forEach((b,i) => b.classList.toggle('active', (type==='monthly'&&i===0)||(type==='project'&&i===1)));
    [0,1,2].forEach(i => {
      const el = document.getElementById('price-'+i);
      el.style.cssText = 'transform:translateY(-10px);opacity:0;';
      setTimeout(() => {
        el.textContent = prices[type][i];
        document.getElementById('period-'+i).textContent = periods[type];
        el.style.cssText = 'transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.4s;transform:translateY(0);opacity:1;';
      }, 200 + i*60);
    });
  }

  // ── PHOTO UPLOAD — saves to localStorage so it persists across sessions ──
  function loadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      // Show immediately
      document.getElementById('studio-photo').src = dataUrl;
      document.getElementById('aboutImageBox').classList.add('has-photo');
      // Persist — stays even after browser refresh
      try {
        localStorage.setItem('kelly_about_photo', dataUrl);
      } catch(err) {
        // If image is too large for localStorage (>5 MB), still show it this session
        console.warn('Photo too large to persist in localStorage:', err);
      }
    };
    reader.readAsDataURL(file);
  }

  // ── AI CHAT ──
  function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    appendMsg('user', text);
    const typingId = appendTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: text, 
            history: chatHistory 
        }),
      });

      removeTyping(typingId);

      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      
      // FIX 1: Create the 'reply' variable first
      const reply = data.reply || "I'm not sure, but Kelly would love to answer that directly!";

      // FIX 2: Only call appendMsg ONCE using the variable we just made
      appendMsg('ai', reply);

      // 3. Save the exchange to history
      chatHistory.push({ role: 'user', parts: [{ text: text }] });
      chatHistory.push({ role: 'model', parts: [{ text: reply }] });

    } catch (err) {
      removeTyping(typingId);
      appendMsg('ai', "I'm having a little trouble right now. Feel free to reach out to Kelly directly!");
    }
  }

  function quickAsk(text) {
    const input = document.getElementById('chatInput');
    input.value = text;
    sendMessage(); // This calls your existing function
  }

  function appendMsg(role, text) {
    const box = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `ai-msg ${role === 'user' ? 'user' : ''}`;

    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
        .replace(/\n/g, '<br>');

    div.innerHTML = `
      <div class="ai-msg-avatar">${role === 'user' ? 'you' : '✦'}</div>
      <div class="ai-msg-bubble">${formattedText}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function appendTyping() {
    const box = document.getElementById('chatMessages');
    const id  = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'ai-msg'; div.id = id;
    div.innerHTML = `<div class="ai-msg-avatar">✦</div><div class="ai-msg-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
  }

  function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
