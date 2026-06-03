/* ============================================================
   /bp/ — 3D Hero Scene  (reference implementation for handoff)
   ------------------------------------------------------------
   Re-skins the existing "floating works diorama" in the new
   identity. Pure Three.js (r128). All brand values mirror
   design-system/tokens.css — see BP.color below.

   STRUCTURE
   - a phosphor-green field grid (the floor)
   - floating "work" panels, drawn from the DS card spec
   - floating phoneme pills (the logo DNA)
   - kept // code-comment stickers
   - dust particles + green key light + mouse parallax

   Everything crisp (text, UI) lives in the DOM overlay in the
   HTML file; this canvas is the atmospheric 3D layer behind it.
   ============================================================ */

const BP = {
  color: {
    ink900: '#0c0c0e', ink850: '#101012', ink800: '#161619',
    ink700: '#1d1d21', ink600: '#26262b', ink500: '#34343a',
    cream: '#f4f0e8', dim1: '#9a958b', dim2: '#6f6b62',
    green: '#57d36a', lime: '#c7ee5e', coral: '#ec9576',
    magenta: '#e63b6d', violet: '#9b8cff',
  },
  font: {
    display: "'Bricolage Grotesque', sans-serif",
    mono: "'JetBrains Mono', monospace",
  }
};

/* ---------- canvas-texture helpers (2x for crispness) ---------- */
const DPR_TEX = 2;
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w * DPR_TEX; c.height = h * DPR_TEX;
  const ctx = c.getContext('2d');
  ctx.scale(DPR_TEX, DPR_TEX);
  c.cssW = w; c.cssH = h;
  return { c, ctx };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* a floating project panel — mirrors the DS .proj card */
function drawCard({ accent, kicker, title, desc, chips }) {
  const W = 340, H = 220;
  const { c, ctx } = makeCanvas(W, H);
  // body
  ctx.fillStyle = BP.color.ink800;
  roundRect(ctx, 1, 1, W - 2, H - 2, 16); ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = BP.color.ink600; ctx.stroke();
  // colored top bar (clipped to rounded top)
  ctx.save(); roundRect(ctx, 1, 1, W - 2, H - 2, 16); ctx.clip();
  ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 8);
  ctx.restore();
  // kicker
  ctx.fillStyle = accent;
  ctx.font = `500 12px ${BP.font.mono}`;
  ctx.fillText(kicker, 22, 44);
  // title
  ctx.fillStyle = BP.color.cream;
  ctx.font = `700 27px ${BP.font.display}`;
  ctx.fillText(title, 21, 84);
  // desc (wrap two lines)
  ctx.fillStyle = BP.color.dim1;
  ctx.font = `400 14px ${BP.font.display}`;
  wrap(ctx, desc, 22, 112, W - 44, 21, 2);
  // chips
  let cx = 22; const cy = H - 38;
  ctx.font = `500 12px ${BP.font.mono}`;
  chips.forEach(ch => {
    const tw = ctx.measureText(ch).width;
    const pw = tw + 22;
    ctx.strokeStyle = BP.color.ink600; ctx.fillStyle = BP.color.ink700;
    roundRect(ctx, cx, cy, pw, 24, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = BP.color.dim1; ctx.fillText(ch, cx + 11, cy + 16);
    cx += pw + 8;
  });
  return c;
}
function wrap(ctx, text, x, y, maxW, lh, maxLines) {
  const words = text.split(' '); let line = '', ln = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y); line = words[i] + ' '; y += lh; ln++;
      if (ln >= maxLines - 1) { // last line, ellipsis if needed
        let rest = words.slice(i).join(' ');
        while (ctx.measureText(rest + '…').width > maxW && rest.length) rest = rest.slice(0, -1);
        ctx.fillText(rest + (words.slice(i).join(' ').length > rest.length ? '…' : ''), x, y);
        return;
      }
    } else line = test;
  }
  ctx.fillText(line.trim(), x, y);
}

