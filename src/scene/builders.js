import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PROJECTS, SCREENSHOT_PANES } from "../data/projects.js";
import {
  wordPillTexture,
  phonemeCardTexture,
  recordingPillTexture,
  statusPillTexture,
  projectCardTexture,
  updateProjectCardWithImage,
  makeFloatingCard,
} from "./textures.js";

export function makeStars() {
  const geo = new THREE.BufferGeometry();
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 60 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
    positions[i * 3 + 2] = r * Math.cos(phi);
    const c = 0.4 + Math.random() * 0.6;
    colors[i * 3] = c;
    colors[i * 3 + 1] = c * 0.95;
    colors[i * 3 + 2] = c * 0.85;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.18,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}


export function buildReader(pos) {
  const readerProj = PROJECTS.find((p) => p.id === "reader");
  const g = new THREE.Group();
  g.position.set(...(pos ?? readerProj.pos));

  const clamp01 = v => Math.max(0, Math.min(1, v))

  // ── Timing (seconds) ─────────────────────────────────────────────────────
  // Phase 1 — Recording:  words appear one-by-one as white pills
  // Phase 2 — Analyzing:  all white, pill swaps to "Analyzing..."
  // Phase 3 — Feedback:   white → colored; pill swaps to phoneme result
  // Phase 4 — Hold / Fade-out / Gap
  const WORD_APPEAR  = 0.5
  const WORD_FADE_IN = 0.25
  const N_WORDS      = 6
  const ANALYZE_DUR  = 1.0
  const COLOR_FADE   = 0.55
  const HOLD         = 1.8
  const FADE_OUT     = 0.65
  const GAP          = 0.4
  const PILL_FADE    = 0.35

  const wordsEndT   = N_WORDS * WORD_APPEAR          // 3.0
  const analyzeEndT = wordsEndT + ANALYZE_DUR         // 4.0
  const colorEndT   = analyzeEndT + COLOR_FADE        // 4.55
  const holdEndT    = colorEndT + HOLD                // 6.35
  const SENT_DUR    = holdEndT + FADE_OUT + GAP       // 7.4

  // ── Sentences ─────────────────────────────────────────────────────────────
  // feedback.pill shows in the status pill once analysis is done.
  // bg/fg match the flagged word's pill color so it reads as one system.
  const SENTENCES = [
    {
      rows: [
        [["The","green"],["cat","green"],["sat","green"]],
        [["on","green"],["a","green"],["mat","lime"]],
      ],
      feedback: { label: "/æ/ · mat", bg: "#c7ee5e", fg: "#1d1d21" },
    },
    {
      rows: [
        [["She","green"],["can","green"],["run","coral"]],
        [["and","green"],["play","green"],["tag","green"]],
      ],
      feedback: { label: "/r/ · run", bg: "#ec9576", fg: "#1d1d21" },
    },
    {
      rows: [
        [["Big","green"],["red","green"],["fish","pink"]],
        [["swim","green"],["by","green"],["rocks","green"]],
      ],
      feedback: { label: "/f/ · fish", bg: "#e63b6d", fg: "#ffffff" },
    },
  ];

  // ── Build word mesh groups ────────────────────────────────────────────────
  // Each word gets two meshes (white + colored) at the same position.
  // The animation crossfades between them during the feedback phase.
  const pillH = 0.7;
  const groups = SENTENCES.map((sent) => {
    const sg = new THREE.Group();
    const whiteMeshes = [];
    const colorMeshes = [];

    sent.rows.forEach((row, ri) => {
      const texsW = row.map(([word]) => wordPillTexture(word, "white"));
      const texsC = row.map(([word, variant]) => wordPillTexture(word, variant));
      const rowW  = texsW.reduce((sum, t) => sum + pillH * t.aspect, 0) + (row.length - 1) * 0.18;
      let xCursor = -rowW / 2;

      row.forEach(([, variant], wi) => {
        const tw = texsW[wi];
        const tc = texsC[wi];
        const pw = pillH * tw.aspect;
        const bx = xCursor + pw / 2 + (Math.random() - 0.5) * 0.08;
        const by = 1.0 - ri * 1.0   + (Math.random() - 0.5) * 0.05;
        const bz = (Math.random() - 0.5) * 0.35;
        const rx = (Math.random() - 0.5) * 0.12;
        const ry = (Math.random() - 0.5) * 0.18;
        const rz = (Math.random() - 0.5) * 0.05;
        const ph = Math.random() * Math.PI * 2;

        const wCard = makeFloatingCard(tw, pillH, { depthWrite: false });
        wCard.position.set(bx, by, bz);
        wCard.rotation.set(rx, ry, rz);
        wCard.material.opacity = 0;
        wCard.userData.basePos = wCard.position.clone();
        wCard.userData.baseRot = wCard.rotation.clone();
        wCard.userData.phase   = ph;
        whiteMeshes.push(wCard);
        sg.add(wCard);

        const cCard = makeFloatingCard(tc, pillH, { depthWrite: false });
        cCard.position.set(bx, by, bz + 0.001);
        cCard.rotation.set(rx, ry, rz);
        cCard.material.opacity = 0;
        cCard.userData.basePos = cCard.position.clone();
        cCard.userData.baseRot = cCard.rotation.clone();
        cCard.userData.phase   = ph;
        colorMeshes.push(cCard);
        sg.add(cCard);

        xCursor += pw + 0.18;
      });
    });

    g.add(sg);
    return { whiteMeshes, colorMeshes };
  });

  // ── Status pills — Recording → Analyzing → feedback result ───────────────
  // All positioned at the same spot; only one visible at a time.
  const recTex  = recordingPillTexture();
  const procTex = statusPillTexture("Analyzing...");
  const recPill  = makeFloatingCard(recTex,  0.55, { depthWrite: false });
  const procPill = makeFloatingCard(procTex, 0.52, { depthWrite: false });
  recPill.position.set(0, 2.2, 0);
  procPill.position.set(0, 2.2, 0.003);
  recPill.material.opacity  = 0;
  procPill.material.opacity = 0;
  g.add(recPill);
  g.add(procPill);

  // One feedback pill per sentence (different colors/labels)
  const feedbackPills = SENTENCES.map((sent) => {
    const { label, bg, fg } = sent.feedback;
    const pill = makeFloatingCard(statusPillTexture(label, bg, fg), 0.52, { depthWrite: false });
    pill.position.set(0, 2.2, 0.006);
    pill.material.opacity = 0;
    g.add(pill);
    return pill;
  });

  // ── Hit sphere ────────────────────────────────────────────────────────────
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(4, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.userData.projectId    = "reader";
  hit.userData.isProjectHit = true;
  g.add(hit);

  const BASE_Y = 2.2;

  g.userData = {
    project: readerProj,
    update: (t) => {
      const totalT  = t % (SENT_DUR * SENTENCES.length);
      const sentIdx = Math.floor(totalT / SENT_DUR);
      const sentT   = totalT - sentIdx * SENT_DUR;

      const master = sentT < holdEndT ? 1
        : Math.max(0, 1 - (sentT - holdEndT) / FADE_OUT);

      const pillY = BASE_Y + Math.sin(t * 0.85) * 0.05;

      // Recording pill: visible while words are appearing
      recPill.position.y = pillY;
      recPill.material.opacity = clamp01(
        sentT < wordsEndT
          ? (sentT < 0.3 ? sentT / 0.3 : 1)
          : 1 - (sentT - wordsEndT) / PILL_FADE
      );

      // Analyzing pill: crossfades in after recording, out when feedback arrives
      procPill.position.y = pillY;
      procPill.material.opacity = clamp01(
        sentT < wordsEndT               ? 0
        : sentT < wordsEndT + PILL_FADE ? (sentT - wordsEndT) / PILL_FADE
        : sentT < analyzeEndT           ? 1
        : 1 - (sentT - analyzeEndT) / PILL_FADE
      );

      // Feedback pills: crossfade in when colors appear, fade out with master
      feedbackPills.forEach((pill, gi) => {
        pill.position.y = pillY;
        if (gi !== sentIdx) { pill.material.opacity = 0; return; }
        const fa = sentT < analyzeEndT ? 0
          : clamp01((sentT - analyzeEndT) / PILL_FADE);
        pill.material.opacity = fa * master;
      });

      // Word cards
      groups.forEach((grp, gi) => {
        if (gi !== sentIdx) {
          grp.whiteMeshes.forEach(c => { c.material.opacity = 0; });
          grp.colorMeshes.forEach(c => { c.material.opacity = 0; });
          return;
        }

        grp.whiteMeshes.forEach((card, wi) => {
          const p  = card.userData.phase;
          const dy = Math.sin(t * 0.8 + p) * 0.06;
          const dx = Math.sin(t * 0.4 + p * 1.3) * 0.03;
          const dz = Math.sin(t * 0.5 + p) * 0.015;

          card.position.y = card.userData.basePos.y + dy;
          card.position.x = card.userData.basePos.x + dx;
          card.rotation.z = card.userData.baseRot.z + dz;

          const cc = grp.colorMeshes[wi];
          cc.position.y = cc.userData.basePos.y + dy;
          cc.position.x = cc.userData.basePos.x + dx;
          cc.rotation.z = cc.userData.baseRot.z + dz;

          // White: appears word-by-word, fades out when feedback arrives
          const appearT = wi * WORD_APPEAR;
          let wa = sentT < appearT ? 0 : clamp01((sentT - appearT) / WORD_FADE_IN);
          if (sentT > analyzeEndT) wa *= clamp01(1 - (sentT - analyzeEndT) / COLOR_FADE);
          card.material.opacity = wa * master;

          // Colored: fades in when analyzing phase ends
          const ca = sentT < analyzeEndT ? 0
            : clamp01((sentT - analyzeEndT) / COLOR_FADE);
          cc.material.opacity = ca * master;
        });
      });
    },
  };
  return g;
}

export function buildProjectCard(p, opts = {}) {
  const slim = opts.slim ?? true;

  // In slim mode the card is just the project's screenshot. A project with no
  // image would render as an empty frame — skip it; the scene's other visuals
  // (robot, fields, Word Wiz demo, screenshot panes) carry that node instead.
  if (slim && !p.image) return null;

  const g = new THREE.Group();
  g.position.set(...(opts.pos ?? p.pos));

  const t = projectCardTexture(p, slim);
  const card = makeFloatingCard(t, 2.6);
  card.userData.basePos = new THREE.Vector3(0, 0, 0);
  card.userData.phase = Math.random() * Math.PI * 2;
  g.add(card);

  // If the project carries an image, load it async and paint it into the card panel
  if (p.image) {
    if (p.image2) {
      let img1 = null, img2 = null;
      const tryUpdate = () => { if (img1 && img2) updateProjectCardWithImage(t, p, img1, img2); };
      const i1 = new Image(); i1.onload = () => { img1 = i1; tryUpdate(); }; i1.src = p.image;
      const i2 = new Image(); i2.onload = () => { img2 = i2; tryUpdate(); }; i2.src = p.image2;
    } else {
      const img = new Image();
      img.onload = () => updateProjectCardWithImage(t, p, img);
      img.src = p.image;
    }
  }

  // Archive cards sit on a museum-style pedestal. Group is lifted to y=2.5,
  // so card bottom is at local y=-1.3 (world y=1.2) and ground is local y=-2.5.
  if (p.isArchive) {
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x1a1814,
      roughness: 0.7,
      metalness: 0.15,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x2a2620,
      roughness: 0.55,
      metalness: 0.25,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.6), pedMat);
    base.position.y = -2.43;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const column = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.0, 0.95),
      pedMat
    );
    column.position.y = -1.85;
    column.castShadow = true;
    column.receiveShadow = true;
    g.add(column);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 1.25), capMat);
    cap.position.y = -1.31;
    cap.castShadow = true;
    cap.receiveShadow = true;
    g.add(cap);

    const accent = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    accent.rotation.x = -Math.PI / 2;
    accent.position.y = -2.359;
    g.add(accent);
  }

  // Use fixed rotY if supplied (for arena-side cards), else random wobble
  g.rotation.y = opts.rotY ?? (Math.random() - 0.5) * 0.4;
  g.rotation.x = opts.rotX ?? (Math.random() - 0.5) * 0.1;
  g.userData.baseRot = g.rotation.clone();

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(2.6 * t.aspect + 0.4, 2.6 + 0.4, 0.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.userData.projectId = p.id;
  hit.userData.isProjectHit = true;
  g.add(hit);

  g.userData.project = p;
  g.userData.update = (time) => {
    card.position.y = Math.sin(time * 0.6 + card.userData.phase) * 0.12;
    card.position.x = Math.sin(time * 0.4 + card.userData.phase * 1.2) * 0.06;
    g.rotation.y =
      g.userData.baseRot.y + Math.sin(time * 0.3 + card.userData.phase) * 0.06;
  };
  return g;
}

