import * as THREE from 'three'
import { chipDotHex } from '../utils/chipColors.js'

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
    green: { bg: '#57d36a', fg: '#0c0c0e' },
    lime:  { bg: '#c7ee5e', fg: '#0c0c0e' },
    pink:  { bg: '#e63b6d', fg: '#ffffff' },
    coral: { bg: '#ec9576', fg: '#1d1d21' },
    white: { bg: '#f4f0e8', fg: '#0c0c0e' },
  }
  const c = palette[variant] || palette.green
  const pad = 80
  const m = document.createElement('canvas').getContext('2d')
  const fontSize = 220
  m.font = `600 ${fontSize}px 'JetBrains Mono', monospace`
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
  ctx.font = `500 ${fontSize}px 'JetBrains Mono', monospace`
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
    dark:  { bg: '#101010', fg: '#f4f0e8', accent: '#57d36a', dim: '#9a958b' },
    light: { bg: '#f4f0e8', fg: '#101010', accent: '#e63b6d', dim: '#9a958b' },
  }
  const c = palette[variant]
  const cw = 640, ch = 800
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = c.bg
  roundRect(ctx, 12, 12, cw - 24, ch - 24, 40)
  ctx.fill()

  ctx.strokeStyle = variant === 'dark' ? '#26262b' : '#dcd8d0'
  ctx.lineWidth = 2
  roundRect(ctx, 12, 12, cw - 24, ch - 24, 40)
  ctx.stroke()

  ctx.fillStyle = c.dim
  ctx.font = `500 32px 'JetBrains Mono', monospace`
  ctx.textAlign = 'left'
  ctx.fillText('PHONEME', 56, 80)

  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.arc(cw - 80, 70, 12, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = c.fg
  ctx.font = `700 320px 'Bricolage Grotesque', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(phoneme, cw / 2, ch / 2 - 30)

  ctx.font = `500 48px 'JetBrains Mono', monospace`
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
  m.font = `500 46px 'JetBrains Mono', monospace`
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
  ctx.font = `500 46px 'JetBrains Mono', monospace`
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
  m.font = `500 46px 'JetBrains Mono', monospace`
  const tw = m.measureText(label).width
  const cw = Math.ceil(tw + 100), ch = 100
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = bgColor
  roundRect(ctx, 4, 4, cw - 8, ch - 8, 46)
  ctx.fill()

  ctx.fillStyle = textColor
  ctx.font = `500 46px 'JetBrains Mono', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cw / 2, ch / 2 + 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch }
}