/* the /bp/ phoneme pill (and small standalone pills) */
function drawPill(text, bg, fg, withSlashes) {
  const pad = 26, fs = 54;
  const { c: m } = makeCanvas(10, 10); const mctx = m.getContext('2d');
  mctx.font = `800 ${fs}px ${BP.font.mono}`;
  const label = withSlashes ? `/${text}/` : text;
  const tw = mctx.measureText(label).width;
  const W = Math.ceil(tw + pad * 2), H = Math.ceil(fs + pad * 1.3);
  const { c, ctx } = makeCanvas(W, H);
  ctx.fillStyle = bg; roundRect(ctx, 0, 0, W, H, H / 2); ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fs}px ${BP.font.mono}`;
  // slashes dimmed
  let x = pad;
  if (withSlashes) {
    ctx.fillStyle = fg; ctx.globalAlpha = 0.5; ctx.fillText('/', x, H / 2 + 2);
    x += ctx.measureText('/').width; ctx.globalAlpha = 1;
    ctx.fillStyle = fg; ctx.fillText(text, x, H / 2 + 2);
    x += ctx.measureText(text).width;
    ctx.globalAlpha = 0.5; ctx.fillText('/', x, H / 2 + 2); ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = fg; ctx.fillText(text, pad, H / 2 + 2);
  }
  return c;
}

/* kept // code-comment sticker */
function drawSticker(text, accent) {
  const fs = 22, pad = 16;
  const { c: m } = makeCanvas(10, 10); const mctx = m.getContext('2d');
  mctx.font = `500 ${fs}px ${BP.font.mono}`;
  const label = '// ' + text;
  const tw = mctx.measureText(label).width;
  const W = Math.ceil(tw + pad * 2), H = fs + pad;
  const { c, ctx } = makeCanvas(W, H);
  ctx.fillStyle = BP.color.ink800; roundRect(ctx, 0, 0, W, H, 8); ctx.fill();
  ctx.strokeStyle = BP.color.ink600; ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${fs}px ${BP.font.mono}`;
  ctx.fillStyle = BP.color.dim2; ctx.fillText('// ', pad, H / 2 + 1);
  ctx.fillStyle = accent; ctx.fillText(text, pad + ctx.measureText('// ').width, H / 2 + 1);
  return c;
}