// Archive corridor — a floor-disc gate plus a git commit graph (one node per
// archive work) running down −Z. The actual project content is the DOM cards
// rendered over the scene; the graph is the on-theme backdrop, and the node for
// the project the camera is parked on lights up (see update(t, activeId)).
export function buildArchive() {
  const ARCHIVE = PROJECTS.find((p) => p.id === "archive");
  const g = new THREE.Group();
  g.position.set(...ARCHIVE.pos);

  // Floor disc
  const floorGeo = new THREE.CircleGeometry(5, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x060606,
    roughness: 0.95,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // Thin accent ring
  const ringGeo = new THREE.RingGeometry(4.5, 4.55, 96);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x2a2820,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  g.add(ring);

  // Center "05 ARCHIVE" floor label
  const centerCanvas = document.createElement("canvas");
  centerCanvas.width = centerCanvas.height = 512;
  const cctx = centerCanvas.getContext("2d");
  cctx.fillStyle = "rgba(0,0,0,0)";
  cctx.fillRect(0, 0, 512, 512);
  cctx.strokeStyle = "#57d36a";
  cctx.lineWidth = 2;
  cctx.beginPath();
  cctx.arc(256, 256, 240, 0, Math.PI * 2);
  cctx.stroke();
  cctx.fillStyle = "#57d36a";
  cctx.font = `700 220px 'Bricolage Grotesque', sans-serif`;
  cctx.textAlign = "center";
  cctx.textBaseline = "middle";
  cctx.fillText("05", 256, 268);
  cctx.font = `500 36px 'JetBrains Mono', monospace`;
  cctx.fillStyle = "#9a958b";
  cctx.fillText("A R C H I V E", 256, 410);
  const centerTex = new THREE.CanvasTexture(centerCanvas);
  centerTex.colorSpace = THREE.SRGBColorSpace;
  const centerDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3),
    new THREE.MeshBasicMaterial({ map: centerTex, transparent: true })
  );
  centerDisc.rotation.x = -Math.PI / 2;
  centerDisc.position.y = 0.02;
  g.add(centerDisc);

  // ── Git commit graph running down the corridor ──────────────────────────
  // Each archive work is a commit node; consecutive commits are joined by an
  // edge, and a lane change (trunk ↔ branch) renders as a branch/merge. Node
  // positions come from projects.js (world space) and are converted to local.
  const ACCENT = 0x57d36a;
  const works = PROJECTS.filter((p) => p.isArchive);

  // deterministic 7-char "sha" from a string (FNV-1a)
  const shaOf = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
  };

  // thin emissive tube between two local-space points
  const edgeBetween = (a, b) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a1a0f,
      emissive: ACCENT,
      emissiveIntensity: 0.4,
      roughness: 0.5,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, len, 8),
      mat
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    return { mesh, mat };
  };

  // small "sha · year" label plane facing the camera (+Z)
  const labelFor = (sha, year) => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const x = c.getContext("2d");
    x.font = "500 26px 'JetBrains Mono', monospace";
    x.textBaseline = "middle";
    x.fillStyle = "#57d36a";
    x.fillText(sha, 8, 34);
    const shaW = x.measureText(sha).width;
    x.fillStyle = "#7c776d";
    x.fillText(`  ·  ${year}`, 8 + shaW, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.5),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    );
    return mesh;
  };

  const localOf = (p) =>
    new THREE.Vector3(
      p.pos[0] - ARCHIVE.pos[0],
      p.pos[1] - ARCHIVE.pos[1],
      p.pos[2] - ARCHIVE.pos[2]
    );

  const nodeMeshes = [];
  const edges = [];

  // edges first so nodes render on top
  for (let i = 1; i < works.length; i++) {
    const e = edgeBetween(localOf(works[i - 1]), localOf(works[i]));
    e.a = i - 1;
    e.b = i;
    g.add(e.mesh);
    edges.push(e);
  }

  works.forEach((p, i) => {
    const pos = localOf(p);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0c1f12,
      emissive: ACCENT,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.2,
    });
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), mat);
    node.position.copy(pos);
    g.add(node);

    const label = labelFor(shaOf(p.title), p.year);
    // offset the label toward the branch side so it never sits under a node
    label.position.set(pos.x + (p.archiveLane === 1 ? 1.5 : -1.5), pos.y + 0.05, pos.z);
    g.add(label);

    nodeMeshes.push({ id: p.id, mesh: node, mat, label });
  });

  g.userData = {
    project: ARCHIVE,
    // activeId is the id of the project the camera is currently parked on.
    update: (t, activeId) => {
      ring.material.color.setHSL(0.34, 0.4, 0.18 + 0.04 * Math.sin(t * 0.2));
      nodeMeshes.forEach((n, idx) => {
        const active = n.id === activeId;
        const tgtEmis = active ? 2.6 : 0.5 + 0.12 * Math.sin(t * 1.4 + idx);
        n.mat.emissiveIntensity += (tgtEmis - n.mat.emissiveIntensity) * 0.12;
        const tgtScale = active ? 1.8 : 1.0;
        const s = n.mesh.scale.x + (tgtScale - n.mesh.scale.x) * 0.12;
        n.mesh.scale.setScalar(s);
        const tgtOp = active ? 1.0 : 0.32;
        n.label.material.opacity += (tgtOp - n.label.material.opacity) * 0.12;
      });
      edges.forEach((e) => {
        const lit =
          nodeMeshes[e.a].id === activeId || nodeMeshes[e.b].id === activeId;
        const tgt = lit ? 1.5 : 0.35;
        e.mat.emissiveIntensity += (tgt - e.mat.emissiveIntensity) * 0.12;
      });
    },
  };
  return g;
}

