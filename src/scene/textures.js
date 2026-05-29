import * as THREE from 'three'

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function wordPillTexture(word, variant = 'green') {
  const palette = {
    green: { bg: '#5dd86b', fg: '#0a0a0a' },
    lime:  { bg: '#c8f06b', fg: '#0a0a0a' },
    pink:  { bg: '#e63b6d', fg: '#ffffff' },
    coral: { bg: '#e89478', fg: '#1a1a1a' },
    white: { bg: '#f6f4ef', fg: '#0a0a0a' },
  }
  const c = palette[variant] || palette.green
  const pad = 80
  const m = document.createElement('canvas').getContext('2d')
  const fontSize = 220
  m.font = `600 ${fontSize}px 'IBM Plex Mono', monospace`
  const wText = m.measureText(word).width
  const cw = Math.ceil(wText + pad * 2)
  const ch = 360
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = c.bg
  roundRect(ctx, 6, 6, cw - 12, ch - 12, 90)
  ctx.fill()
  ctx.fillStyle = c.fg
  ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(word, cw / 2, ch / 2 + 8)
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch }
}

export function phonemeCardTexture(phoneme, sample, variant = 'dark') {
  const palette = {
    dark:  { bg: '#101010', fg: '#f3efe7', accent: '#e7c265', dim: '#7a766e' },
    light: { bg: '#f6f4ef', fg: '#101010', accent: '#e63b6d', dim: '#7a766e' },
  }
  const c = palette[variant]
  const cw = 640, ch = 800
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = c.bg
  roundRect(ctx, 12, 12, cw - 24, ch - 24, 40)
  ctx.fill()

  ctx.strokeStyle = variant === 'dark' ? '#2a2a2a' : '#dcd8d0'
  ctx.lineWidth = 2
  roundRect(ctx, 12, 12, cw - 24, ch - 24, 40)
  ctx.stroke()

  ctx.fillStyle = c.dim
  ctx.font = `500 32px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'left'
  ctx.fillText('PHONEME', 56, 80)

  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.arc(cw - 80, 70, 12, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = c.fg
  ctx.font = `400 320px 'Instrument Serif', serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(phoneme, cw / 2, ch / 2 - 30)

  ctx.font = `500 48px 'IBM Plex Mono', monospace`
  ctx.fillStyle = c.dim
  ctx.fillText(`as in "${sample}"`, cw / 2, ch - 130)

  ctx.strokeStyle = c.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  const wY = ch - 70
  for (let x = 80; x < cw - 80; x += 4) {
    const t = (x - 80) / (cw - 160)
    const amp = Math.sin(t * 22) * (1 - Math.abs(t - 0.5) * 1.4) * 14
    if (x === 80) ctx.moveTo(x, wY + amp)
    else ctx.lineTo(x, wY + amp)
  }
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch }
}

export function recordingPillTexture() {
  const bg    = '#fde8e8'
  const color = '#b03050'
  const m = document.createElement('canvas').getContext('2d')
  m.font = `500 46px 'IBM Plex Mono', monospace`
  const textW = m.measureText('Recording...').width
  const cw = Math.ceil(textW + 170), ch = 110
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')

  // Pill background
  ctx.fillStyle = bg
  roundRect(ctx, 4, 4, cw - 8, ch - 8, 50)
  ctx.fill()

  // Mic icon — capsule body, U-arch stand, stem + base
  const mx = 62, my = ch / 2
  ctx.fillStyle = color
  roundRect(ctx, mx - 9, my - 22, 18, 28, 9)
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(mx, my + 6, 11, Math.PI, 0, false)   // U-arch below capsule
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(mx, my + 17)
  ctx.lineTo(mx, my + 24)                        // stem
  ctx.moveTo(mx - 9, my + 24)
  ctx.lineTo(mx + 9, my + 24)                    // base bar
  ctx.stroke()

  // "Recording..." text
  ctx.fillStyle = color
  ctx.font = `500 46px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Recording...', 112, my + 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch }
}

export function statusPillTexture(label, bgColor = '#eef0f6', textColor = '#3a5070') {
  const m = document.createElement('canvas').getContext('2d')
  m.font = `500 46px 'IBM Plex Mono', monospace`
  const tw = m.measureText(label).width
  const cw = Math.ceil(tw + 100), ch = 100
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = bgColor
  roundRect(ctx, 4, 4, cw - 8, ch - 8, 46)
  ctx.fill()

  ctx.fillStyle = textColor
  ctx.font = `500 46px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cw / 2, ch / 2 + 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch }
}