/* a small terminal/build.log panel */
function drawTerminal() {
  const W = 330, H = 150;
  const { c, ctx } = makeCanvas(W, H);
  ctx.fillStyle = BP.color.ink900; roundRect(ctx, 1, 1, W - 2, H - 2, 14); ctx.fill();
  ctx.strokeStyle = BP.color.ink600; ctx.stroke();
  // bar
  ctx.save(); roundRect(ctx, 1, 1, W - 2, H - 2, 14); ctx.clip();
  ctx.fillStyle = BP.color.ink800; ctx.fillRect(0, 0, W, 34);
  [BP.color.magenta, BP.color.lime, BP.color.green].forEach((col, i) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(18 + i * 16, 17, 5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = BP.color.dim1; ctx.font = `400 11px ${BP.font.mono}`;
  ctx.fillText('~/bruce — build.log', 74, 21);
  ctx.restore();
  // lines
  ctx.font = `400 13px ${BP.font.mono}`;
  const rows = [
    [['✓ ', BP.color.green], ['2025 ', BP.color.dim2], ['worlds champions', BP.color.cream]],
    [['✓ ', BP.color.green], ['2024 ', BP.color.dim2], ['word wiz · 4k readers', BP.color.cream]],
    [['// next: ', BP.color.dim2], ['sim pipeline', BP.color.green]],
  ];
  rows.forEach((row, r) => {
    let x = 20; const y = 64 + r * 26;
    row.forEach(([t, col]) => { ctx.fillStyle = col; ctx.fillText(t, x, y); x += ctx.measureText(t).width; });
  });
  return c;
}

/* ============================================================
   SCENE
   ============================================================ */
function initScene(canvas, onReady) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0c0c0e, 9, 26);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 14);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(4, 6, 8); scene.add(key);
  const glow = new THREE.PointLight(0x57d36a, 0.9, 30); glow.position.set(-5, 2, 4); scene.add(glow);

  // a group we parallax/auto-rotate.
  // biased to the right + scaled down so the left copy column stays clear.
  const world = new THREE.Group();
  world.position.x = 3.7;
  world.position.y = -0.2;
  world.scale.setScalar(0.78);
  scene.add(world);

  /* ---- field grid (the floor) ---- */
  const grid = new THREE.GridHelper(60, 60, 0x57d36a, 0x26262b);
  grid.material.transparent = true; grid.material.opacity = 0.32;
  grid.position.y = -3.2; world.add(grid);
  // a second finer green grid that pulses subtly handled in animate via opacity

  /* ---- helper to add a textured floating panel ---- */
  const floaters = [];
  function addPanel(canvasTex, { x, y, z, scale = 1, rot = 0, glowColor = null }) {
    const tex = new THREE.CanvasTexture(canvasTex);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearFilter;
    const aspect = canvasTex.cssW / canvasTex.cssH;
    const h = 2.0 * scale, w = h * aspect;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rot;
    world.add(mesh);
    // optional soft glow plane behind
    if (glowColor) {
      const g = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.5, h * 1.5),
        new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.12 })
      );
      g.position.set(x, y, z - 0.05); g.rotation.z = rot; world.add(g);
    }
    floaters.push({ mesh, baseY: y, phase: Math.random() * Math.PI * 2, amp: 0.12 + Math.random() * 0.12, spin: rot });
    return mesh;
  }

  /* ---- content: the floating works diorama ----
     layout is biased right (world.position.x) and depth-staggered so
     nothing crowds the headline. front layer = hero mark + 1 card;
     mid layer = supporting cards; back layer = pills/stickers/atmosphere. */

  // hero /bp/ pill — the anchor, upper-right, green glow
  addPanel(drawPill('bp', BP.color.green, BP.color.ink900, true),
    { x: 2.4, y: 2.0, z: -0.4, scale: 0.86, rot: -0.05, glowColor: 0x57d36a });

  // primary card — Word Wiz, dropped low-right so it clears the lede
  addPanel(drawCard({ accent: BP.color.green, kicker: '// flagship · solo', title: 'Word Wiz AI',
    desc: 'A reading tutor that hears the sounds kids miss.', chips: ['React', 'FastAPI', '5 ML'] }),
    { x: 1.8, y: -2.0, z: 1.0, scale: 0.8, rot: 0.04 });

  // supporting cards — pushed back & out
  addPanel(drawCard({ accent: BP.color.magenta, kicker: '// robotics · iron panthers', title: 'Robot Sim',
    desc: 'A software twin of the robot. 3× the team speed.', chips: ['Java', 'WPILib'] }),
    { x: 5.0, y: -1.1, z: -1.6, scale: 0.72, rot: -0.05 });

  addPanel(drawCard({ accent: BP.color.coral, kicker: '// full-stack', title: 'Scouting App',
    desc: 'Real-time match data for the whole team.', chips: ['React', 'Firebase'] }),
    { x: 4.6, y: 1.9, z: -3.0, scale: 0.66, rot: 0.06 });

  // terminal panel — upper right, mid-back
  addPanel(drawTerminal(), { x: 2.9, y: 3.0, z: -2.2, scale: 0.64, rot: 0.02 });

  // floating phoneme pills (the logo DNA scattered) — small, varied depth
  addPanel(drawPill('b', BP.color.green, BP.color.ink900, false), { x: 0.2, y: 2.6, z: 0.2, scale: 0.42, rot: 0.1 });
  addPanel(drawPill('r', BP.color.lime, BP.color.ink900, false), { x: 3.6, y: -2.8, z: 0.6, scale: 0.42, rot: -0.12 });
  addPanel(drawPill('oo', BP.color.coral, BP.color.ink900, false), { x: 6.2, y: 0.6, z: -1.2, scale: 0.42, rot: 0.08 });
  addPanel(drawPill('s', BP.color.magenta, '#fff', false), { x: -1.6, y: 0.4, z: -2.6, scale: 0.42, rot: -0.1 });

  // kept code-comment stickers — atmosphere, mostly background
  addPanel(drawSticker('three.js', BP.color.violet), { x: 3.4, y: -3.0, z: -0.6, scale: 0.5, rot: -0.08 });
  addPanel(drawSticker('Java', BP.color.green), { x: -1.0, y: 3.2, z: -1.8, scale: 0.5, rot: 0.07 });
  addPanel(drawSticker('WPILib', BP.color.lime), { x: 6.6, y: 2.2, z: -2.4, scale: 0.46, rot: 0.05 });

  /* ---- dust particles ---- */
  const pCount = 220;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x57d36a, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  world.add(particles);

  /* ---- interaction: mouse parallax ---- */
  const target = { x: 0, y: 0 }; const cur = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    target.x = (e.clientX / innerWidth - 0.5);
    target.y = (e.clientY / innerHeight - 0.5);
  });

  /* ---- resize ---- */
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---- loop ---- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  let firstFrame = true;
  function tick() {
    const t = clock.getElapsedTime();
    cur.x += (target.x - cur.x) * 0.04;
    cur.y += (target.y - cur.y) * 0.04;
    if (!reduce) {
      world.rotation.y = cur.x * 0.35 + Math.sin(t * 0.1) * 0.04;
      world.rotation.x = cur.y * 0.2;
      camera.position.x = cur.x * 1.2;
      camera.position.y = 0.6 - cur.y * 0.8;
      camera.lookAt(0, 0, 0);
      // bob the floaters
      floaters.forEach(f => { f.mesh.position.y = f.baseY + Math.sin(t * 0.7 + f.phase) * f.amp; });
      particles.rotation.y = t * 0.02;
      grid.material.opacity = 0.26 + Math.sin(t * 0.6) * 0.07;
      glow.position.x = Math.sin(t * 0.3) * 5;
    }
    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; if (onReady) onReady(); }
    requestAnimationFrame(tick);
  }
  tick();
}

/* boot once fonts are ready so canvas text uses the brand faces */
window.BP_BOOT = function (canvas, onReady) {
  if (document.fonts && document.fonts.ready) {
    Promise.all([
      document.fonts.load("800 54px 'JetBrains Mono'"),
      document.fonts.load("500 12px 'JetBrains Mono'"),
      document.fonts.load("700 27px 'Bricolage Grotesque'"),
      document.fonts.load("400 14px 'Bricolage Grotesque'"),
    ]).then(() => initScene(canvas, onReady)).catch(() => initScene(canvas, onReady));
  } else initScene(canvas, onReady);
};
