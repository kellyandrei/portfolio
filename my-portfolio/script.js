/*══════════════════════════════════════════════════════════════
  THREE.JS — IRIDESCENT SILVER HOLOGRAPHIC SPHERE
  Silver/chrome base with dynamic prismatic rainbow reflections.
  Cyan, violet, rose, gold color shifts. Organic liquid deformation.
  White background. Real-time cube-camera env reflections.
══════════════════════════════════════════════════════════════*/
let chatHistory = [];

(function () {
  const canvas = document.getElementById('blob-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 5.5);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Cube camera for real-time env reflections ──
  const cubeRT = new THREE.WebGLCubeRenderTarget(512, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeRT);
  scene.add(cubeCamera);

  // ══ IRIDESCENT LIGHTING SETUP ══
  // These lights are what create the rainbow color shifts in the silver surface.
  // Each light contributes a different hue to the reflections.

  // Bright white key — main illumination
  const keyLight = new THREE.DirectionalLight(0xffffff, 6.0);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  // Cyan from upper left
  const cyanLight = new THREE.DirectionalLight(0x44ffee, 5.0);
  cyanLight.position.set(-4, 3, 3);
  scene.add(cyanLight);

  // Violet/purple from right
  const violetLight = new THREE.DirectionalLight(0xaa44ff, 4.5);
  violetLight.position.set(5, -1, 2);
  scene.add(violetLight);

  // Rose/pink from below
  const roseLight = new THREE.DirectionalLight(0xff44aa, 3.5);
  roseLight.position.set(-2, -5, 2);
  scene.add(roseLight);

  // Warm gold rim from behind — subtle warmth
  const goldRim = new THREE.DirectionalLight(0xffcc44, 3.0);
  goldRim.position.set(1, -3, -5);
  scene.add(goldRim);

  // Soft ambient — keeps the sphere from going fully dark anywhere
  scene.add(new THREE.AmbientLight(0xddeeff, 0.6));

  // ── Animated specular orbs — create moving highlight hotspots ──
  const orb1 = new THREE.PointLight(0xaaffff, 18, 9);  // cyan
  orb1.position.set(2.0, 2.5, 2.5);
  scene.add(orb1);

  const orb2 = new THREE.PointLight(0xcc88ff, 14, 9);  // violet
  orb2.position.set(-2.5, -1.5, 2.0);
  scene.add(orb2);

  const orb3 = new THREE.PointLight(0xffffff, 12, 8);  // white specular
  orb3.position.set(0.5, 3.0, 2.0);
  scene.add(orb3);

  const orb4 = new THREE.PointLight(0xff88cc, 8, 7);   // rose
  orb4.position.set(-1.5, -3.0, 1.5);
  scene.add(orb4);

  // ── Environment panels — visible only in reflections ──
  // These give the sphere rich iridescent color variance.
  // They are placed far away so they never appear in the camera view.
  const envPanels = [
    { color: 0x00ffee, pos: [0, 0, -12] },     // cyan behind
    { color: 0xaa00ff, pos: [12, 2, 0] },      // violet right
    { color: 0xff0088, pos: [-12, 0, 0] },     // rose left
    { color: 0xffffff, pos: [0, 12, 0] },      // white top
    { color: 0x0011ff, pos: [0, -12, 2] },     // deep blue bottom
    { color: 0xffee00, pos: [6, 6, -8] },      // gold diagonal
  ];
  envPanels.forEach(({ color, pos }) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  });

  // ── Geometry ──
  const geo = new THREE.SphereGeometry(1.55, 160, 160);
  const posAttr = geo.attributes.position;
  const vCount = posAttr.count;
  const orig = new Float32Array(posAttr.array);

  // ── Material — silver iridescent chrome ──
  // metalness: 1.0 = fully metallic (no diffuse, pure reflection)
  // roughness: 0.03 = near-perfect mirror with slight spread
  // color: near-white silver base — the lighting does all the color work
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.92, 0.92, 0.96),   // silver-white base
    metalness: 1.0,
    roughness: 0.03,
    envMap: cubeRT.texture,
    envMapIntensity: 4.0,
  });

  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  // ── Perlin noise for organic deformation ──
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(h, x, y, z) {
    h &= 15;
    const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];

  function pnoise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z,
          B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
           lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
           lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w
    );
  }

  // Mouse / touch tracking
  let mxBlob = 0, myBlob = 0, smX = 0, smY = 0;
  document.addEventListener('mousemove', e => {
    mxBlob = (e.clientX / window.innerWidth - 0.5) * 2;
    myBlob = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
  document.addEventListener('touchmove', e => {
    mxBlob = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
    myBlob = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const clock = new THREE.Clock();
  let frame = 0;

  // Drooping offset — makes the bottom slightly heavier like the reference
  const droopStrength = 0.045;

  function animate() {
    requestAnimationFrame(animate);
    frame++;
    const t = clock.getElapsedTime();

    smX += (mxBlob - smX) * 0.025;
    smY += (myBlob - smY) * 0.025;

    // Two-layer deformation: slow macro + faster micro ripple
    const f1 = 0.52, s1 = 0.055, sp1 = 0.16;
    const f2 = 1.35, s2 = 0.020, sp2 = 0.38;

    for (let i = 0; i < vCount; i++) {
      const ox = orig[i * 3], oy = orig[i * 3 + 1], oz = orig[i * 3 + 2];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const nx = ox / len, ny = oy / len, nz = oz / len;

      const n1 = pnoise(
        nx * f1 + t * sp1 + smX * 0.10,
        ny * f1 + t * sp1 * 0.75,
        nz * f1 + t * sp1 * 0.88 + smY * 0.10
      );
      const n2 = pnoise(
        nx * f2 + t * sp2 * 0.55,
        ny * f2 + t * sp2,
        nz * f2 + t * sp2 * 0.72
      );

      // Droop: vertices at the bottom (ny < 0) sag slightly downward
      const droop = ny < 0 ? ny * droopStrength * (1 + Math.sin(t * 0.3) * 0.2) : 0;

      const d = 1.0 + n1 * s1 + n2 * s2;
      posAttr.setXYZ(i, ox * d, oy * d + droop, oz * d);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Slow dignified rotation
    sphere.rotation.y = t * 0.07 + smX * 0.15;
    sphere.rotation.x = Math.sin(t * 0.045) * 0.05 + smY * 0.07;

    // Animate orbs — creates shifting iridescent highlights
    orb1.position.x = Math.sin(t * 0.48) * 2.6;
    orb1.position.y = Math.cos(t * 0.36) * 2.2 + 0.8;
    orb1.position.z = Math.cos(t * 0.20) * 1.4 + 1.8;

    orb2.position.x = Math.cos(t * 0.40) * 3.0;
    orb2.position.y = Math.sin(t * 0.28) * 1.9 - 0.6;
    orb2.position.z = Math.sin(t * 0.17) * 1.2 + 1.6;

    orb3.position.x = Math.sin(t * 0.55) * 1.8;
    orb3.position.y = Math.cos(t * 0.42) * 2.5 + 1.5;
    orb3.position.z = Math.cos(t * 0.33) * 1.0 + 2.2;

    orb4.position.x = Math.cos(t * 0.35) * 2.4;
    orb4.position.y = Math.sin(t * 0.50) * 1.6 - 2.2;
    orb4.position.z = Math.sin(t * 0.24) * 1.5 + 1.0;

    // Refresh env map every 3 frames
    if (frame % 3 === 0) {
      sphere.visible = false;
      cubeCamera.update(renderer, scene);
      sphere.visible = true;
    }

    renderer.render(scene, camera);
  }

  animate();
})();


// ── LOADER + restore saved photo ──
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }, 1800);
  const saved = localStorage.getItem('kelly_about_photo');
  if (saved) {
    const img = document.getElementById('studio-photo');
    const box = document.getElementById('aboutImageBox');
    if (img) img.src = saved;
    if (box) box.classList.add('has-photo');
  }
});