// Internal draw function — renders the project card onto an existing canvas.
// imgEl / imgEl2 are optional pre-loaded HTMLImageElements to fill the right image panel.
function _drawProjectCard(canvas, p, imgEl, imgEl2 = null) {
  const cw = canvas.width, ch = canvas.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, cw, ch)

  // Card background
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, '#161616')
  g.addColorStop(1, '#0a0a0a')
  ctx.fillStyle = g
  roundRect(ctx, 8, 8, cw - 16, ch - 16, 32)
  ctx.fill()

  ctx.strokeStyle = '#262626'
  ctx.lineWidth = 2
  roundRect(ctx, 8, 8, cw - 16, ch - 16, 32)
  ctx.stroke()

  // Right image panel dimensions
  const imgX = 540, imgY = 48
  const imgW = cw - imgX - 24
  const imgH = ch - imgY - 24

  function drawImagePanel(el, px, py, pw, ph, radius) {
    ctx.fillStyle = '#0e0e0e'
    roundRect(ctx, px, py, pw, ph, radius)
    ctx.fill()
    if (el && (el.naturalWidth > 0 || el.width > 0)) {
      const iw = el.naturalWidth || el.width
      const ih = el.naturalHeight || el.height
      const srcRatio = iw / ih
      const dstRatio = pw / ph
      let sx, sy, sw, sh
      if (srcRatio > dstRatio) {
        sh = ih; sw = Math.round(ih * dstRatio)
        sx = Math.round((iw - sw) / 2); sy = 0
      } else {
        sw = iw; sh = Math.round(iw / dstRatio)
        sx = 0; sy = Math.round((ih - sh) / 2)
      }
      ctx.save()
      roundRect(ctx, px, py, pw, ph, radius)
      ctx.clip()
      ctx.drawImage(el, sx, sy, sw, sh, px, py, pw, ph)
      ctx.restore()
    }
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1.5
    roundRect(ctx, px, py, pw, ph, radius)
    ctx.stroke()
  }

  if (imgEl2) {
    const gap = 8
    const halfW = Math.floor((imgW - gap) / 2)
    drawImagePanel(imgEl,  imgX,           imgY, halfW, imgH, 12)
    drawImagePanel(imgEl2, imgX + halfW + gap, imgY, halfW, imgH, 12)
  } else {
    drawImagePanel(imgEl, imgX, imgY, imgW, imgH, 16)
  }

  // --- Left column text ---
  const textMaxW = imgX - 80  // ~460 px

  // Badge chip
  ctx.fillStyle = '#1a1a1a'
  roundRect(ctx, 48, 48, 110, 44, 22)
  ctx.fill()
  ctx.fillStyle = '#f3efe7'
  ctx.font = `500 22px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(p.index, 78, 70)
  ctx.fillStyle = '#7a766e'
  ctx.fillText('—', 105, 70)
  ctx.fillStyle = '#f3efe7'
  ctx.fillText('proj', 124, 70)

  // Label — 20 px to fit narrower column; truncate with ellipsis if needed
  ctx.fillStyle = '#7a766e'
  ctx.font = `500 20px 'IBM Plex Mono', monospace`
  ctx.textBaseline = 'middle'
  let labelText = p.label.toUpperCase()
  if (ctx.measureText(labelText).width > textMaxW) {
    while (labelText.length > 3 && ctx.measureText(labelText + '…').width > textMaxW) {
      labelText = labelText.slice(0, -1)
    }
    labelText = labelText.trimEnd() + '…'
  }
  ctx.fillText(labelText, 48, 140)

  // Title — word-wrap within left column
  ctx.fillStyle = '#f3efe7'
  ctx.font = `400 96px 'Instrument Serif', serif`
  ctx.textBaseline = 'top'
  const words = p.title.split(' ')
  let line = ''; let y = 180
  for (const w of words) {
    const test = line + w + ' '
    if (ctx.measureText(test).width > textMaxW && line) {
      ctx.fillText(line.trim(), 48, y)
      line = w + ' '; y += 100
    } else line = test
  }
  ctx.fillText(line.trim(), 48, y)

  // Tags — stop before image panel
  ctx.font = `500 20px 'IBM Plex Mono', monospace`
  let tx = 48
  const tagY = ch - 90
  for (const tag of p.tags.slice(0, 3)) {
    const tw = ctx.measureText(tag).width + 36
    if (tx + tw > imgX - 10) break
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    roundRect(ctx, tx, tagY, tw, 38, 19)
    ctx.stroke()
    ctx.fillStyle = '#cbc7bf'
    ctx.textBaseline = 'middle'
    ctx.fillText(tag, tx + 18, tagY + 19)
    tx += tw + 10
  }

  // Accent bar
  ctx.fillStyle = '#e7c265'
  ctx.fillRect(48, ch - 30, 60, 4)
}

export function projectCardTexture(p) {
  const cw = p.image2 ? 1324 : 1024, ch = 640
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  _drawProjectCard(canvas, p, null)
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch, canvas }
}

// Call this after the card is created to paint an image into the right panel.
export function updateProjectCardWithImage(t, p, imgEl, imgEl2 = null) {
  _drawProjectCard(t.canvas, p, imgEl, imgEl2)
  t.tex.needsUpdate = true
}

export function pedestalCardTexture(work) {
  const cw = 768, ch = 480
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0f0f0f'
  roundRect(ctx, 8, 8, cw - 16, ch - 16, 28)
  ctx.fill()
  ctx.strokeStyle = '#262626'
  ctx.lineWidth = 2
  roundRect(ctx, 8, 8, cw - 16, ch - 16, 28)
  ctx.stroke()

  ctx.fillStyle = '#e7c265'
  ctx.fillRect(48, 56, 36, 3)

  ctx.fillStyle = '#7a766e'
  ctx.font = `500 22px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(work.year || '', cw - 48, 48)

  ctx.fillStyle = '#f3efe7'
  ctx.font = `400 70px 'Instrument Serif', serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(work.title, 48, 88)

  ctx.fillStyle = '#cbc7bf'
  ctx.font = `400 24px 'IBM Plex Mono', monospace`
  const subWords = work.sub.split(' ')
  let subLine = ''; let subY = 200
  const maxW = cw - 96
  for (const w of subWords) {
    const test = subLine + w + ' '
    if (ctx.measureText(test).width > maxW && subLine) {
      ctx.fillText(subLine.trim(), 48, subY)
      subLine = w + ' '; subY += 32
    } else subLine = test
  }
  ctx.fillText(subLine.trim(), 48, subY)

  ctx.font = `500 20px 'IBM Plex Mono', monospace`
  const tagW = ctx.measureText(work.tag).width + 36
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1.5
  roundRect(ctx, 48, ch - 80, tagW, 38, 19)
  ctx.stroke()
  ctx.fillStyle = '#e7c265'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(work.tag, 66, ch - 61)

  if (work.href) {
    const u = work.href.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const short = u.length > 32 ? u.slice(0, 30) + '…' : u
    ctx.fillStyle = '#7a766e'
    ctx.font = `500 18px 'IBM Plex Mono', monospace`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('↗  ' + short, cw - 48, ch - 61)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch }
}

export function makeFloatingCard({ tex, aspect }, height, opts = {}) {
  const w = height * aspect
  const geo = new THREE.PlaneGeometry(w, height)
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: opts.depthWrite ?? true,
    opacity: opts.opacity ?? 1,
  })
  return new THREE.Mesh(geo, mat)
}
