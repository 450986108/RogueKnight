/* ============================================================
 * 流浪骑士 RogueKnight — 代码矢量美术
 * 风格：Q版 2 头身、粗深描边、卡通 cel 阴影（参考 参考图/）
 * ============================================================ */
"use strict";

/* ↓↓↓ 形象参数区：editor.html 导出后整体替换此区块 ↓↓↓ */
var OUT = "#33261c";              // 统一描边色（var：编辑器可运行时修改）
var OUT_W = 2;                    // 统一描边宽度

/* 享界骑士（外太空盔甲）配色 */
const SP = {
  helm: "#3E4A5C", helmLt: "#8f9db2",          // 头盔深灰蓝
  chest: "#56637A", chestLt: "#7b8aa5", chestDk: "#39445A", // 胸甲蓝灰
  dark: "#2E3648", pauldron: "#6B7890", hi: "#C8D2DC",
  visor: "#0D1117", eye: "#4DD9FF",            // 面罩 / 冰蓝发光眼
  accent: "#C97B3A", glove: "#2A3140",          // 橙色机械点缀 / 黑手套
  badgeA: "#F2F4F6", badgeB: "#C9CFD8",         // STELATO 徽章银白渐变
};


/* 享界骑士形体参数（editor.html 滑杆实时调整） */
const KP = {
  headY: -54,                              // 头盔高度（头身比例）
  helmW: 16.5, helmH: 15.5,                // 盔体半径
  finScale: 1,                             // 后掠鳍角大小
  visorW: 21, visorH: 10.5,                 // 面罩宽高
  eyeGlow: 12.5, eyeSize: 1.15,                  // 眼睛光晕强度 / 大小
  earR: 3.8,                               // 耳罩半径
  bodyW: 1, bodyH: 1,                      // 躯干横 / 纵缩放（锚点 y=-9）
  badgeW: 19, badgeH: 13.5, badgeText: "STELATO", // 胸前徽章
  pauldronScale: 0.9, shoulderX: 14,         // 肩甲缩放 / 横向位置
  armLen: 9,                               // 手臂长度（持武手离肩的距离）
  gloveR: 5.5, bootScale: 1,               // 手套半径 / 靴子缩放
};
/* ↑↑↑ 形象参数区结束 ↑↑↑ */


/* ============================================================
 * 七骑士皮肤：每套 = { sp: 部分配色覆盖, kp: 部分形体覆盖,
 *   deco: { behind(ctx,p,t,bob,sp,kp,facing)  影子后·靴子前：披风/围巾等背层
 *           body(...)                          躯干绘制后：罩袍下摆
 *           head(...)                          头盔绘制后（已随头部平移）：盔缨/光环/角/法帽 } }
 * 星寰骑士为原味形象（空覆盖，直接用全局 SP/KP → editor.html 实时调参仍生效） */