const AMBIENT_WORDS = [
  ["code", "green"],
  ["design", "lime"],
  ["craft", "green"],
  ["make", "pink"],
  ["shoot", "green"],
  ["aim", "lime"],
  ["build", "green"],
  ["ship", "coral"],
  ["learn", "green"],
  ["read", "lime"],
  ["cat", "green"],
  ["sat", "pink"],
  ["mat", "lime"],
  ["the", "green"],
  ["fly", "green"],
  ["dark", "pink"],
  ["paint", "coral"],
  ["/k/", "white"],
  ["/æ/", "white"],
  ["/t/", "white"],
  ["robot", "green"],
  ["field", "lime"],
  ["orbit", "green"],
  ["null", "pink"],
  ["hello", "green"],
  ["scope", "lime"],
  ["hooks", "green"],
  ["render", "coral"],
];

export function buildAmbient() {
  const g = new THREE.Group();
  AMBIENT_WORDS.forEach(([word, variant]) => {
    const t = wordPillTexture(word, variant);
    const card = makeFloatingCard(t, 0.45, { opacity: 0.55 });
    const r = 16 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const yBias = (Math.random() - 0.5) * 14;
    card.position.set(Math.cos(theta) * r, yBias, Math.sin(theta) * r * 0.85);
    card.rotation.y = -theta + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    card.rotation.x = (Math.random() - 0.5) * 0.3;
    card.rotation.z = (Math.random() - 0.5) * 0.2;
    card.userData.basePos = card.position.clone();
    card.userData.baseRot = card.rotation.clone();
    card.userData.phase = Math.random() * Math.PI * 2;
    card.userData.speed = 0.3 + Math.random() * 0.5;
    g.add(card);
  });
  g.userData = {
    update: (t) => {
      g.children.forEach((c) => {
        const p = c.userData.phase;
        const s = c.userData.speed;
        c.position.y = c.userData.basePos.y + Math.sin(t * s + p) * 0.6;
        c.position.x = c.userData.basePos.x + Math.cos(t * s * 0.7 + p) * 0.4;
        c.rotation.z = c.userData.baseRot.z + Math.sin(t * s * 0.5 + p) * 0.05;
      });
    },
  };
  return g;
}

