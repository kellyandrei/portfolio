/*══════════════════════════════════════════════════════════════
  THREE.JS — FLUID GOLD ORB  v6
  - Large orb filling lower hero, bleeding off screen bottom
  - Rich deep amber → champagne → cream-white fresnel glow
  - Dense sparkling particle field on the surface
  - Strong simplex noise displacement for fluid organic shape
  - Background colour matches orb warmth (no hard edge)
══════════════════════════════════════════════════════════════*/
let chatHistory = [];

(function () {
  const canvas = document.getElementById('blob-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  // Camera — pulled back enough to see the full large orb
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 4.8;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ══ VERTEX SHADER ══
  // Heavy simplex displacement — what makes it look fluid, not spherical
  const vertexShader = `
    uniform float uTime;
    uniform vec2  uMouse;

    varying vec3 vNormal;
    varying vec3 vPosition;

    vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 =   v - i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x  = x_ * ns.x + ns.yyyy;
      vec4 y  = y_ * ns.x + ns.yyyy;
      vec4 h  = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    void main() {
      vNormal   = normal;
      vPosition = position;

      // Two noise octaves — large slow undulation + fine surface churn
      vec3 np1 = position * 1.3 + uTime * 0.35 + vec3(uMouse * 0.20, 0.0);
      vec3 np2 = position * 2.6 + uTime * 0.58;

      float n = snoise(np1) * 0.20 + snoise(np2) * 0.08;

      vec3 displaced = position + normal * n;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `;

  // ══ FRAGMENT SHADER ══
  // Rich gold palette matching BlueYard energy but in gold tones.
  // Deep burnt amber core → warm champagne → cream-white rim bloom.
  const fragmentShader = `
    uniform float uTime;

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Fresnel — edge brightness
      vec3 N = normalize(vNormal);
      float fresnel = pow(1.0 - abs(dot(N, vec3(0.0, 0.0, 1.0))), 2.0);

      // Rich gold palette
      vec3 coreAmber   = vec3(0.72, 0.28, 0.08);   // deep burnt amber — the dark centre
      vec3 midGold     = vec3(0.90, 0.60, 0.20);   // warm mid gold
      vec3 champagne   = vec3(0.96, 0.82, 0.52);   // bright champagne
      vec3 rimCream    = vec3(1.00, 0.95, 0.80);   // cream-white rim glow

      // Vertical gradient — dark at bottom, lighter at top
      float vert = clamp(vPosition.y * 0.42 + 0.55, 0.0, 1.0);
      vec3 col = mix(coreAmber, midGold, vert);
      col = mix(col, champagne, vert * vert * 0.5);

      // Fresnel pushes edges to bright cream
      col = mix(col, rimCream, fresnel * 0.90);

      // Animated shimmer across surface
      float shimmer = sin(vPosition.x * 5.0 + uTime * 0.7) *
                      cos(vPosition.y * 4.0 + uTime * 0.5) * 0.055;
      col += vec3(shimmer, shimmer * 0.7, shimmer * 0.2);

      // Extra rim glow
      col += rimCream * fresnel * 0.22;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ── Orb — large sphere ──
  const orbGeo = new THREE.SphereGeometry(1.7, 192, 192);
  const uniforms = {
    uTime:  { value: 0.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  };
  const orbMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  // Orb sits centered — CSS positions canvas so bottom bleeds off screen
  orb.position.y = 0;
  scene.add(orb);

  // ── Dense glittering particle field on the surface ──
  // BlueYard has a very dense sparkle field — we match that
  const PARTICLE_COUNT = 1800;
  const pGeo    = new THREE.BufferGeometry();
  const pPos    = new Float32Array(PARTICLE_COUNT * 3);
  const pRandom = new Float32Array(PARTICLE_COUNT);
  const pSizes  = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Tight shell — particles hug the surface closely
    const radius = 1.72 + Math.random() * 0.55;
    const u      = Math.random();
    const v      = Math.random();
    const theta  = u * 2.0 * Math.PI;
    const phi    = Math.acos(2.0 * v - 1.0);

    pPos[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    pPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    pPos[i * 3 + 2] = radius * Math.cos(phi);
    pRandom[i]      = Math.random();
    pSizes[i]       = 0.012 + Math.random() * 0.018;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

  const pMat = new THREE.PointsMaterial({
    color:       0xfff0c0,   // bright cream-gold sparks
    size:        0.022,
    transparent: true,
    opacity:     0.70,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Mouse tracking
  let mxBlob = 0, myBlob = 0, smX = 0, smY = 0;
  document.addEventListener('mousemove', e => {
    mxBlob = (e.clientX / window.innerWidth  - 0.5) * 2;
    myBlob = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
  document.addEventListener('touchmove', e => {
    mxBlob = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
    myBlob = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    smX += (mxBlob - smX) * 0.04;
    smY += (myBlob - smY) * 0.04;

    uniforms.uTime.value = t;
    uniforms.uMouse.value.set(smX, smY);

    orb.rotation.y = t * 0.045;
    particles.rotation.y = -t * 0.022;
    particles.rotation.x = Math.sin(t * 0.08) * 0.04;

    // Drift particles — slow upward float
    const posAttr = pGeo.getAttribute('position');
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let y = posAttr.getY(i);
      y += Math.sin(t * 0.8 + pRandom[i] * 80) * 0.0008 + 0.0003;
      if (y > 2.6) y = -2.2;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;

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
  const burger  = document.getElementById('navHamburger');
  if (!overlay || !burger) return;
  const isOpen = overlay.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}
function closeMenu() {
  const overlay = document.getElementById('navOverlay');
  const burger  = document.getElementById('navHamburger');
  if (overlay) overlay.classList.remove('open');
  if (burger)  burger.classList.remove('open');
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
const prices  = { monthly: ['$1,200','$2,800','$5,500'], project: ['$3,400','$6,800','$14,000'] };
const periods = { monthly: 'per month', project: 'flat rate' };
function setPricing(type) {
  document.querySelectorAll('.pricing-toggle button').forEach((b, i) =>
    b.classList.toggle('active', (type === 'monthly' && i === 0) || (type === 'project' && i === 1))
  );
  [0,1,2].forEach(i => {
    const el  = document.getElementById('price-'  + i);
    const per = document.getElementById('period-' + i);
    if (!el || !per) return;
    el.style.cssText = 'transform:translateY(-10px);opacity:0;';
    setTimeout(() => {
      el.textContent  = prices[type][i];
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
  const text  = input.value.trim();
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
    const data  = await res.json();
    const reply = data.reply || "I'm not sure, but Kelly would love to answer that directly!";
    appendMsg('ai', reply);
    chatHistory.push({ role: 'user',  parts: [{ text: text  }] });
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
