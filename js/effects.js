/* ============================================================
 * 星寰骑士 STELATO Knight — 特效（粒子/飘字/挥砍/闪电/冲击环/震屏）+ 合成音效
 * ============================================================ */
"use strict";

const FX = {
  particles: [],   // {x,y,vx,vy,life,max,size,col,grav,add,shrink}
  dmgNums: [],     // {x,y,vy,life,max,str,col,size,crit}
  slashes: [],     // {x,y,ang,range,arc,t,max,col}
  lunges: [],      // {x,y,ang,range,t,max,col} 直刺光带
  bolts: [],       // {pts:[{x,y}],t,max,col}
  rings: [],       // {x,y,r,maxR,t,max,col,width}
  texts: [],       // {x,y,vy,life,max,str,col,size}
  shake: 0,
  hitStop: 0,      // 顿帧：>0 时游戏时间减速（打击感）

  reset() {
    this.particles.length = 0; this.dmgNums.length = 0;
    this.slashes.length = 0; this.lunges.length = 0; this.bolts.length = 0;
    this.rings.length = 0; this.texts.length = 0;
    this.shake = 0;
    this.hitStop = 0;
  },

  addShake(v) { this.shake = Math.min(this.shake + v, 1); },
  addHitStop(v) { this.hitStop = Math.min(this.hitStop + v, 0.12); },

  /* ---------- 生成器 ---------- */
  spark(x, y, col = "#ffe14a", n = 6, spd = 160) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.22 + Math.random() * 0.16, max: 0.38,
        size: 2.5 + Math.random() * 3, col, grav: 0, add: true, shrink: true,
      });
    }
  },

  /* 方向性火花：沿 ang 方向的锥形喷溅（命中/击杀的方向感） */
  sparkDir(x, y, ang, col = "#ffe14a", n = 6, spd = 190, spread = 0.9) {
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * spread;
      const s = spd * (0.45 + Math.random() * 0.85);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.2 + Math.random() * 0.18, max: 0.38,
        size: 2.2 + Math.random() * 3.4, col, grav: 0, add: true, shrink: true,
      });
    }
  },

  poof(x, y, col, n = 12, size = 7) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 14, y: y - 14 + (Math.random() - 0.5) * 14,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
        life: 0.35 + Math.random() * 0.3, max: 0.65,
        size: size * (0.6 + Math.random() * 0.8), col, grav: -40, add: false, shrink: true,
      });
    }
  },

  flame(x, y, ang, spread, speed = 340) {
    const a = ang + (Math.random() - 0.5) * spread;
    const s = speed * (0.7 + Math.random() * 0.6);
    const cols = ["#ffe14a", "#ff9a2a", "#ff6a1a", "#e8431a"];
    this.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.3 + Math.random() * 0.22, max: 0.5,
      size: 7 + Math.random() * 7, col: cols[(Math.random() * cols.length) | 0],
      grav: 0, add: true, shrink: true,
    });
  },

  droplet(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 180;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        life: 0.3 + Math.random() * 0.25, max: 0.55,
        size: 3 + Math.random() * 4, col: "#4aa8f0", grav: 260, add: false, shrink: true,
      });
    }
  },

  /* 脚步尘土：地面小土烟（浅色、微升即散） */
  dust(x, y, n = 2) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 46, vy: -12 - Math.random() * 22,
        life: 0.3 + Math.random() * 0.2, max: 0.5,
        size: 3 + Math.random() * 2.6, col: "rgba(226,216,188,0.8)",
        grav: -30, add: false, shrink: true,
      });
    }
  },

  slash(x, y, ang, range, arcDeg, col = "#fff8dc") {
    this.slashes.push({ x, y, ang, range, arc: arcDeg * Math.PI / 180, t: 0, max: 0.2, col });
  },

  /* 直刺光带：沿攻击方向刺出的细长轨迹（长枪/链刃/影刃），随进度刺出后消散 */
  lunge(x, y, ang, range, col = "#dcecff") {
    this.lunges.push({ x, y, ang, range, t: 0, max: 0.18, col });
  },

  bolt(pts, col = "#ffe14a") {
    this.bolts.push({ pts, t: 0, max: 0.2, col });
  },

  ring(x, y, maxR, col = "#9be8d8", width = 6, dur = 0.35) {
    this.rings.push({ x, y, r: maxR * 0.25, maxR, t: 0, max: dur, col, width });
  },

  dmg(x, y, val, crit) {
    this.dmgNums.push({
      x: x + (Math.random() - 0.5) * 16, y: y - 30,
      vx: (Math.random() - 0.5) * (crit ? 46 : 26),
      vy: crit ? -104 : -78, life: crit ? 0.9 : 0.72, max: crit ? 0.9 : 0.72,
      str: String(val), col: crit ? "#ffb028" : "#ffffff",
      size: crit ? 25 : 16, crit: !!crit,
    });
  },

  text(x, y, str, col = "#9be8ff", size = 20) {
    this.texts.push({ x, y, vy: -40, life: 0.9, max: 0.9, str, col, size });
  },

  /* ---------- 更新 ---------- */
  update(dt) {
    const P = this.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.grav || 0) * dt;
    }
    if (P.length > 320) P.splice(0, P.length - 320);

    for (let i = this.dmgNums.length - 1; i >= 0; i--) {
      const d = this.dmgNums[i];
      d.life -= dt;
      if (d.life <= 0) { this.dmgNums.splice(i, 1); continue; }
      d.x += (d.vx || 0) * dt;
      d.vx = (d.vx || 0) * (1 - 3 * dt);
      d.y += d.vy * dt;
      d.vy *= (1 - 2.4 * dt);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const d = this.texts[i];
      d.life -= dt;
      if (d.life <= 0) { this.texts.splice(i, 1); continue; }
      d.y += d.vy * dt;
      d.vy *= (1 - 2.4 * dt);
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].t += dt;
      if (this.slashes[i].t >= this.slashes[i].max) this.slashes.splice(i, 1);
    }
    for (let i = this.lunges.length - 1; i >= 0; i--) {
      this.lunges[i].t += dt;
      if (this.lunges[i].t >= this.lunges[i].max) this.lunges.splice(i, 1);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].t += dt;
      if (this.bolts[i].t >= this.bolts[i].max) this.bolts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      r.r = r.maxR * (0.25 + 0.75 * (r.t / r.max));
      if (r.t >= r.max) this.rings.splice(i, 1);
    }
    this.shake = Math.max(0, this.shake - dt * 2.2);
  },

  /* ---------- 绘制 ---------- */
  draw(ctx) {
    // 粒子
    for (const p of this.particles) {
      const k = Math.max(p.life / p.max, 0);
      ctx.save();
      if (p.add) ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(k * 1.4, 1);
      ctx.fillStyle = p.col;
      const s = p.shrink ? p.size * (0.35 + 0.65 * k) : p.size;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 挥砍弧光（随进度扫出；内层残影弧增加厚度感）
    for (const s of this.slashes) {
      const k = s.t / s.max;
      const a0 = s.ang - s.arc / 2;
      const sweep = s.arc * Math.min(1, k * 1.5 + 0.15);
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.9;
      const r = s.range * 0.8;
      ctx.lineCap = "round";
      // 内层残影（略慢半拍）
      ctx.globalAlpha = (1 - k) * 0.4;
      ctx.strokeStyle = s.col;
      ctx.lineWidth = 10 * (1 - k * 0.5);
      const sweep2 = s.arc * Math.max(0, Math.min(1, k * 1.5 - 0.06));
      ctx.beginPath(); ctx.arc(s.x, s.y - 24, r * 0.66, a0, a0 + sweep2); ctx.stroke();
      // 主弧
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = s.col;
      ctx.lineWidth = 18 * (1 - k * 0.5);
      ctx.beginPath(); ctx.arc(s.x, s.y - 24, r, a0, a0 + sweep); ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(s.x, s.y - 24, r, a0, a0 + sweep); ctx.stroke();
      ctx.restore();
    }

    // 直刺光带（沿方向刺出后消散；外晕 + 白热核心）
    for (const l of this.lunges) {
      const k = l.t / l.max;
      const tip = Math.max(46, l.range * Math.min(1, 0.25 + k * 1.7));
      ctx.save();
      ctx.translate(l.x, l.y - 24);
      ctx.rotate(l.ang);
      ctx.lineCap = "round";
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.strokeStyle = l.col;
      ctx.lineWidth = 15 * (1 - k * 0.55);
      ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(tip, 0); ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(tip, 0); ctx.stroke();
      ctx.restore();
    }

    // 闪电链（每帧重新抖动，产生噼啪感）
    for (const b of this.bolts) {
      const k = 1 - b.t / b.max;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const [col, w] of [[b.col, 9], ["#ffffff", 3.4]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w * (0.5 + k * 0.5);
        ctx.globalAlpha = k;
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < b.pts.length - 1; i++) {
          const p1 = b.pts[i], p2 = b.pts[i + 1];
          const segs = 4;
          ctx.moveTo(p1.x, p1.y);
          for (let j = 1; j <= segs; j++) {
            const tt = j / segs;
            const jx = (j === segs) ? 0 : (Math.random() - 0.5) * 22;
            const jy = (j === segs) ? 0 : (Math.random() - 0.5) * 22;
            ctx.lineTo(
              p1.x + (p2.x - p1.x) * tt + jx,
              p1.y + (p2.y - p1.y) * tt + jy
            );
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 冲击环
    for (const r of this.rings) {
      const k = 1 - r.t / r.max;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = r.col;
      ctx.lineWidth = r.width * k + 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y - 14, r.r, r.r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 提示文字（普通上飘）
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const d of this.texts) {
      const k = d.life / d.max;
      ctx.globalAlpha = Math.min(k * 2, 1);
      ctx.font = `bold ${d.size}px "Microsoft YaHei", sans-serif`;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(30,20,10,0.85)";
      ctx.strokeText(d.str, d.x, d.y);
      ctx.fillStyle = d.col;
      ctx.fillText(d.str, d.x, d.y);
    }
    ctx.restore();

    // 伤害数字：弹跳缩放 punch-in + 暴击加强（放大弹入 / 抖动 / 双描边）
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const d of this.dmgNums) {
      const age = d.max - d.life;
      const k = d.life / d.max;
      const pop = d.crit ? 0.85 : 0.5;
      const sc = 1 + pop * Math.max(0, 1 - age / 0.15);         // 前 0.15s 从大弹回 1
      const jx = d.crit ? (Math.random() - 0.5) * 3 * Math.max(0, 1 - age / 0.12) : 0;
      ctx.save();
      ctx.translate(d.x + jx, d.y);
      ctx.scale(sc, sc);
      ctx.rotate(d.crit ? -0.06 : 0);
      ctx.globalAlpha = Math.min(k * 2.4, 1);
      ctx.font = `900 ${d.size}px "Microsoft YaHei", sans-serif`;
      if (d.crit) {                                             // 暴击：外圈橙晕描边
        ctx.lineWidth = 7;
        ctx.strokeStyle = "rgba(200,80,10,0.85)";
        ctx.strokeText(d.str, 0, 0);
      }
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(30,20,10,0.9)";
      ctx.strokeText(d.str, 0, 0);
      ctx.fillStyle = d.col;
      ctx.fillText(d.str, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  },
};

/* ============================================================
 * 合成音效（WebAudio，无外部文件；首次用户手势后激活）
 * ============================================================ */
const SFX = {
  ctx: null, master: null, muted: false,

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination);
      } catch (e) { /* 无音频环境时静默 */ }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  tone(f0, f1, dur, type = "square", vol = 0.6, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { }
  },

  noise(dur, vol = 0.4, fc = 1000, q = 1, delay = 0, fc1 = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(fc, t0);
      if (fc1) bp.frequency.exponentialRampToValueAtTime(fc1, t0 + dur);
      bp.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(this.master);
      src.start(t0); src.stop(t0 + dur);
    } catch (e) { }
  },

  swing() { this.noise(0.13, 0.4, 1500, 1.2, 0, 260); },
  thrust() { this.noise(0.1, 0.32, 2400, 2, 0, 500); },
  hit() { this.tone(170, 80, 0.09, "square", 0.45); this.noise(0.05, 0.25, 700, 1); },
  crit() { this.tone(340, 150, 0.12, "square", 0.55); this.noise(0.08, 0.35, 1200, 1); },
  mDie() { this.tone(220, 50, 0.16, "square", 0.3); },
  hurt() { this.tone(130, 55, 0.25, "sawtooth", 0.6); this.noise(0.12, 0.3, 300, 1); },
  block() { this.tone(1250, 900, 0.07, "square", 0.4); this.tone(1750, 1200, 0.06, "square", 0.28, 0.02); },
  pickup() { this.tone(720, 1080, 0.08, "sine", 0.32); },
  zap() { this.tone(1900, 180, 0.11, "square", 0.4); this.noise(0.08, 0.3, 2600, 3); },
  shoot() { this.tone(420, 760, 0.07, "triangle", 0.4); },
  boom() { this.tone(120, 36, 0.3, "sine", 0.7); this.noise(0.26, 0.5, 420, 0.8); },
  fire() { this.noise(0.1, 0.16, 620, 0.8, 0, 300); },
  shatter() { this.tone(1500, 420, 0.13, "triangle", 0.4); this.noise(0.1, 0.3, 3200, 2); },   // 碎冰
  venom() { this.tone(260, 110, 0.2, "sawtooth", 0.22); this.noise(0.14, 0.18, 480, 1); },      // 毒液
  laser() { this.tone(1250, 980, 0.07, "sawtooth", 0.1); },                                     // 光棱
  stun() { this.tone(880, 240, 0.16, "square", 0.32); },                                        // 眩晕
  warp() { this.tone(160, 640, 0.22, "sine", 0.35); },                                          // 引力
  levelup() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.1, "triangle", 0.42, i * 0.08));
  },
  pick() { this.tone(880, 1320, 0.1, "triangle", 0.4); },
  horn() {
    this.tone(392, 392, 0.16, "sawtooth", 0.35);
    this.tone(523, 523, 0.3, "sawtooth", 0.35, 0.16);
  },
  victory() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) =>
      this.tone(f, f, 0.16, "triangle", 0.4, i * 0.13));
  },
  defeat() {
    [392, 311, 262, 196].forEach((f, i) => this.tone(f, f * 0.96, 0.3, "sawtooth", 0.35, i * 0.22));
  },
};