// ---------------------------------------------------------------------------
// ABOUT section builder
// ---------------------------------------------------------------------------

// Local rounded-rect helper (mirrors the one in textures.js)
function _rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function _aboutTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A small "build.log" terminal — window chrome + traffic-light dots + a few
// machine-voice lines. Carries proof in the scene without repeating the card.
function aboutTerminalTexture() {
  const cw = 880,
    ch = 460;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");

  // Window body
  ctx.fillStyle = "#0c0c0e";
  _rr(ctx, 6, 6, cw - 12, ch - 12, 26);
  ctx.fill();
  ctx.strokeStyle = "#26262b";
  ctx.lineWidth = 2;
  _rr(ctx, 6, 6, cw - 12, ch - 12, 26);
  ctx.stroke();

  // Title bar
  ctx.fillStyle = "#1d1d21";
  _rr(ctx, 6, 6, cw - 12, 78, 26);
  ctx.fill();
  ctx.fillStyle = "#1d1d21";
  ctx.fillRect(6, 50, cw - 12, 34); // square off the bottom of the bar
  const dots = ["#e63b6d", "#c7ee5e", "#57d36a"];
  dots.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(48 + i * 34, 45, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#9a958b";
  ctx.font = `500 26px 'JetBrains Mono', monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("build.log", 176, 46);

  // Lines
  const lines = [
    ["✓", "2025 worlds champions", "#57d36a", "#cbc6bc"],
    ["✓", "2024 word wiz · 4k readers", "#57d36a", "#cbc6bc"],
    ["//", "next: sim pipeline", "#6f6b62", "#6f6b62"],
  ];
  ctx.font = `500 30px 'JetBrains Mono', monospace`;
  let y = 150;
  for (const [mark, text, markCol, textCol] of lines) {
    ctx.fillStyle = markCol;
    ctx.fillText(mark, 48, y);
    const mw = ctx.measureText(mark + "  ").width;
    ctx.fillStyle = textCol;
    ctx.fillText(text, 48 + mw, y);
    y += 56;
  }

  return { tex: _aboutTex(canvas), aspect: cw / ch };
}

// A compact project card — accent top bar, title, one-line sub, and a tag.
// Smaller and lighter than the full scene `projectCardTexture`; it reads as a
// flagship/supporting work in the About cluster.
function aboutMiniCardTexture(title, sub, accent) {
  const cw = 760,
    ch = 480;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#161619";
  _rr(ctx, 8, 8, cw - 16, ch - 16, 30);
  ctx.fill();
  ctx.strokeStyle = "#26262b";
  ctx.lineWidth = 2;
  _rr(ctx, 8, 8, cw - 16, ch - 16, 30);
  ctx.stroke();

  // Accent top bar
  ctx.fillStyle = accent;
  _rr(ctx, 44, 40, 70, 7, 3.5);
  ctx.fill();

  // Title (word-wrapped)
  ctx.fillStyle = "#f4f0e8";
  ctx.font = `700 64px 'Bricolage Grotesque', sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let line = "";
  let y = 92;
  const maxW = cw - 88;
  for (const w of title.split(" ")) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), 44, y);
      line = w + " ";
      y += 70;
    } else line = test;
  }
  ctx.fillText(line.trim(), 44, y);
  y += 84;

  // Sub line(s)
  ctx.fillStyle = "#cbc6bc";
  ctx.font = `400 27px 'JetBrains Mono', monospace`;
  let sline = "";
  for (const w of sub.split(" ")) {
    const test = sline + w + " ";
    if (ctx.measureText(test).width > maxW && sline) {
      ctx.fillText(sline.trim(), 44, y);
      sline = w + " ";
      y += 38;
    } else sline = test;
  }
  ctx.fillText(sline.trim(), 44, y);

  // Accent dot bottom-left
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(58, ch - 56, 9, 0, Math.PI * 2);
  ctx.fill();

  return { tex: _aboutTex(canvas), aspect: cw / ch };
}