// ── NAV SCROLL ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
});

// ── HAMBURGER MENU ──
function toggleMenu() {
  const overlay = document.getElementById('navOverlay');
  const burger = document.getElementById('navHamburger');
  if (!overlay || !burger) return;
  const isOpen = overlay.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMenu() {
  const overlay = document.getElementById('navOverlay');
  const burger = document.getElementById('navHamburger');
  if (overlay) overlay.classList.remove('open');
  if (burger) burger.classList.remove('open');
  document.body.style.overflow = '';
}

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
        const prog = Math.min((now - start) / dur, 1);
        c.textContent = Math.floor((1 - Math.pow(1 - prog, 3)) * target);
        if (prog < 1) requestAnimationFrame(tick); else c.textContent = target;
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
    const body = document.getElementById('sb-' + i);
    if (!body) return;
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
const prices = { monthly: ['$1,200', '$2,800', '$5,500'], project: ['$3,400', '$6,800', '$14,000'] };
const periods = { monthly: 'per month', project: 'flat rate' };

function setPricing(type) {
  document.querySelectorAll('.pricing-toggle button').forEach((b, i) =>
    b.classList.toggle('active', (type === 'monthly' && i === 0) || (type === 'project' && i === 1))
  );
  [0, 1, 2].forEach(i => {
    const el = document.getElementById('price-' + i);
    const per = document.getElementById('period-' + i);
    if (!el || !per) return;
    el.style.cssText = 'transform:translateY(-10px);opacity:0;';
    setTimeout(() => {
      el.textContent = prices[type][i];
      per.textContent = periods[type];
      el.style.cssText = 'transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.4s;transform:translateY(0);opacity:1;';
    }, 200 + i * 60);
  });
}

// ── PHOTO UPLOAD ──
function loadPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    const img = document.getElementById('studio-photo');
    const box = document.getElementById('aboutImageBox');
    if (img) img.src = dataUrl;
    if (box) box.classList.add('has-photo');
    try { localStorage.setItem('kelly_about_photo', dataUrl); }
    catch (err) { console.warn('Photo too large for localStorage:', err); }
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
      body: JSON.stringify({ message: text, history: chatHistory }),
    });
    removeTyping(typingId);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const reply = data.reply || "I'm not sure, but Kelly would love to answer that directly!";
    appendMsg('ai', reply);
    chatHistory.push({ role: 'user', parts: [{ text: text }] });
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
  } catch (err) {
    removeTyping(typingId);
    appendMsg('ai', "I'm having a little trouble right now. Feel free to reach out to Kelly directly!");
  }
}

function quickAsk(text) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  input.value = text;
  sendMessage();
}

function appendMsg(role, text) {
  const box = document.getElementById('chatMessages');
  if (!box) return;
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
  if (!box) return '';
  const id = 'typing-' + Date.now();
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