const HERO_SKINS = {
  astro: {},   // 星寰骑士：太空盔甲原味

  wanderer: {  // 流浪骑士：银灰钢甲 + 红盔缨
    sp: {
      helm: "#8d99a8", helmLt: "#cfd8e2",
      chest: "#7e8a9a", chestLt: "#a8b4c4", chestDk: "#5a6472",
      dark: "#4a5462", pauldron: "#8d99a8", hi: "#dfe6ee",
      visor: "#1a2028", eye: "#e8f2ff",
      accent: "#d8a93e", glove: "#3a4250",
      badgeA: "#f4efe2", badgeB: "#c9cfd8",
    },
    kp: { finScale: 0, eyeGlow: 5, badge: false },
    deco: {
      head(ctx, p, t, bob, sp, kp, facing) {
        // 红缨冠羽：罩在盔顶、向脑后飘垂
        const hy = kp.headY, f = facing;
        const sway = Math.sin(t * 3.2) * 1.6 + (p.moving ? Math.sin(p.walkT * 11) * 1.8 : 0);
        const grd = ctx.createLinearGradient(0, hy - 26, 0, hy);
        grd.addColorStop(0, "#f4705a"); grd.addColorStop(1, "#a02418");
        ctx.fillStyle = grd;
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        ctx.beginPath();
        ctx.moveTo(f * 11, hy - 10);
        ctx.quadraticCurveTo(f * 13, hy - 20, 0, hy - 23);
        ctx.quadraticCurveTo(-f * 12, hy - 25, -f * 16 + sway, hy - 13);
        ctx.quadraticCurveTo(-f * 24 + sway * 1.6, hy - 6, -f * 26 + sway * 2, hy + 2);
        ctx.quadraticCurveTo(-f * 18 + sway, hy - 3, -f * 12, hy - 8);
        ctx.quadraticCurveTo(-f * 4, hy - 14, f * 4, hy - 12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(120,20,10,0.55)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(f * 6, hy - 14); ctx.quadraticCurveTo(0, hy - 20, -f * 8 - sway * 0.5, hy - 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-f * 16 + sway, hy - 9); ctx.quadraticCurveTo(-f * 21 + sway * 1.4, hy - 4, -f * 23 + sway * 1.8, hy + 1); ctx.stroke();
      },
    },
  },

  holy: {  // 圣辉骑士：白甲金饰 + 光环 + 罩袍
    sp: {
      helm: "#d8d2be", helmLt: "#f6f2e2",
      chest: "#e8e2d0", chestLt: "#f8f4e6", chestDk: "#c4bc9e",
      dark: "#a89e7e", pauldron: "#d8a93e", hi: "#fffbe8",
      visor: "#2e2a20", eye: "#ffd76a",
      accent: "#d8a93e", glove: "#5a4e32",
      badgeA: "#fff6d8", badgeB: "#e8cf8e",
    },
    kp: { finScale: 0, eyeGlow: 9, badgeText: "LUX" },
    deco: {
      head(ctx, p, t, bob, sp, kp) {
        // 头顶光环：悬浮缓波 + 金色辉光
        const hy = kp.headY;
        const fl = Math.sin(t * 2.6) * 1.6;
        ctx.save();
        ctx.translate(0, hy - 22 + fl * 0.5);
        ctx.shadowColor = "#ffd76a"; ctx.shadowBlur = 9;
        ctx.strokeStyle = "#ffe9a0"; ctx.lineWidth = 3;
        ell(ctx, 0, 0, 12, 4.2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,246,214,0.9)"; ctx.lineWidth = 1.4;
        ell(ctx, 0, -0.6, 12, 4.2); ctx.stroke();
        ctx.restore();
      },
      body(ctx, p, t, bob, sp) {
        // 白金罩袍下摆：罩住腰腿，行走轻摆，金色十字纹
        const sway = p.moving ? Math.sin(p.walkT * 11) * 1.2 : Math.sin(t * 1.8) * 0.6;
        const g = ctx.createLinearGradient(0, -16, 0, 4);
        g.addColorStop(0, "#f4efdd"); g.addColorStop(1, "#d8d2b8");
        ctx.fillStyle = g;
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        ctx.beginPath();
        ctx.moveTo(-11, -16);
        ctx.quadraticCurveTo(-16 + sway, -6, -14 + sway, 1);
        ctx.quadraticCurveTo(0, 5, 14 + sway, 1);
        ctx.quadraticCurveTo(16 + sway, -6, 11, -16);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#d8a93e"; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-13.6 + sway, -1); ctx.quadraticCurveTo(0, 3.2, 13.6 + sway, -1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4.5, -8.4); ctx.lineTo(4.5, -8.4); ctx.stroke();
      },
    },
  },

  gale: {  // 疾风骑士：青绿轻甲 + 大后掠鳍 + 飘动围巾
    sp: {
      helm: "#3f7d74", helmLt: "#8fd4c4",
      chest: "#4a8a7a", chestLt: "#78b8a6", chestDk: "#33635c",
      dark: "#2a4f4a", pauldron: "#5aa696", hi: "#d8fff2",
      visor: "#101d1a", eye: "#a8ffd8",
      accent: "#ffb84a", glove: "#233c38",
      badgeA: "#e2fff4", badgeB: "#a8d8c8",
    },
    kp: { finScale: 1.35, eyeGlow: 11, pauldronScale: 0.78, badgeText: "GALE" },
    deco: {
      behind(ctx, p, t, bob, sp, kp, facing) {
        // 飘动围巾：自颈后向背后扬起，随步伐与时间波动
        const f = facing;
        const w1 = Math.sin(t * 7) * 3, w2 = Math.sin(t * 7 + 1.2) * 4.5;
        const g = ctx.createLinearGradient(0, -34, 0, -14);
        g.addColorStop(0, "#ffb84a"); g.addColorStop(1, "#e8862a");
        ctx.fillStyle = g;
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        ctx.beginPath();
        ctx.moveTo(-f * 6, -33 + bob);
        ctx.quadraticCurveTo(-f * 16, -32 + w1 * 0.5 + bob, -f * 26, -26 + w1 + bob);
        ctx.quadraticCurveTo(-f * 33, -22 + w2 + bob, -f * 30, -15 + w2 + bob);
        ctx.quadraticCurveTo(-f * 24, -20 + w1 + bob, -f * 18, -22 + w1 * 0.5 + bob);
        ctx.quadraticCurveTo(-f * 10, -24 + bob, -f * 5, -28 + bob);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(180,90,20,0.5)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-f * 10, -29 + bob); ctx.quadraticCurveTo(-f * 20, -24 + bob, -f * 27, -19 + w1 + bob); ctx.stroke();
      },
    },
  },

  blood: {  // 血怒骑士：暗红重甲 + 双短角 + 血红发光眼
    sp: {
      helm: "#5a2620", helmLt: "#a84a3a",
      chest: "#6e3128", chestLt: "#9c4a3a", chestDk: "#48201a",
      dark: "#381410", pauldron: "#7d3a2c", hi: "#e8a890",
      visor: "#160a08", eye: "#ff4a3a",
      accent: "#d8a93e", glove: "#2a1210",
      badgeA: "#f4e2d8", badgeB: "#c9a08e",
    },
    kp: { finScale: 0, eyeGlow: 14, eyeSize: 1.2, badge: false, pauldronScale: 1.05 },
    deco: {
      head(ctx, p, t, bob, sp, kp) {
        // 双短弯角：自盔侧上方翘起，环纹
        const hy = kp.headY;
        const horn = (dir) => {
          const g = ctx.createLinearGradient(dir * 10, hy - 12, dir * 20, hy - 26);
          g.addColorStop(0, "#4a2018"); g.addColorStop(1, "#c98868");
          ctx.fillStyle = g;
          ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
          ctx.beginPath();
          ctx.moveTo(dir * 8, hy - 11);
          ctx.quadraticCurveTo(dir * 20, hy - 14, dir * 22, hy - 25);
          ctx.quadraticCurveTo(dir * 15, hy - 20, dir * 6, hy - 15);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "rgba(30,10,6,0.55)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(dir * 13, hy - 13.5); ctx.lineTo(dir * 10, hy - 15.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(dir * 18, hy - 17); ctx.lineTo(dir * 15, hy - 19); ctx.stroke();
        };
        horn(-1); horn(1);
      },
    },
  },

  iron: {  // 铁壁骑士：灰铜重甲 + 加大肩甲 + 加厚盔沿
    sp: {
      helm: "#7a7468", helmLt: "#b0a894",
      chest: "#8d8578", chestLt: "#b8b0a0", chestDk: "#645e50",
      dark: "#4e483c", pauldron: "#9a8f78", hi: "#e0d8c4",
      visor: "#181410", eye: "#ffbe5a",
      accent: "#c98a3a", glove: "#3a3428",
      badgeA: "#e8dcc0", badgeB: "#c4b48a",
    },
    kp: { pauldronScale: 1.25, shoulderX: 15, helmH: 16.5, eyeGlow: 8, badgeText: "FORT" },
    deco: {
      head(ctx, p, t, bob, sp, kp) {
        // 加厚盔沿横梁 + 铆钉（重装面甲既视感）
        const hy = kp.headY;
        ctx.fillStyle = sp.chestDk;
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        rr(ctx, -kp.helmW + 1.5, hy - kp.visorH / 2 - 5, kp.helmW * 2 - 3, 5, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = sp.accent;
        for (const x of [-9, 0, 9]) { ell(ctx, x, hy - kp.visorH / 2 - 2.5, 1.4, 1.4); ctx.fill(); }
      },
    },
  },

  arcana: {  // 秘法骑士：紫袍 + 尖顶法帽 + 紫罗兰眼
    sp: {
      helm: "#5a4a8a", helmLt: "#9a86c9",
      chest: "#6b5aa0", chestLt: "#8f7cb8", chestDk: "#4a3c74",
      dark: "#382c5c", pauldron: "#7a68ad", hi: "#e2d8ff",
      visor: "#140f24", eye: "#c9a8ff",
      accent: "#ffd042", glove: "#2c2444",
      badgeA: "#efe6ff", badgeB: "#c4b0e8",
    },
    kp: { finScale: 0, eyeGlow: 12, pauldronScale: 0.82, badgeText: "ASTRA" },
    deco: {
      head(ctx, p, t, bob, sp, kp) {
        // 尖顶法帽：宽檐 + 微弯锥顶 + 金星帽针
        const hy = kp.headY;
        ctx.save();
        ctx.translate(0, hy - 10);
        ctx.rotate(Math.sin(t * 1.6) * 0.05);
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        const bg = ctx.createLinearGradient(0, -4, 0, 4);
        bg.addColorStop(0, "#7a68ad"); bg.addColorStop(1, "#4a3c74");
        ctx.fillStyle = bg;
        ell(ctx, 0, 0, 21, 5.5); ctx.fill(); ctx.stroke();
        const cg = ctx.createLinearGradient(-6, -27, 6, -4);
        cg.addColorStop(0, "#8f7cb8"); cg.addColorStop(1, "#5a4a8a");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(-11, -1.5);
        ctx.quadraticCurveTo(-4, -16, 2, -27);
        ctx.quadraticCurveTo(6, -14, 11.5, -1.5);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ffd042";
        rr(ctx, -10, -5, 20, 3.4, 1.6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ffe9a0";
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = -Math.PI / 2 + i * Math.PI * 2 / 5;
          const a2 = a1 + Math.PI / 5;
          ctx.lineTo(4.5 + Math.cos(a1) * 2.4, -11 + Math.sin(a1) * 2.4);
          ctx.lineTo(4.5 + Math.cos(a2) * 1.1, -11 + Math.sin(a2) * 1.1);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      },
      body(ctx, p, t, bob, sp) {
        // 紫色法袍下摆：金色星纹 + 滚边
        const sway = p.moving ? Math.sin(p.walkT * 11) * 1.2 : Math.sin(t * 1.8) * 0.6;
        const g = ctx.createLinearGradient(0, -16, 0, 4);
        g.addColorStop(0, "#6b5aa0"); g.addColorStop(1, "#4a3c74");
        ctx.fillStyle = g;
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        ctx.beginPath();
        ctx.moveTo(-11, -16);
        ctx.quadraticCurveTo(-16 + sway, -6, -14 + sway, 2);
        ctx.lineTo(14 + sway, 2);
        ctx.quadraticCurveTo(16 + sway, -6, 11, -16);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ffd042";
        const star = (sx, sy, r) => {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a1 = -Math.PI / 2 + i * Math.PI * 2 / 5;
            const a2 = a1 + Math.PI / 5;
            ctx.lineTo(sx + Math.cos(a1) * r, sy + Math.sin(a1) * r);
            ctx.lineTo(sx + Math.cos(a2) * r * 0.45, sy + Math.sin(a2) * r * 0.45);
          }
          ctx.closePath(); ctx.fill();
        };
        star(-5 + sway * 0.5, -7, 2.6);
        star(4 + sway * 0.5, -2, 2);
        ctx.strokeStyle = "#ffd042"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-13.8 + sway, 0.5); ctx.lineTo(13.8 + sway, 0.5); ctx.stroke();
      },
    },
  },
};