// A faint "// label" atmosphere sticker — bordered pill, accent dot, mono text.
function aboutStickerTexture(text, accent) {
  const label = "// " + text;
  const m = document.createElement("canvas").getContext("2d");
  m.font = `500 44px 'JetBrains Mono', monospace`;
  const tw = m.measureText(label).width;
  const cw = Math.ceil(tw + 150),
    ch = 110;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(22,22,25,0.85)";
  _rr(ctx, 4, 4, cw - 8, ch - 8, 50);
  ctx.fill();
  ctx.strokeStyle = "#26262b";
  ctx.lineWidth = 2;
  _rr(ctx, 4, 4, cw - 8, ch - 8, 50);
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(46, ch / 2, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9a958b";
  ctx.font = `500 44px 'JetBrains Mono', monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 78, ch / 2 + 2);

  return { tex: _aboutTex(canvas), aspect: cw / ch };
}

export function buildAbout() {
  const ABOUT = PROJECTS.find((p) => p.id === "about");
  const g = new THREE.Group();
  g.position.set(...ABOUT.pos);

  // The DOM About card owns the prose. The 3D layer carries *identity + work*,
  // not a repeated tech list: a /bp/ anchor, a build.log terminal, two project
  // cards, a few scattered phoneme fragments, and faint atmosphere stickers —
  // depth-staggered around the node (biased to the open side) so the cluster
  // reads as depth rather than a flat wall.

  // Deterministic RNG so the layout is stable between reloads.
  const _rng = (() => {
    let s = 42;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  // Card-plane basis: panels face the camera by sharing this Y rotation. dx runs
  // along the card's right axis, fwdOffset along its forward (toward-camera) axis.
  const cardRotY = 0.42;
  const fwd = new THREE.Vector3(Math.sin(cardRotY), 0, Math.cos(cardRotY));
  const rgt = new THREE.Vector3(Math.cos(cardRotY), 0, -Math.sin(cardRotY));

  // place(mesh, dx, dy, fwdOffset, jitter) — position in the card plane + register bob.
  const place = (mesh, dx, dy, fwdOffset, jitter = 0.2) => {
    mesh.position.set(
      rgt.x * dx + fwd.x * fwdOffset,
      dy,
      rgt.z * dx + fwd.z * fwdOffset
    );
    mesh.rotation.y = cardRotY + (_rng() - 0.5) * jitter;
    mesh.userData.basePos = mesh.position.clone();
    mesh.userData.phase = _rng() * Math.PI * 2;
    mesh.userData.speed = 0.22 + _rng() * 0.32;
    g.add(mesh);
    return mesh;
  };

  // ── /bp/ anchor — green, with a soft glow plane behind it. Brand rule: the
  //    logo is always green, regardless of the DOM accent. Forward in Z.
  const bp = makeFloatingCard(wordPillTexture("/bp/", "green"), 0.72, {
    opacity: 0.95,
  });
  place(bp, -0.2, 1.7, 1.0, 0.1);

  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.6),
    new THREE.MeshBasicMaterial({
      color: 0x57d36a,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glowPlane.position.set(
    rgt.x * -0.2 + fwd.x * 0.85,
    1.7,
    rgt.z * -0.2 + fwd.z * 0.85
  );
  glowPlane.rotation.y = cardRotY;
  g.add(glowPlane); // static (no basePos) — sits behind the anchor

  // ── build.log terminal — proof, machine-voice. Mid plane, to the open side.
  place(aboutTerminal(), -2.9, -0.3, -0.4, 0.12);

  // ── Project cards — flagship forward, supporting pushed back in Z.
  const wordWiz = makeFloatingCard(
    aboutMiniCardTexture(
      "Word Wiz AI",
      "reading tutor · hears the sounds kids miss",
      "#57d36a"
    ),
    1.9,
    { opacity: 0.97 }
  );
  place(wordWiz, 2.9, 1.0, -0.3, 0.1);

  const robotSim = makeFloatingCard(
    aboutMiniCardTexture(
      "Robot Sim",
      "wpilib physics · 3× team throughput",
      "#e63b6d"
    ),
    1.55,
    { opacity: 0.92 }
  );
  place(robotSim, 3.7, -1.6, -2.4, 0.14);

  // ── Phoneme fragments — identity DNA, small and scattered, half pushed back.
  const phonemes = [
    ["b", "green", -3.7, 2.4, -1.8],
    ["r", "coral", 1.1, 2.9, -2.6],
    ["oo", "lime", -1.6, -1.9, -1.6],
    ["s", "pink", 4.6, 1.0, -3.0],
  ];
  phonemes.forEach(([w, v, dx, dy, fz]) => {
    place(makeFloatingCard(wordPillTexture(w, v), 0.42, { opacity: 0.9 }), dx, dy, fz, 0.3);
  });

  // ── Atmosphere stickers — faint, far back. Tools live in the DOM, not here;
  //    these are texture, not a list.
  const stickers = [
    ["three.js", "#9b8cff", -2.4, 2.7, -2.8],
    ["Java", "#c7ee5e", 0.4, -2.4, -2.2],
    ["WPILib", "#57d36a", 2.2, 2.3, -2.9],
  ];
  stickers.forEach(([t, col, dx, dy, fz]) => {
    const s = makeFloatingCard(aboutStickerTexture(t, col), 0.46, { opacity: 0.55 });
    place(s, dx, dy, fz, 0.25);
  });

  g.userData = {
    project: ABOUT,
    update: (time) => {
      g.children.forEach((c) => {
        if (!c.userData.basePos) return;
        const p = c.userData.phase ?? 0;
        const s = c.userData.speed ?? 0.45;
        c.position.y = c.userData.basePos.y + Math.sin(time * s + p) * 0.1;
        c.position.x =
          c.userData.basePos.x + Math.cos(time * s * 0.7 + p) * 0.06;
      });
    },
  };
  return g;
}

// small wrapper so the terminal reads cleanly in buildAbout's layout block
function aboutTerminal() {
  return makeFloatingCard(aboutTerminalTexture(), 1.5, { opacity: 0.95 });
}

// ---------------------------------------------------------------------------
// FIELD MODEL — real 2026 FRC field GLB from AdvantageScope
// Loaded async; silently skips if missing.
// Config from Field3d_2026FRCFieldV1.zip:
//   widthInches: 651.22 (~16.54m long axis), heightInches: 317.677 (~8.07m wide)
// The GLB is already Y-up (GLTF standard), so we do NOT apply the AdvantageScope
// config rotations (those are for AS's internal Z-up field coordinate system).
// Raw bbox confirmed: X=22.56 (long), Z=9.14 (wide), Y=3.09 (structures) → flat.
// ---------------------------------------------------------------------------
export function loadFieldModel(scene, basePos = [0, 0, 0]) {
  // Wrap the field in a group whose position is the tunable offset. The model
  // is auto-centered relative to the group, so moving the group moves the field.
  const group = new THREE.Group();
  group.position.set(basePos[0], basePos[1], basePos[2]);
  scene.add(group);

  const loader = new GLTFLoader();
  loader.load(
    "/models/field.glb",
    (gltf) => {
      const model = gltf.scene;

      // No rotation needed — GLB is already Y-up with long axis along X.
      // Scale = 1.0 (raw GLB units). Field is 22.56 × 9.14 scene units,
      // ~2× the original 0.45 scale. SCENE_PER_METER = 22.56/16.54 ≈ 1.365.
      const s = 1.0;
      model.scale.setScalar(s);

      // Center on XZ, put floor at y=0 (relative to the group)
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box.min.y + 0.01, -center.z);

      // Collect all fuel/ball nodes first, then remove them from the scene graph.
      // Match any mesh name containing "fuel" (case-insensitive) to catch all variants.
      const fuelNodes = [];
      model.traverse((child) => {
        if (/fuel/i.test(child.name)) {
          fuelNodes.push(child);
          return;
        }
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = false;
        }
      });
      fuelNodes.forEach(n => n.removeFromParent());

      group.add(model);
    },
    undefined,
    () => { /* silently skip if missing */ }
  );

  return group;
}

// ---------------------------------------------------------------------------
// 2025 REEFSCAPE FIELD MODEL — Field3d_2025FRCFieldWeldedV2 from AdvantageScope
// GLB is Z-up so we apply the config rotations: x:90° then z:180°.
// Dimensions: 690.875" × 317" (17.55m × 8.05m).
// ---------------------------------------------------------------------------
export function loadField2025Model(scene, basePos = [0, 0, 0]) {
  const group = new THREE.Group();
  group.position.set(basePos[0], basePos[1], basePos[2]);
  scene.add(group);

  const loader = new GLTFLoader();
  loader.load(
    "/models/field2025.glb",
    (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(1.0);

      // No rotation — try Y-up standard like the 2026 field

      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box.min.y + 0.01, -center.z);

      // Remove staged game pieces (GE-25500 = coral, GE-25501 = algae).
      // Keep structural field elements: CORAL STATION, CORAL HOLDER, etc.
      const gamePieceNodes = [];
      model.traverse((child) => {
        if (/GE-2550[01]/.test(child.name) || child.name.toLowerCase() === 'algae') {
          gamePieceNodes.push(child);
          return;
        }
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = false;
        }
      });
      gamePieceNodes.forEach(n => n.removeFromParent());

      group.add(model);
    },
    undefined,
    () => { /* silently skip if missing */ }
  );

  return group;
}

// ---------------------------------------------------------------------------
// ROBOT MODEL — 2026 Iron Panthers robot GLB
// Loaded async; silently skips if missing.
// ---------------------------------------------------------------------------
export function loadRobotModel(scene) {
  const loader = new GLTFLoader();
  loader.load(
    "/models/robot.glb",
    (gltf) => {
      const model = gltf.scene;

      // Scale to match field: scale = 1.0 (raw GLB units)
      const s = 1.0;
      model.scale.setScalar(s);

      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      // Place robot on field: centered on XZ, floor touching y=0
      model.position.set(-center.x, -box.min.y, -center.z);

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(model);
    },
    undefined,
    () => { /* silently skip if missing */ }
  );
}

export function buildScreenshotPanes(scene, allUpdaters) {
  const loader = new THREE.TextureLoader();
  const animatedPanes = [];
  // Each slot: { mesh, border } — filled once the texture loads
  const paneRefs = SCREENSHOT_PANES.map(() => ({ mesh: null, border: null }));

  SCREENSHOT_PANES.forEach((cfg, idx) => {
    loader.load(
      cfg.src,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        const aspect =
          tex.image?.width && tex.image?.height
            ? tex.image.width / tex.image.height
            : cfg.aspect;
        const w = cfg.height * aspect;
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(w, cfg.height),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        mesh.position.set(...cfg.pos);
        mesh.rotation.y = cfg.rotY;
        mesh.rotation.x = cfg.rotX;

        // dark shadow-border behind the pane
        const border = new THREE.Mesh(
          new THREE.PlaneGeometry(w + 0.14, cfg.height + 0.14),
          new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          })
        );
        border.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2] - 0.05);
        border.rotation.y = cfg.rotY;
        border.rotation.x = cfg.rotX;

        scene.add(border);
        scene.add(mesh);

        for (const m of [mesh, border]) {
          m.userData.basePos = m.position.clone();
          m.userData.phase = cfg.phase;
          m.userData.speed = cfg.speed;
          animatedPanes.push(m);
        }

        paneRefs[idx].mesh = mesh;
        paneRefs[idx].border = border;
      },
      undefined,
      () => {
        /* silently skip missing files */
      }
    );
  });

  allUpdaters.push((t) => {
    animatedPanes.forEach((m) => {
      if (!m.userData.basePos) return;
      const p = m.userData.phase;
      const s = m.userData.speed;
      m.position.y = m.userData.basePos.y + Math.sin(t * s + p) * 0.14;
      m.position.x = m.userData.basePos.x + Math.sin(t * s * 0.6 + p) * 0.06;
      m.rotation.z = Math.sin(t * s * 0.4 + p) * 0.02;
    });
  });

  return {
    setPanePos(i, pos) {
      const ref = paneRefs[i];
      if (!ref?.mesh) return;
      ref.mesh.position.set(pos[0], pos[1], pos[2]);
      ref.border.position.set(pos[0], pos[1], pos[2] - 0.05);
      ref.mesh.userData.basePos.set(pos[0], pos[1], pos[2]);
      ref.border.userData.basePos.set(pos[0], pos[1], pos[2] - 0.05);
    },
    setPaneRot(i, rotY, rotX) {
      const ref = paneRefs[i];
      if (!ref?.mesh) return;
      ref.mesh.rotation.y = rotY;
      ref.mesh.rotation.x = rotX;
      ref.border.rotation.y = rotY;
      ref.border.rotation.x = rotX;
    },
  };
}