// Internal draw function — renders the project card onto an existing canvas.
// imgEl / imgEl2 are optional pre-loaded HTMLImageElements to fill the image panel.
// slim: screenshot-only mode — the framed image fills the whole card with no text
// (the DOM card owns all prose in the scrolling-page layout).
function _drawProjectCard(canvas, p, imgEl, imgEl2 = null, slim = false) {
  const cw = canvas.width, ch = canvas.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, cw, ch)

  // Card background
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, '#161619')
  g.addColorStop(1, '#0c0c0e')
  ctx.fillStyle = g
  roundRect(ctx, 8, 8, cw - 16, ch - 16, 32)
  ctx.fill()

  ctx.strokeStyle = '#26262b'
  ctx.lineWidth = 2
  roundRect(ctx, 8, 8, cw - 16, ch - 16, 32)
  ctx.stroke()

  // Image panel dimensions — full-bleed in slim mode, right-column otherwise
  const imgX = slim ? 26 : 540
  const imgY = slim ? 26 : 48
  const imgW = cw - imgX - (slim ? 26 : 24)
  const imgH = ch - imgY - (slim ? 26 : 24)

  function drawImagePanel(el, px, py, pw, ph, radius) {
    ctx.fillStyle = '#0c0c0e'
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
    ctx.strokeStyle = '#26262b'
    ctx.lineWidth = 1.5
    roundRect(ctx, px, py, pw, ph, radius)
    ctx.stroke()
  }

  const panelR = slim ? 18 : 16
  if (imgEl2) {
    const gap = slim ? 12 : 8
    const panelW = Math.floor((imgW - gap) / 2)
    drawImagePanel(imgEl,  imgX,                imgY, panelW, imgH, slim ? 14 : 12)
    drawImagePanel(imgEl2, imgX + panelW + gap, imgY, panelW, imgH, slim ? 14 : 12)
  } else {
    drawImagePanel(imgEl, imgX, imgY, imgW, imgH, panelR)
  }

  // Slim mode: screenshot only + a thin green accent edge along the bottom. No text.
  if (slim) {
    ctx.fillStyle = '#57d36a'
    roundRect(ctx, imgX, ch - 22, Math.min(80, imgW), 5, 2.5)
    ctx.fill()
    return
  }

  // --- Left column text ---
  const textMaxW = imgX - 80  // ~460 px

  // Badge chip
  ctx.fillStyle = '#1d1d21'
  roundRect(ctx, 48, 48, 110, 44, 22)
  ctx.fill()
  ctx.fillStyle = '#f4f0e8'
  ctx.font = `500 22px 'JetBrains Mono', monospace`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(p.index, 78, 70)
  ctx.fillStyle = '#9a958b'
  ctx.fillText('—', 105, 70)
  ctx.fillStyle = '#f4f0e8'
  ctx.fillText('proj', 124, 70)

  // Label — 20 px to fit narrower column; truncate with ellipsis if needed
  ctx.fillStyle = '#9a958b'
  ctx.font = `500 20px 'JetBrains Mono', monospace`
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
  ctx.fillStyle = '#f4f0e8'
  ctx.font = `700 96px 'Bricolage Grotesque', sans-serif`
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

  // Tags — pill + a phoneme-palette dot per chip; stop before the image panel
  ctx.font = `500 20px 'JetBrains Mono', monospace`
  let tx = 48
  const tagY = ch - 90
  const dotR = 5
  for (const tag of p.tags.slice(0, 3)) {
    const tw = ctx.measureText(tag).width + 36 + dotR + 12
    if (tx + tw > imgX - 10) break
    ctx.strokeStyle = '#34343a'
    ctx.lineWidth = 1
    roundRect(ctx, tx, tagY, tw, 38, 19)
    ctx.stroke()
    ctx.fillStyle = chipDotHex(tag)
    ctx.beginPath()
    ctx.arc(tx + 18 + dotR, tagY + 19, dotR, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#cbc6bc'
    ctx.textBaseline = 'middle'
    ctx.fillText(tag, tx + 18 + dotR * 2 + 9, tagY + 19)
    tx += tw + 10
  }

  // Accent bar
  ctx.fillStyle = '#57d36a'
  ctx.fillRect(48, ch - 30, 60, 4)
}

export function projectCardTexture(p, slim = false) {
  const cw = p.image2 ? 1324 : 1024, ch = 640
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  _drawProjectCard(canvas, p, null, null, slim)
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: cw / ch, canvas, slim }
}

// Call this after the card is created to paint an image into the panel.
export function updateProjectCardWithImage(t, p, imgEl, imgEl2 = null) {
  _drawProjectCard(t.canvas, p, imgEl, imgEl2, t.slim)
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
  ctx.strokeStyle = '#26262b'
  ctx.lineWidth = 2
  roundRect(ctx, 8, 8, cw - 16, ch - 16, 28)
  ctx.stroke()

  ctx.fillStyle = '#57d36a'
  ctx.fillRect(48, 56, 36, 3)

  ctx.fillStyle = '#9a958b'
  ctx.font = `500 22px 'JetBrains Mono', monospace`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(work.year || '', cw - 48, 48)

  ctx.fillStyle = '#f4f0e8'
  ctx.font = `700 70px 'Bricolage Grotesque', sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(work.title, 48, 88)

  ctx.fillStyle = '#cbc6bc'
  ctx.font = `400 24px 'JetBrains Mono', monospace`
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

  ctx.font = `500 20px 'JetBrains Mono', monospace`
  const pDotR = 5
  const tagW = ctx.measureText(work.tag).width + 36 + pDotR + 12
  ctx.strokeStyle = '#34343a'
  ctx.lineWidth = 1.5
  roundRect(ctx, 48, ch - 80, tagW, 38, 19)
  ctx.stroke()
  ctx.fillStyle = chipDotHex(work.tag)
  ctx.beginPath()
  ctx.arc(48 + 18 + pDotR, ch - 61, pDotR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#cbc6bc'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(work.tag, 48 + 18 + pDotR * 2 + 9, ch - 61)

  if (work.href) {
    const u = work.href.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const short = u.length > 32 ? u.slice(0, 30) + '…' : u
    ctx.fillStyle = '#9a958b'
    ctx.font = `500 18px 'JetBrains Mono', monospace`
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
