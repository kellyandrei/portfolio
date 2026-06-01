/*══════════════════════════════════════════════════════════════
  THREE.JS — CHROMATIC GOLD LIQUID METAL BLOB
  Rebuilt: true metallic sphere with iridescent color shifting,
  multi-layer specular highlights, and smooth organic deformation.
  No more snot. This reads as molten gold / liquid chrome.
══════════════════════════════════════════════════════════════*/
let chatHistory = [];

(function () {
  const canvas = document.getElementById('blob-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();

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

  // ── Cube render target for real-time env reflections ──
  const cubeRT = new THREE.WebGLCubeRenderTarget(512, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeRT);
  scene.add(cubeCamera);

  // ── Scene background: rich dark void so reflections pop ──
  scene.background = null; // stays transparent — page bg shows through

  // ══ LIGHTING SETUP — chromatic gold iridescent ══

  // Primary warm gold key light — strong, directional
  const keyLight = new THREE.DirectionalLight(0xffd080, 8.0);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  // Cool blue-white fill from opposite — creates chromatic shift
  const fillLight = new THREE.DirectionalLight(0x88ccff, 4.0);
  fillLight.position.set(-4, -2, 3);
  scene.add(fillLight);

  // Warm amber rim from behind — edge glow
  const rimLight = new THREE.DirectionalLight(0xff9933, 5.0);
  rimLight.position.set(0, -4, -5);
  scene.add(rimLight);

  // Soft rose/copper undertone from below
  const underLight = new THREE.DirectionalLight(0xff6644, 2.5);
  underLight.position.set(-2, -5, 2);
  scene.add(underLight);

  // Ambient — low, warm, keeps dark side visible
  scene.add(new THREE.AmbientLight(0xffe8d0, 0.4));

  // Animated specular orbs — these create the "liquid" shimmer
  const orb1 = new THREE.PointLight(0xfff0aa, 20, 8);
  orb1.position.set(2.0, 2.5, 2.5);
  scene.add(orb1);

  const orb2 = new THREE.PointLight(0x88ddff, 12, 8);
  orb2.position.set(-2.5, -1.5, 2.0);
  scene.add(orb2);

  const orb3 = new THREE.PointLight(0xff8833, 10, 7);
  orb3.position.set(1.5, -3.0, -2.0);
  scene.add(orb3);

  // ── Colorful env backdrop panels (never visible, only reflected) ──
  // These give the sphere rich color variance in its reflections
  const envColors = [
    { color: 0xffd060, pos: [0, 0, -8] },   // gold behind
    { color: 0x4488ff, pos: [8, 0, 0] },    // blue right
    { color: 0xff6600, pos: [-8, 0, 0] },   // orange left
    { color: 0xffffff, pos: [0, 8, 0] },    // white top
    { color: 0x331100, pos: [0, -8, 0] },   // dark bottom
  ];
  envColors.forEach(({ color, pos }) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  });

  // ── Geometry — high-resolution for smooth deformation ──
  const geo = new THREE.SphereGeometry(1.55, 160, 160);
  const posAttr = geo.attributes.position;
  const vCount = posAttr.count;
  const orig = new Float32Array(posAttr.array);

  // ── Material — true liquid gold chrome ──
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1.0, 0.82, 0.38),      // rich warm gold base
    metalness: 1.0,                                 // fully metallic — no diffuse bleed
    roughness: 0.04,                                // near-mirror, slight spread
    envMap: cubeRT.texture,
    envMapIntensity: 3.5,
  });

  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  // ── Smooth organic noise ──
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(h, x, y, z) {
    h &= 15;
    const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];

  function pnoise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u), lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u), lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w
    );
  }

  // Mouse / touch
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

  function animate() {
    requestAnimationFrame(animate);
    frame++;
    const t = clock.getElapsedTime();

    // Smooth mouse follow
    smX += (mxBlob - smX) * 0.025;
    smY += (myBlob - smY) * 0.025;

    // ── Organic deformation ──
    // Two-layer noise: macro shape + fine surface detail
    // Kept gentle so it reads as liquid metal, not deflating balloon
    const freq1 = 0.55, str1 = 0.055, spd1 = 0.18;  // large, slow undulation
    const freq2 = 1.40, str2 = 0.022, spd2 = 0.40;  // fine surface ripple

    for (let i = 0; i < vCount; i++) {
      const ox = orig[i * 3], oy = orig[i * 3 + 1], oz = orig[i * 3 + 2];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const nx = ox / len, ny = oy / len, nz = oz / len;

      const n1 = pnoise(
        nx * freq1 + t * spd1 + smX * 0.12,
        ny * freq1 + t * spd1 * 0.7,
        nz * freq1 + t * spd1 * 0.85 + smY * 0.12
      );
      const n2 = pnoise(
        nx * freq2 + t * spd2 * 0.6,
        ny * freq2 + t * spd2,
        nz * freq2 + t * spd2 * 0.8
      );

      const d = 1.0 + n1 * str1 + n2 * str2;
      posAttr.setXYZ(i, ox * d, oy * d, oz * d);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Rotation — slow and dignified, not dizzy
    sphere.rotation.y = t * 0.08 + smX * 0.18;
    sphere.rotation.x = Math.sin(t * 0.05) * 0.06 + smY * 0.08;

    // ── Animate light orbs for shimmer ──
    orb1.position.x = Math.sin(t * 0.50) * 2.5;
    orb1.position.y = Math.cos(t * 0.38) * 2.0 + 1.0;
    orb1.position.z = Math.cos(t * 0.22) * 1.5 + 1.5;

    orb2.position.x = Math.cos(t * 0.42) * 2.8;
    orb2.position.y = Math.sin(t * 0.30) * 1.8 - 0.5;
    orb2.position.z = Math.sin(t * 0.18) * 1.2 + 1.5;

    orb3.position.x = Math.sin(t * 0.33) * 2.2;
    orb3.position.y = Math.cos(t * 0.45) * 1.5 - 2.0;
    orb3.position.z = -Math.cos(t * 0.28) * 2.0 - 1.0;

    // Refresh env map every 3rd frame — balance quality vs perf
    if (frame % 3 === 0) {
      sphere.visible = false;
      cubeCamera.update(renderer, scene);
      sphere.visible = true;
    }

    renderer.render(scene, camera);
  }

  animate();
})();


// ── CURSOR ──
(function () {
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  if (!cursor || !ring) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function animCursor() {
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    cursor.style.transform = `translate(${mx - 4}px,${my - 4}px)`;
    ring.style.transform = `translate(${rx - 18}px,${ry - 18}px)`;
    requestAnimationFrame(animCursor);
  })();
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
// Works across all service rows regardless of count
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