/* 圆角矩形路径（自实现，兼容旧浏览器） */
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* 椭圆路径 */
function ell(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/* 描边+填充一步完成 */
function fs(ctx) {
  ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.fill(); ctx.stroke();
}

/* 地面阴影 */
function shadowEll(ctx, rx, ry, a = 0.22) {
  ctx.save();
  ctx.fillStyle = `rgba(20,30,10,${a})`;
  ell(ctx, 0, 2, rx, ry); ctx.fill();
  ctx.restore();
}

/* 可复现随机（场景装饰用） */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const Art = {

  /* ============================================================
   * 场景背景（一次性绘制到离屏 canvas）
   * ============================================================ */
  buildScene(dpr) {
    const c = document.createElement("canvas");
    c.width = CONFIG.W * dpr; c.height = CONFIG.H * dpr;
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    const R = mulberry32(20260826);
    const W = CONFIG.W, H = CONFIG.H;
    this.chimneys = [];      // 烟囱世界坐标（供 Ambient 炊烟用）

    // --- 草地底色 ---
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#7fb75c");
    grad.addColorStop(0.5, "#6ea44e");
    grad.addColorStop(1, "#5f9145");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // --- 远景（顶部雾化带 + 城堡剪影） ---
    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = "#a9cf8d";
    g.fillRect(0, 0, W, 120);
    g.globalAlpha = 1;
    // 山丘
    g.fillStyle = "#8fbd74";
    g.beginPath();
    g.moveTo(0, 96);
    g.quadraticCurveTo(240, 40, 520, 86);
    g.quadraticCurveTo(760, 44, 1010, 82);
    g.quadraticCurveTo(1180, 50, W, 90);
    g.lineTo(W, 130); g.lineTo(0, 130);
    g.closePath(); g.fill();
    // 城堡剪影
    g.fillStyle = "#7d8894";
    const castle = (cx, cy, s) => {
      g.fillRect(cx - 46 * s, cy - 20 * s, 92 * s, 46 * s);           // 主体
      for (let i = 0; i < 5; i++) g.fillRect(cx - 46 * s + i * 20 * s, cy - 28 * s, 10 * s, 10 * s); // 城齿
      g.fillRect(cx - 62 * s, cy - 44 * s, 18 * s, 70 * s);           // 左塔
      g.fillRect(cx + 44 * s, cy - 44 * s, 18 * s, 70 * s);           // 右塔
      g.fillRect(cx - 10 * s, cy - 56 * s, 20 * s, 82 * s);           // 主塔
      // 塔顶尖
      g.beginPath();
      g.moveTo(cx - 66 * s, cy - 44 * s); g.lineTo(cx - 53 * s, cy - 62 * s); g.lineTo(cx - 40 * s, cy - 44 * s);
      g.moveTo(cx + 40 * s, cy - 44 * s); g.lineTo(cx + 53 * s, cy - 62 * s); g.lineTo(cx + 66 * s, cy - 44 * s);
      g.moveTo(cx - 12 * s, cy - 56 * s); g.lineTo(cx, cy - 78 * s); g.lineTo(cx + 12 * s, cy - 56 * s);
      g.closePath(); g.fill();
      // 旗帜
      g.strokeStyle = "#7d8894"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(cx, cy - 78 * s); g.lineTo(cx, cy - 92 * s); g.stroke();
      g.fillStyle = "#c23b2e";
      g.beginPath(); g.moveTo(cx, cy - 92 * s); g.lineTo(cx + 14 * s, cy - 87 * s); g.lineTo(cx, cy - 82 * s);
      g.closePath(); g.fill();
    };
    castle(600, 74, 1.05);
    castle(210, 84, 0.55);
    g.restore();

    // --- 草地色斑（三个尺度叠出呼吸感） ---
    for (let i = 0; i < 24; i++) {          // 大尺度明暗斑块
      const x = R() * W, y = 100 + R() * (H - 110);
      const rx = 95 + R() * 150, ry = rx * (0.3 + R() * 0.18);
      g.fillStyle = R() < 0.5 ? "rgba(255,255,238,0.05)" : "rgba(30,60,15,0.07)";
      ell(g, x, y, rx, ry); g.fill();
    }
    for (let i = 0; i < 90; i++) {          // 中尺度色斑
      const x = R() * W, y = 110 + R() * (H - 120);
      const rx = 22 + R() * 46, ry = rx * (0.35 + R() * 0.2);
      g.fillStyle = R() < 0.5 ? "rgba(255,255,255,0.045)" : "rgba(30,60,15,0.06)";
      ell(g, x, y, rx, ry); g.fill();
    }
    // 噪点肌理（细密短笔，模拟草皮）
    g.save(); g.lineCap = "round";
    for (let i = 0; i < 560; i++) {
      const x = R() * W, y = 96 + R() * (H - 100);
      const l = 2 + R() * 3.5;
      g.strokeStyle = R() < 0.5 ? "rgba(255,255,235,0.06)" : "rgba(25,55,12,0.09)";
      g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 2, y - l); g.stroke();
    }
    g.restore();
    // 静态草簇（宽叶/细高/深色三变体；可见的摆动草簇由 Ambient 层叠加）
    g.lineCap = "round";
    const tuft = (x, y, s, dark) => {
      const col = dark ? "rgba(35,72,20,0.4)" : "rgba(52,96,30,0.42)";
      g.save(); g.translate(x, y); g.scale(s, s);
      g.strokeStyle = col; g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(0, 0); g.quadraticCurveTo(-5, -6, -7, -12);
      g.moveTo(0, 0); g.quadraticCurveTo(-1, -7, 0, -14);
      g.moveTo(0, 0); g.quadraticCurveTo(4, -6, 6, -11);
      if (!dark) { g.moveTo(-1, 0); g.quadraticCurveTo(-8, -5, -10, -9); }
      g.stroke();
      g.restore();
    };
    for (let i = 0; i < 150; i++) tuft(R() * W, 112 + R() * (H - 126), 0.7 + R() * 0.9, R() < 0.35);

    // --- 小花（五色，成丛分布 + 散点） ---
    const FLOWER_COLS = ["#ffe9f2", "#fff3b0", "#e6d4ff", "#cfe4ff", "#ffd9a0"];
    const flower = (x, y, s, col) => {
      g.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.256 + 0.3;
        ell(g, x + Math.cos(a) * 3 * s, y + Math.sin(a) * 3 * s, 2.3 * s, 2.3 * s); g.fill();
      }
      g.fillStyle = "#ffd042"; ell(g, x, y, 1.7 * s, 1.7 * s); g.fill();
    };
    const scatter = (cx, cy, r, n, fn) => {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r;
        fn(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.62);
      }
    };
    for (let c2 = 0; c2 < 12; c2++) {
      const cx = 40 + R() * (W - 80), cy = 124 + R() * (H - 160);
      scatter(cx, cy, 30, 3 + Math.floor(R() * 4),
        (x, y) => flower(x, y, 0.8 + R() * 0.5, FLOWER_COLS[Math.floor(R() * 5)]));
    }
    for (let i = 0; i < 18; i++) flower(R() * W, 124 + R() * (H - 150), 0.7 + R() * 0.4, FLOWER_COLS[Math.floor(R() * 5)]);

    // --- 土路（横贯中路） ---
    g.save();
    g.fillStyle = "#c7a468";
    g.beginPath();
    g.moveTo(-20, 430);
    g.bezierCurveTo(320, 380, 480, 500, 700, 452);
    g.bezierCurveTo(920, 410, 1100, 480, W + 20, 430);
    g.lineTo(W + 20, 486);
    g.bezierCurveTo(1100, 536, 920, 466, 700, 508);
    g.bezierCurveTo(480, 556, 320, 436, -20, 486);
    g.closePath(); g.fill();
    // 路面纹理
    g.fillStyle = "rgba(120,90,45,0.25)";
    for (let i = 0; i < 46; i++) {
      const tt = R();
      const x = -20 + tt * (W + 40);
      const y = 452 + Math.sin(tt * 6.3) * 30 + (R() - 0.5) * 34;
      ell(g, x, y, 4 + R() * 9, 2 + R() * 3); g.fill();
    }
    // 车辙（两条压实的暗带）
    g.strokeStyle = "rgba(110,82,40,0.28)"; g.lineWidth = 7; g.lineCap = "round";
    g.beginPath();
    g.moveTo(-20, 446); g.bezierCurveTo(320, 396, 480, 516, 700, 468);
    g.bezierCurveTo(920, 426, 1100, 496, W + 20, 446); g.stroke();
    g.beginPath();
    g.moveTo(-20, 468); g.bezierCurveTo(320, 418, 480, 538, 700, 490);
    g.bezierCurveTo(920, 448, 1100, 518, W + 20, 468); g.stroke();
    // 石子
    for (let i = 0; i < 30; i++) {
      const tt = R();
      const x = -20 + tt * (W + 40);
      const y = 448 + Math.sin(tt * 6.3) * 26 + (R() - 0.5) * 26;
      g.fillStyle = R() < 0.5 ? "#b09a72" : "#9a8460";
      ell(g, x, y, 2.5 + R() * 2.5, 1.8 + R() * 1.5); g.fill();
    }
    // 路缘石
    g.strokeStyle = "rgba(105,80,42,0.5)"; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-20, 430);
    g.bezierCurveTo(320, 380, 480, 500, 700, 452);
    g.bezierCurveTo(920, 410, 1100, 480, W + 20, 430);
    g.stroke();
    g.restore();

    // --- 树（圆冠/挂果/杉树三变体 + 投影） ---
    const groundShadow = (x, y, rx, ry) => {
      g.save();
      g.fillStyle = "rgba(25,45,12,0.20)";
      ell(g, x, y, rx, ry); g.fill();
      g.restore();
    };
    const tree = (x, y, s, v) => {
      v = v || {};
      groundShadow(x, y + 3, 36 * s, 11 * s);
      g.save(); g.translate(x, y); g.scale(s * (v.fl ? -1 : 1), s);
      g.strokeStyle = OUT; g.lineWidth = OUT_W; g.lineJoin = "round";
      // 树干（根兜收分 + 纹理）
      g.fillStyle = "#7a5230";
      g.beginPath();
      g.moveTo(-9, 2); g.quadraticCurveTo(-6, -20, -4.5, -36);
      g.lineTo(4.5, -36); g.quadraticCurveTo(6, -20, 9, 2);
      g.quadraticCurveTo(0, 5, -9, 2);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = "rgba(60,36,16,0.5)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-2, -4); g.quadraticCurveTo(0, -16, -1, -30); g.stroke();
      g.strokeStyle = OUT; g.lineWidth = OUT_W;
      const blob = (bx, by, br, col) => {
        g.fillStyle = col;
        ell(g, bx, by, br, br * 0.92); g.fill(); g.stroke();
      };
      if (v.k === 1) {          // 高挑挂果树
        blob(-13, -52, 17, "#4a8434"); blob(14, -58, 19, "#57983e"); blob(-2, -80, 20, "#63a848");
        g.fillStyle = "rgba(255,255,255,0.18)"; ell(g, -7, -88, 9, 5.5); g.fill();
        g.fillStyle = "#d86a4a";
        for (const [fx, fy] of [[-16, -50], [12, -62], [4, -74]]) { ell(g, fx, fy, 2.6, 2.6); g.fill(); }
      } else if (v.k === 2) {   // 锥形杉树
        const pine = (py, pw, ph, col) => {
          g.fillStyle = col;
          g.beginPath(); g.moveTo(-pw, py);
          g.quadraticCurveTo(-pw * 0.4, py - ph * 0.55, 0, py - ph);
          g.quadraticCurveTo(pw * 0.4, py - ph * 0.55, pw, py);
          g.closePath(); g.fill(); g.stroke();
        };
        pine(-28, 26, 34, "#3a7430");
        pine(-50, 32, 40, "#448236");
        pine(-76, 24, 30, "#4f8f3e");
        g.fillStyle = "rgba(255,255,255,0.14)"; ell(g, -6, -92, 8, 4); g.fill();
      } else {                   // 圆冠树
        blob(-19, -47, 21, "#4f8a38"); blob(19, -47, 21, "#4f8a38"); blob(0, -67, 28, "#5fa244");
        g.fillStyle = "rgba(255,255,255,0.18)"; ell(g, -9, -76, 12, 7); g.fill();
      }
      g.restore();
    };
    tree(120, 618, 1.0, { k: 0 });
    tree(1210, 600, 0.9, { k: 1 });
    tree(90, 300, 0.75, { k: 2 });
    tree(1200, 330, 0.8, { k: 2, fl: true });
    tree(660, 96, 0.85, { k: 0, fl: true });
    tree(400, 666, 0.72, { k: 1, fl: true });
    tree(880, 676, 0.8, { k: 0 });

    // --- 石砌小屋 ×2（配色/细节差异化） ---
    const house = (x, y, s, flip, o) => {
      o = o || {};
      groundShadow(x, y + 3, 64 * s, 15 * s);
      g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
      g.strokeStyle = OUT; g.lineWidth = OUT_W; g.lineJoin = "round";
      // 墙体 + 下半 cel 阴影
      g.fillStyle = o.wall || "#d8cbb2";
      rr(g, -55, -52, 110, 66, 4); g.fill(); g.stroke();
      g.fillStyle = "rgba(90,70,45,0.15)";
      rr(g, -55, -16, 110, 30, 4); g.fill();
      // 石缝
      g.strokeStyle = "rgba(120,105,80,0.55)"; g.lineWidth = 1.6;
      for (let r2 = 0; r2 < 4; r2++) {
        g.beginPath(); g.moveTo(-55, -46 + r2 * 15); g.lineTo(55, -46 + r2 * 15); g.stroke();
        for (let cc = 0; cc < 5; cc++) {
          g.beginPath();
          g.moveTo(-55 + cc * 24 + (r2 % 2 ? 12 : 0), -46 + r2 * 15);
          g.lineTo(-55 + cc * 24 + (r2 % 2 ? 12 : 0), -31 + r2 * 15);
          g.stroke();
        }
      }
      g.strokeStyle = OUT; g.lineWidth = OUT_W;
      // 屋顶
      g.fillStyle = o.roof || "#a8563a";
      g.beginPath();
      g.moveTo(-68, -50); g.lineTo(0, -96); g.lineTo(68, -50);
      g.closePath(); g.fill(); g.stroke();
      // 屋檐阴影带
      g.fillStyle = "rgba(60,25,12,0.30)";
      rr(g, -68, -54, 136, 6, 3); g.fill();
      // 瓦纹
      g.strokeStyle = "rgba(90,35,20,0.5)"; g.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        g.beginPath();
        g.moveTo(-68 + i * 14, -50 - i * 2); g.lineTo(0 - i * 3, -96 + i * 14); g.lineTo(68 - i * 14, -50 - i * 2);
        g.stroke();
      }
      g.strokeStyle = OUT; g.lineWidth = OUT_W;
      // 烟囱 + 顶盖
      g.fillStyle = "#9a948a";
      rr(g, 26, -92, 16, 26, 2); g.fill(); g.stroke();
      g.fillStyle = "#7d7870";
      rr(g, 24, -96, 20, 6, 2); g.fill(); g.stroke();
      // 门（拱形 + 门框 + 把手）
      g.fillStyle = o.door || "#7a5230";
      rr(g, -16, -30, 32, 44, 10); g.fill(); g.stroke();
      g.strokeStyle = "rgba(50,30,12,0.5)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-9, -26); g.lineTo(-9, 10); g.moveTo(9, -26); g.lineTo(9, 10); g.stroke();
      g.fillStyle = "#d8a93e"; ell(g, 8, -10, 2.4, 2.4); g.fill();
      // 窗（暖黄窗光 + 十字窗棂）
      g.fillStyle = "#6b4a2a";
      rr(g, -46, -40, 22, 20, 3); g.fill(); g.stroke();
      g.fillStyle = o.win || "#ffd98a";
      rr(g, -43, -37, 16, 14, 2); g.fill();
      g.strokeStyle = "#3a2a18"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-35, -37); g.lineTo(-35, -23); g.moveTo(-43, -30); g.lineTo(-27, -30); g.stroke();
      // 窗台花箱
      if (o.box) {
        g.fillStyle = "#8a5f36";
        rr(g, -48, -21, 26, 6, 2); g.fill(); g.stroke();
        for (const [fx, fcol] of [[-42, "#e86a8a"], [-35, "#ffd042"], [-28, "#e86a8a"]]) {
          g.fillStyle = fcol; ell(g, fx, -22.5, 2.2, 2.2); g.fill();
        }
      }
      g.restore();
      // 记录烟囱世界坐标（Ambient 炊烟发射点）
      this.chimneys.push({ x: x + (flip ? -34 : 34) * s, y: y - 92 * s });
    };
    house(205, 152, 0.92, false, { roof: "#a8563a", door: "#7a5230", box: true });
    house(1080, 150, 0.9, true, { roof: "#7d6a8a", door: "#4a3a50", wall: "#e0d6c2", win: "#b8e0ff" });

    // --- 木栅栏（上缘一段） ---
    groundShadow(552, 116, 128, 8);
    g.save();
    g.translate(430, 108);
    g.strokeStyle = OUT; g.lineWidth = OUT_W; g.lineJoin = "round";
    const post = (px) => {
      g.fillStyle = "#9a7042";
      rr(g, px - 5, -30, 10, 36, 3); g.fill(); g.stroke();
      g.fillStyle = "#6d4a26"; ell(g, px, -30, 5, 3.4); g.fill();
    };
    for (let i = 0; i < 7; i++) post(i * 34);
    g.fillStyle = "#8a6238";
    rr(g, -8, -24, 244, 8, 3); g.fill(); g.stroke();
    rr(g, -8, -10, 244, 8, 3); g.fill(); g.stroke();
    g.restore();

    // --- 岩石（多颗散布 + 投影） ---
    const rock = (x, y, s) => {
      groundShadow(x, y + 3, 20 * s, 6.5 * s);
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = "#a8a89e";
      g.strokeStyle = OUT; g.lineWidth = OUT_W;
      g.beginPath();
      g.moveTo(-16, 6); g.quadraticCurveTo(-18, -10, -4, -13);
      g.quadraticCurveTo(12, -16, 17, -4); g.quadraticCurveTo(19, 6, 8, 9);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.22)";
      ell(g, -2, -8, 7, 4); g.fill();
      g.fillStyle = "rgba(40,40,35,0.25)";
      ell(g, 6, 4, 9, 3); g.fill();
      g.restore();
    };
    rock(985, 640, 1.0); rock(330, 640, 0.7); rock(70, 500, 0.6);
    rock(620, 210, 0.55); rock(860, 90, 0.5); rock(180, 460, 0.45);

    // --- 干草垛 ---
    const hay = (x, y, s) => {
      groundShadow(x, y + 2, 26 * s, 8 * s);
      g.save(); g.translate(x, y); g.scale(s, s);
      g.strokeStyle = OUT; g.lineWidth = OUT_W; g.lineJoin = "round";
      const g2 = g.createLinearGradient(0, -40, 0, 2);
      g2.addColorStop(0, "#e8c86a"); g2.addColorStop(1, "#c9a44a");
      g.fillStyle = g2;
      rr(g, -24, -38, 48, 40, 14); g.fill(); g.stroke();
      g.strokeStyle = "rgba(140,105,40,0.55)"; g.lineWidth = 1.8;
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(-18, -30 + i * 10); g.quadraticCurveTo(0, -26 + i * 10, 18, -30 + i * 10); g.stroke();
      }
      g.restore();
    };
    hay(370, 100, 0.85);

    // --- 木桩（年轮顶面） ---
    const log = (x, y, s, fl) => {
      groundShadow(x, y + 2, 20 * s, 6 * s);
      g.save(); g.translate(x, y); g.scale(fl ? -s : s, s);
      g.strokeStyle = OUT; g.lineWidth = OUT_W; g.lineJoin = "round";
      g.fillStyle = "#8a5f36";
      rr(g, -13, -22, 26, 24, 5); g.fill(); g.stroke();
      g.fillStyle = "#c9a468";
      ell(g, 0, -22, 13, 8); g.fill(); g.stroke();
      g.strokeStyle = "rgba(110,80,40,0.6)"; g.lineWidth = 1.4;
      ell(g, 0, -22, 8, 4.6); g.stroke();
      ell(g, 0, -22, 4, 2.2); g.stroke();
      g.restore();
    };
    log(1130, 664, 1, false); log(155, 645, 0.8, true);

    // --- 蘑菇丛 ---
    const mushroom = (x, y, s, red) => {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.strokeStyle = OUT; g.lineWidth = OUT_W; g.lineJoin = "round";
      g.fillStyle = "#e8dcc4";
      rr(g, -2.4, -8, 4.8, 9, 2); g.fill(); g.stroke();
      g.fillStyle = red ? "#d8563e" : "#b06a42";
      g.beginPath();
      g.moveTo(-8, -7); g.quadraticCurveTo(-8, -16, 0, -16);
      g.quadraticCurveTo(8, -16, 8, -7);
      g.quadraticCurveTo(0, -4, -8, -7);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.75)";
      ell(g, -3.4, -11, 1.5, 1.1); g.fill();
      ell(g, 3, -9.4, 1.2, 0.9); g.fill();
      g.restore();
    };
    mushroom(148, 330, 1, true); mushroom(158, 334, 0.72, false);
    mushroom(1178, 616, 0.95, false); mushroom(1188, 622, 0.7, true);
    mushroom(688, 122, 0.85, true);

    // --- 小灌木（无主干，地面级） ---
    const bush = (x, y, s) => {
      groundShadow(x, y + 2, 22 * s, 7 * s);
      g.save(); g.translate(x, y); g.scale(s, s);
      g.strokeStyle = OUT; g.lineWidth = OUT_W; g.lineJoin = "round";
      const b = (bx, by, br, col) => { g.fillStyle = col; ell(g, bx, by, br, br * 0.85); g.fill(); g.stroke(); };
      b(-11, -8, 11, "#4a8434"); b(11, -8, 11, "#4a8434"); b(0, -14, 13, "#57983e");
      g.fillStyle = "rgba(255,255,255,0.16)"; ell(g, -4, -19, 6, 3.6); g.fill();
      g.restore();
    };
    bush(310, 210, 1); bush(1010, 220, 0.85); bush(520, 640, 0.9); bush(770, 150, 0.7);

    // --- 树篱边界 ---
    const A = CONFIG.ARENA;
    g.save();
    g.lineWidth = 4;
    // 深色外圈
    g.strokeStyle = "#2f5a24"; g.lineWidth = 34;
    rr(g, A.x - 17, A.y - 17, A.w + 34, A.h + 34, 44);
    g.stroke();
    // 主色圈
    g.strokeStyle = "#48853a"; g.lineWidth = 26;
    rr(g, A.x - 13, A.y - 13, A.w + 26, A.h + 26, 40);
    g.stroke();
    // 叶簇质感（上缘受光更亮、下缘沉影）
    const hedgeDots = (x, y, w2, h2) => {
      const rnd = mulberry32(777);
      for (let i = 0; i < 210; i++) {
        const side = Math.floor(rnd() * 4);
        let px, py;
        if (side === 0) { px = x + rnd() * w2; py = y + (rnd() - 0.5) * 22; }
        else if (side === 1) { px = x + w2 + (rnd() - 0.5) * 22; py = y + rnd() * h2; }
        else if (side === 2) { px = x + rnd() * w2; py = y + h2 + (rnd() - 0.5) * 22; }
        else { px = x + (rnd() - 0.5) * 22; py = y + rnd() * h2; }
        const lit = (side === 0 && py < y) || (side === 3 && px < x);
        g.fillStyle = lit ? "#63aa50" : (rnd() < 0.5 ? "#5a9a48" : "#3a7030");
        ell(g, px, py, 5 + rnd() * 5, 4 + rnd() * 3); g.fill();
      }
    };
    hedgeDots(A.x, A.y, A.w, A.h);
    // 内缘亮边（受光 rim）
    g.strokeStyle = "rgba(150,210,110,0.30)"; g.lineWidth = 3;
    rr(g, A.x - 4, A.y - 4, A.w + 8, A.h + 8, 36); g.stroke();
    g.restore();

    // --- 暗角 ---
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(20,25,5,0.26)");
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);

    this.bgCanvas = c;
    return c;
  },

  /* ============================================================
   * 武器（沿 +x 方向绘制，握把在原点，使用时整体 rotate）
   * ============================================================ */
  weaponInHand(ctx, id) {
    ctx.save();
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W; ctx.lineJoin = "round"; ctx.lineCap = "round";
    const woodFill = "#8a5f36", steel = "#c3ccd6";

    const grip = (x0, x1) => {           // 木质握柄
      ctx.fillStyle = woodFill;
      rr(ctx, x0, -4, x1 - x0, 8, 4); ctx.fill(); ctx.stroke();
    };

    if (id === "sword") {
      grip(-8, 6);   // 短后柄：减小水平持剑时对胸前徽章的遮挡
      // 护手
      ctx.fillStyle = "#d8a93e";
      rr(ctx, 4, -12, 7, 24, 3); ctx.fill(); ctx.stroke();
      // 柄头
      ctx.fillStyle = "#d8a93e"; ell(ctx, -8.5, 0, 3.5, 3.5); ctx.fill(); ctx.stroke();
      // 剑刃
      const grd = ctx.createLinearGradient(0, -7, 0, 7);
      grd.addColorStop(0, "#e8eef5"); grd.addColorStop(0.5, steel); grd.addColorStop(1, "#8d99a8");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(11, -7.5); ctx.lineTo(48, -5); ctx.lineTo(58, 0);
      ctx.lineTo(48, 5); ctx.lineTo(11, 7.5); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // 血槽
      ctx.strokeStyle = "rgba(80,95,115,0.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(46, 0); ctx.stroke();
    }
    else if (id === "axe") {
      // 参考图：对称双月牙刃（labrys）——刃座前伸前尖、后曳长须钩
      grip(-38, 62);
      // 柄底钝圆头
      ctx.fillStyle = steel;
      ell(ctx, -38, 0, 4, 5); ctx.fill(); ctx.stroke();
      // 缠皮握区（双手抓握段，延至中线对侧的后手）
      ctx.strokeStyle = "#5c3a1e"; ctx.lineWidth = 2.4;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath(); ctx.moveTo(-36 + i * 5, -4); ctx.lineTo(-32 + i * 5, 4); ctx.stroke();
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      // 金属领环（裸木与缠皮分界）
      ctx.fillStyle = steel;
      rr(ctx, 8, -5.5, 6, 11, 2.5); ctx.fill(); ctx.stroke();
      // 双月牙斧刃（上刃 + 镜像下刃）
      const blade = () => {
        const grd = ctx.createLinearGradient(0, -10, 0, -38);
        grd.addColorStop(0, "#96a2b2"); grd.addColorStop(1, "#eef3f8");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(58, -12);                      // 前肩：接刃座前上角
        ctx.quadraticCurveTo(73, -15, 78, -23);   // 前刃肩 → 前尖
        ctx.quadraticCurveTo(55, -40, 32, -24);   // 外凸弧形刃口 → 后曳长须尖
        ctx.quadraticCurveTo(42, -12, 46, -10);   // 内凹弧收回刃座后上角
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // 内侧锻造锯齿纹
        ctx.fillStyle = "rgba(80,95,115,0.5)";
        ctx.beginPath(); ctx.moveTo(44, -13.5); ctx.lineTo(49, -15.8); ctx.lineTo(45.5, -17.6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(51, -14.5); ctx.lineTo(56, -16.8); ctx.lineTo(52.5, -18.6); ctx.closePath(); ctx.fill();
        // 刃口高光（沿外弧）
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(73, -21); ctx.quadraticCurveTo(54, -35, 38, -23); ctx.stroke();
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      };
      blade();
      ctx.save(); ctx.scale(1, -1); blade(); ctx.restore();
      // 中央斧刃座（包住柄端，压住刃根收口）
      const sg = ctx.createLinearGradient(0, -13, 0, 13);
      sg.addColorStop(0, "#dfe6ee"); sg.addColorStop(0.5, steel); sg.addColorStop(1, "#8d99a8");
      ctx.fillStyle = sg;
      rr(ctx, 44, -13, 18, 26, 5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(80,95,115,0.5)"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(49, -9); ctx.lineTo(49, 9); ctx.moveTo(57, -9); ctx.lineTo(57, 9); ctx.stroke();
      // 柄顶银帽（探出刃座）
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = "#dfe6ee";
      rr(ctx, 61.5, -4.5, 7.5, 9, 3.5); ctx.fill(); ctx.stroke();
    }
    else if (id === "lance") {
      grip(-38, 96);
      // 护手圆盘
      ctx.fillStyle = "#d8a93e";
      ell(ctx, 26, 0, 9, 9); ctx.fill(); ctx.stroke();
      // 红缨
      ctx.fillStyle = "#c9352a";
      ctx.beginPath();
      ctx.moveTo(84, 0); ctx.lineTo(96, -12); ctx.lineTo(94, 0); ctx.lineTo(96, 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 枪尖
      const grd = ctx.createLinearGradient(96, -8, 96, 8);
      grd.addColorStop(0, "#eef3f8"); grd.addColorStop(1, "#96a2b2");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(96, -8); ctx.quadraticCurveTo(122, -6, 130, 0);
      ctx.quadraticCurveTo(122, 6, 96, 8); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    else if (id === "shadow") {
      // 影刃（双手匕首）：一柄双排刃身的暗色短剑
      grip(-9, 7);
      ctx.fillStyle = "#3a3244"; ell(ctx, -10, 0, 3.6, 3.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#7a6f96";
      rr(ctx, 5, -11, 5, 22, 2.5); ctx.fill(); ctx.stroke();
      const blade = (oy) => {
        const grd = ctx.createLinearGradient(0, oy - 5, 0, oy + 5);
        grd.addColorStop(0, "#6b6188"); grd.addColorStop(0.5, "#453d5c"); grd.addColorStop(1, "#2c2639");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(10, oy - 4.5); ctx.lineTo(52, oy - 3);
        ctx.lineTo(66, oy); ctx.lineTo(52, oy + 3); ctx.lineTo(10, oy + 4.5);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // 幽紫刃光
        ctx.strokeStyle = "rgba(190,160,255,0.85)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, oy - 2); ctx.lineTo(58, oy - 1); ctx.stroke();
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      };
      blade(-7); blade(7);
    }
    else if (id === "hammer") {
      // 破甲战锤：长柄 + 方形重锤头 + 后置破甲锥
      grip(-38, 46);
      ctx.fillStyle = steel;
      ell(ctx, -38, 0, 4, 5); ctx.fill(); ctx.stroke();
      // 缠皮握区
      ctx.strokeStyle = "#5c3a1e"; ctx.lineWidth = 2.4;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(-36 + i * 5, -4); ctx.lineTo(-32 + i * 5, 4); ctx.stroke();
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      // 后置破甲锥
      ctx.fillStyle = steel;
      ctx.beginPath(); ctx.moveTo(46, -7); ctx.lineTo(28, 0); ctx.lineTo(46, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 金属领环
      ctx.fillStyle = steel;
      rr(ctx, 40, -5.5, 6, 11, 2.5); ctx.fill(); ctx.stroke();
      // 锤头
      const grd = ctx.createLinearGradient(0, -17, 0, 17);
      grd.addColorStop(0, "#e8eef5"); grd.addColorStop(0.5, steel); grd.addColorStop(1, "#8d99a8");
      ctx.fillStyle = grd;
      rr(ctx, 46, -17, 30, 34, 6); ctx.fill(); ctx.stroke();
      // 前端打击面
      ctx.fillStyle = "#9aa6b5";
      rr(ctx, 70, -13, 6, 26, 3); ctx.fill(); ctx.stroke();
      // 脊线与铆钉
      ctx.strokeStyle = "rgba(80,95,115,0.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(50, -8); ctx.lineTo(70, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, 8); ctx.lineTo(70, 8); ctx.stroke();
      ctx.fillStyle = "#d8a93e";
      ell(ctx, 57, -12, 1.8, 1.8); ctx.fill();
      ell(ctx, 57, 12, 1.8, 1.8); ctx.fill();
    }
    else if (id === "chain") {
      // 链刃：短柄 + 波动链节 + 末端月牙刃
      grip(-9, 12);
      ctx.fillStyle = "#8d99a8";
      ell(ctx, -11, 0, 4, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      for (let i = 0; i < 6; i++) {
        const lx = 14 + i * 8.5;
        const ly = Math.sin(i * 1.1) * 3;
        ctx.fillStyle = i % 2 ? "#aab4c2" : "#8d99a8";
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(i * 0.25);
        ell(ctx, 0, 0, 5.5, 3.8); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(63, Math.sin(5 * 1.1) * 3);
      ctx.rotate(0.5);
      const grd = ctx.createLinearGradient(0, -12, 0, 12);
      grd.addColorStop(0, "#e8eef5"); grd.addColorStop(1, "#96a2b2");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(2, -13); ctx.quadraticCurveTo(22, -10, 26, 0);
      ctx.quadraticCurveTo(16, 2, 8, 6);
      ctx.quadraticCurveTo(12, -4, 2, -13);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(6, -9); ctx.quadraticCurveTo(20, -6, 23, 0); ctx.stroke();
      ctx.restore();
    }
    else if (id === "scythe") {
      // 血镰：长杆 + 新月形血色巨刃
      grip(-38, 80);
      ctx.fillStyle = "#d8a93e";
      rr(ctx, -42, -4, 6, 8, 3); ctx.fill(); ctx.stroke();
      rr(ctx, 72, -5.5, 7, 11, 2.5); ctx.fill(); ctx.stroke();
      const grd = ctx.createLinearGradient(70, -30, 90, 10);
      grd.addColorStop(0, "#ff8a96"); grd.addColorStop(0.5, "#c9354a"); grd.addColorStop(1, "#7d1f30");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(80, 4);
      ctx.quadraticCurveTo(108, 0, 100, -38);
      ctx.quadraticCurveTo(84, -18, 72, -10);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,200,205,0.85)"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(98, -32); ctx.quadraticCurveTo(104, -2, 82, 2); ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = "#a02438";
      ell(ctx, 78, -4, 3, 4.5); ctx.fill(); ctx.stroke();
    }
    else if (id === "shield") {
      // 鸢形盾：中心在 (22,0)，面向 +x
      ctx.save();
      ctx.translate(24, 0);
      const grd = ctx.createLinearGradient(-20, 0, 20, 0);
      grd.addColorStop(0, "#8fb0e8"); grd.addColorStop(1, "#4a72c4");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(-4, -27); ctx.quadraticCurveTo(20, -25, 21, -4);
      ctx.quadraticCurveTo(20, 18, -4, 30);
      ctx.quadraticCurveTo(-16, 18, -15, -4);
      ctx.quadraticCurveTo(-15, -25, -4, -27);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 金属包边
      ctx.strokeStyle = "#d8a93e"; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-4, -27); ctx.quadraticCurveTo(20, -25, 21, -4);
      ctx.quadraticCurveTo(20, 18, -4, 30);
      ctx.stroke();
      // 十字纹章
      ctx.strokeStyle = "#f4e6be"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(4, 22); ctx.moveTo(-8, -8); ctx.lineTo(16, -8); ctx.stroke();
      // 铆钉
      ctx.fillStyle = "#d8a93e";
      [[-8, -18], [-8, 14], [10, -20], [10, 18]].forEach(([bx, by]) => {
        ell(ctx, bx, by, 2.6, 2.6); ctx.fill();
      });
      ctx.restore();
    }
    else if (["fire", "lightning", "wind", "water", "ice", "plague", "prism", "gravity"].includes(id)) {
      const orbCol = { fire: "#ff8a2a", lightning: "#ffe14a", wind: "#9be8d8", water: "#4aa8f0", ice: "#7fd4ff", plague: "#8fd44a", prism: "#ff9ae8", gravity: "#a882e8" }[id];
      const orbGlow = { fire: "rgba(255,140,40,0.5)", lightning: "rgba(255,230,90,0.5)", wind: "rgba(150,230,210,0.5)", water: "rgba(80,170,240,0.5)", ice: "rgba(130,210,255,0.5)", plague: "rgba(140,210,80,0.5)", prism: "rgba(255,150,230,0.5)", gravity: "rgba(150,110,230,0.5)" }[id];
      grip(-12, 44);
      // 顶端法球座
      ctx.fillStyle = "#d8a93e";
      ctx.beginPath(); ctx.moveTo(40, -8); ctx.lineTo(52, -12); ctx.lineTo(52, 12); ctx.lineTo(40, 8);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 法球
      ctx.save();
      ctx.shadowColor = orbCol; ctx.shadowBlur = 14;
      ctx.fillStyle = orbGlow;
      ell(ctx, 56, 0, 13, 13); ctx.fill();
      ctx.restore();
      const grd = ctx.createRadialGradient(52, -4, 2, 56, 0, 12);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.4, orbCol); grd.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = grd;
      ell(ctx, 56, 0, 10, 10); ctx.fill(); ctx.stroke();
      // 元素纹样
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.2;
      if (id === "fire") {
        ctx.beginPath(); ctx.moveTo(52, 5); ctx.quadraticCurveTo(50, -1, 56, -5); ctx.quadraticCurveTo(54, 0, 58, 2); ctx.stroke();
      } else if (id === "lightning") {
        ctx.beginPath(); ctx.moveTo(59, -5); ctx.lineTo(53, 0); ctx.lineTo(58, 1); ctx.lineTo(52, 6); ctx.stroke();
      } else if (id === "wind") {
        ctx.beginPath(); ctx.arc(56, 1, 5, -2.4, -0.6); ctx.stroke();
      } else if (id === "ice") {
        // 六向雪花
        for (let k = 0; k < 3; k++) {
          const a = k * Math.PI / 3;
          ctx.beginPath();
          ctx.moveTo(56 - Math.cos(a) * 6, Math.sin(a) * 6);
          ctx.lineTo(56 + Math.cos(a) * 6, -Math.sin(a) * 6);
          ctx.stroke();
        }
      } else if (id === "plague") {
        // 毒泡
        ctx.fillStyle = "rgba(235,255,200,0.9)";
        ell(ctx, 53, 2, 1.8, 1.8); ctx.fill();
        ell(ctx, 58, -2, 2.6, 2.6); ctx.fill();
        ell(ctx, 60, 3, 1.5, 1.5); ctx.fill();
      } else if (id === "prism") {
        // 棱镜三角
        ctx.beginPath();
        ctx.moveTo(56, -7); ctx.lineTo(61, 5); ctx.lineTo(51, 5);
        ctx.closePath(); ctx.stroke();
      } else if (id === "gravity") {
        // 压扁轨道环 + 白月核
        ctx.beginPath(); ctx.ellipse(56, 0, 8, 3.4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ell(ctx, 64, 0, 1.6, 1.6); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(56, -6); ctx.quadraticCurveTo(61, 2, 56, 6); ctx.quadraticCurveTo(51, 2, 56, -6); ctx.stroke();
      }
    }
    ctx.restore();
  },
};
