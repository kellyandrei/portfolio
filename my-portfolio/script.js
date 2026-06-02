/*══════════════════════════════════════════════════════════════
  THREE.JS — GOLDEN SOUTH SEA PEARL
  Warm champagne-gold base. Soft creamy highlight upper-left.
  Deep amber shadows lower-right. Pearlescent subsurface glow.
  Gentle organic breathing. Slow dignified rotation.
  No sharp chrome. No rainbow. Just luminous pearl lustre.
══════════════════════════════════════════════════════════════*/
let chatHistory = [];

(function () {
  const canvas = document.getElementById('blob-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Cube render target for real reflections ──
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 50, cubeRT);
  scene.add(cubeCamera);

  // ══ PEARL LIGHTING ══
  // Goal: replicate the look of a real South Sea pearl under studio light.
  // One strong key from upper-left, warm fill, dark negative fill on right.

  // Key light — warm white from upper-left, creates the main bright lobe
  const keyLight = new THREE.DirectionalLight(0xfff8f0, 5.5);
  keyLight.position.set(-2.5, 3.5, 4.0);
  scene.add(keyLight);

  // Secondary warm fill — adds the soft second highlight lobe
  const fillLight = new THREE.DirectionalLight(0xffe8c0, 2.5);
  fillLight.position.set(2.0, 1.5, 3.0);
  scene.add(fillLight);

  // Amber shadow fill from below-right — creates the deep warm shadow area
  const shadowFill = new THREE.DirectionalLight(0xc07820, 1.2);
  shadowFill.position.set(3.5, -3.0, 1.0);
  scene.add(shadowFill);

  // Subtle cool bounce from below — keeps the dark side from going flat black
  const bounceFill = new THREE.DirectionalLight(0xffeedd, 0.6);
  bounceFill.position.set(0, -4, 2);
  scene.add(bounceFill);

  // Warm ambient — the overall bath of golden warmth
  scene.add(new THREE.AmbientLight(0xffd090, 0.9));

  // ── Main specular orb — the bright cream highlight lobe ──
  // This is the key "pearl highlight" you see on the reference image.
  const pearlHighlight = new THREE.PointLight(0xfffaf0, 14, 7);
  pearlHighlight.position.set(-1.8, 2.0, 2.8);
  scene.add(pearlHighlight);

  // Secondary smaller highlight — the small bright spot on the reference
  const pearlHighlight2 = new THREE.PointLight(0xffffff, 6, 5);
  pearlHighlight2.position.set(-0.6, 2.8, 2.4);
  scene.add(pearlHighlight2);

  // Warm amber glow from below — the dark amber area on lower-right of reference
  const amberGlow = new THREE.PointLight(0xd4620a, 4, 6);
  amberGlow.position.set(2.5, -2.0, 1.5);
  scene.add(amberGlow);

  // ── Environment panels — only visible in reflections ──
  // Warm neutral tones to keep the pearl looking golden, not colourful
  const panelData = [
    { color: 0xfff5e0, pos: [0, 0, -10] },
    { color: 0xffe0a0, pos: [-10, 3, 0] },
    { color: 0x8b5c20, pos: [10, -2, 0] },
    { color: 0xfff8f0, pos: [0, 10, 0] },
    { color: 0x3a2a10, pos: [0, -10, 0] },
    { color: 0xc8903a, pos: [5, 5, -8] },
  ];
  panelData.forEach(({ color, pos }) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  });

  // ── Geometry — high-res for smooth surface ──
  const geo = new THREE.SphereGeometry(1.52, 192, 192);
  const posAttr = geo.attributes.position;
  const vCount = posAttr.count;
  const orig = new Float32Array(posAttr.array);

  // ── Pearl material ──
  // Key: metalness NOT 1.0. Pearls are NOT metallic.
  // They have subsurface scattering — light penetrates slightly.
  // We simulate this with: moderate metalness, low-mid roughness,
  // warm base color, and the env map doing the heavy lifting.
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.88, 0.68, 0.32),   // warm champagne gold
    metalness: 0.55,                              // partial — pearl is semi-lustrous
    roughness: 0.18,                              // soft, not chrome-sharp
    envMap: cubeRT.texture,
    envMapIntensity: 1.8,
  });

  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  // ── Subtle drop shadow plane ──
  // Pearls in references always have a soft cast shadow beneath them
  const shadowGeo = new THREE.PlaneGeometry(2.4, 0.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.10,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0.1, -1.85, 0);
  // Scale x to make it oval like a real cast shadow
  shadowPlane.scale.set(1, 0.35, 1);
  scene.add(shadowPlane);

  // ── Perlin noise ──
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
      lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x-1, y, z), u),
           lerp(grad(p[AB], x, y-1, z), grad(p[BB], x-1, y-1, z), u), v),
      lerp(lerp(grad(p[AA+1], x, y, z-1), grad(p[BA+1], x-1, y, z-1), u),
           lerp(grad(p[AB+1], x, y-1, z-1), grad(p[BB+1], x-1, y-1, z-1), u), v),
      w
    );
  }

  // Mouse tracking
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

    smX += (mxBlob - smX) * 0.02;
    smY += (myBlob - smY) * 0.02;

    // ── Very gentle organic breathing ──
    // Pearls are nearly perfect spheres — keep deformation minimal and slow.
    // Just enough to feel alive, not enough to look like it's morphing.
    const freq = 0.48, strength = 0.028, speed = 0.12;

    for (let i = 0; i < vCount; i++) {
      const ox = orig[i * 3], oy = orig[i * 3 + 1], oz = orig[i * 3 + 2];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const nx = ox / len, ny = oy / len, nz = oz / len;

      const n = pnoise(
        nx * freq + t * speed + smX * 0.08,
        ny * freq + t * speed * 0.75,
        nz * freq + t * speed * 0.88 + smY * 0.08
      );

      const d = 1.0 + n * strength;
      posAttr.setXYZ(i, ox * d, oy * d, oz * d);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Slow, dignified rotation — pearls don't spin fast
    sphere.rotation.y = t * 0.06 + smX * 0.12;
    sphere.rotation.x = Math.sin(t * 0.04) * 0.04 + smY * 0.06;

    // ── Animate the main highlight lobe ──
    // Moves very subtly — gives that living pearlescent lustre shift
    pearlHighlight.position.x = -1.8 + Math.sin(t * 0.22) * 0.3;
    pearlHighlight.position.y = 2.0 + Math.cos(t * 0.18) * 0.25;

    pearlHighlight2.position.x = -0.6 + Math.sin(t * 0.30) * 0.2;
    pearlHighlight2.position.y = 2.8 + Math.cos(t * 0.25) * 0.15;

    // Amber glow drifts slowly
    amberGlow.position.x = 2.5 + Math.cos(t * 0.15) * 0.4;
    amberGlow.position.y = -2.0 + Math.sin(t * 0.20) * 0.3;

    // Shadow follows sphere subtly
    shadowPlane.position.x = smX * 0.08;

    // Refresh env every 3 frames
    if (frame % 3 === 0) {
      sphere.visible = false;
      shadowPlane.visible = false;
      cubeCamera.update(renderer, scene);
      sphere.visible = true;
      shadowPlane.visible = true;
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
