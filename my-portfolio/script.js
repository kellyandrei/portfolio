/*══════════════════════════════════════════════════════════════
  THREE.JS — GOLDEN SOUTH SEA PEARL — CUSTOM GLSL SHADER
  All lustre, highlight, shadow, and subsurface glow is
  computed directly in GLSL — no env maps, no standard material.
  Vertex shader: Perlin noise organic deformation.
  Fragment shader: pearl BRDF — warm gold base, cream highlight
  lobe, deep amber shadow, subsurface inner glow, fresnel rim.
══════════════════════════════════════════════════════════════*/
let chatHistory = [];

(function () {
  const canvas = document.getElementById('blob-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 5.0);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Geometry ──
  const geo = new THREE.SphereGeometry(1.6, 192, 192);

  // ── VERTEX SHADER ──
  // Perlin noise deformation baked directly into the shader.
  // Keeps the sphere nearly round with gentle organic breathing.
  const vertexShader = `
    uniform float uTime;
    uniform vec2  uMouse;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;

    //── Permutation hash ──
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    //── 3D Simplex noise ──
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x  = x_ *ns.x + ns.yyyy;
      vec4 y  = y_ *ns.x + ns.yyyy;
      vec4 h  = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 pos = position;
      vec3 n   = normalize(pos);

      // Two-octave noise — macro breathing + micro surface detail
      float noise1 = snoise(n * 0.55 + uTime * 0.13 + vec3(uMouse * 0.08, 0.0));
      float noise2 = snoise(n * 1.40 + uTime * 0.32);
      float disp   = noise1 * 0.032 + noise2 * 0.014;

      pos += n * disp;

      vPosition    = pos;
      vNormal      = normalize(normalMatrix * normal);
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vViewDir     = normalize(cameraPosition - (modelMatrix * vec4(pos, 1.0)).xyz);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  // ── FRAGMENT SHADER ──
  // Pearl BRDF built from scratch:
  //   1. Warm gold base colour
  //   2. Large soft highlight lobe (cream-white, upper-left)
  //   3. Small sharp specular spot inside the main lobe
  //   4. Deep amber shadow on the opposite side
  //   5. Subsurface inner glow — the "depth" you see in real pearls
  //   6. Fresnel rim — soft brightening at grazing angles
  //   7. Soft cast shadow gradient at the bottom
  const fragmentShader = `
    uniform float uTime;
    uniform vec2  uMouse;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;

    // Palette
    const vec3 COL_BASE       = vec3(0.82, 0.62, 0.28);   // warm champagne gold
    const vec3 COL_HIGHLIGHT  = vec3(1.00, 0.97, 0.88);   // cream-white highlight
    const vec3 COL_SHADOW     = vec3(0.42, 0.24, 0.06);   // deep amber shadow
    const vec3 COL_SUBSURFACE = vec3(0.95, 0.78, 0.42);   // inner golden glow
    const vec3 COL_RIM        = vec3(1.00, 0.92, 0.70);   // warm rim

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewDir);

      // ── Light direction — upper-left, slightly forward ──
      // Animates very slowly to give the lustre shift effect
      float lt = uTime * 0.18;
      vec3 L = normalize(vec3(
        -0.55 + sin(lt) * 0.08 + uMouse.x * 0.12,
         0.70 + cos(lt * 0.7) * 0.06 + uMouse.y * 0.08,
         0.80
      ));

      // ── Diffuse — Lambertian base ──
      float NdotL = max(dot(N, L), 0.0);

      // ── Main highlight lobe ──
      // Large, very soft — the big cream patch on the reference image.
      // Uses a halfway vector with low shininess for broad spread.
      vec3  H1        = normalize(L + V);
      float NdotH1    = max(dot(N, H1), 0.0);
      float highlight = pow(NdotH1, 18.0);   // low exponent = broad soft lobe

      // ── Sharp specular spot — the small bright point inside the lobe ──
      float specular  = pow(NdotH1, 120.0);  // high exponent = tight spot

      // ── Shadow — ambient occlusion feel on the opposite side ──
      // Faces away from light get pushed toward deep amber
      float shadow = 1.0 - smoothstep(0.0, 1.0, NdotL + 0.35);

      // ── Subsurface scattering approximation ──
      // Light wraps around the sphere and glows from within.
      // Simulated as a broad back-scatter term.
      float sss = pow(max(dot(-N, L) + 0.4, 0.0), 2.5) * 0.35;

      // ── Fresnel rim ──
      // Pearls brighten slightly at grazing angles.
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5) * 0.55;

      // ── Compose ──
      // Start with base colour modulated by diffuse
      vec3 col = mix(COL_BASE * 0.55, COL_BASE, NdotL * 0.8 + 0.2);

      // Blend shadow into the dark side
      col = mix(col, COL_SHADOW, shadow * 0.62);

      // Add subsurface warmth
      col += COL_SUBSURFACE * sss;

      // Add the main broad highlight lobe
      col = mix(col, COL_HIGHLIGHT, highlight * 0.88);

      // Add the tight specular spot on top
      col += COL_HIGHLIGHT * specular * 1.1;

      // Add fresnel rim brightening
      col += COL_RIM * fresnel * 0.45;

      // ── Cast shadow vignette at the bottom ──
      // The reference image has a soft shadow pooling beneath the pearl.
      // We fake this as a darkening of the very bottom of the sphere.
      float bottomFade = smoothstep(-0.3, -1.6, vPosition.y);
      col = mix(col, col * 0.72, bottomFade * 0.5);

      // ── Tone mapping — keep it warm, not blown out ──
      col = col / (col + vec3(0.85));   // Reinhard-ish
      col = pow(col, vec3(0.88));       // slight gamma lift for warmth

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ── Uniforms ──
  const uniforms = {
    uTime:  { value: 0.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });

  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  // ── Soft drop shadow — ellipse beneath the pearl ──
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.09,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, -1.72, 0);
  shadowPlane.scale.set(2.6, 0.55, 1);
  scene.add(shadowPlane);

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

    smX += (mxBlob - smX) * 0.025;
    smY += (myBlob - smY) * 0.025;

    uniforms.uTime.value  = t;
    uniforms.uMouse.value.set(smX, smY);

    // Very slow dignified rotation
    sphere.rotation.y = t * 0.055 + smX * 0.10;
    sphere.rotation.x = Math.sin(t * 0.038) * 0.04 + smY * 0.06;

    // Shadow follows mouse subtly
    shadowPlane.position.x = smX * 0.06;

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
