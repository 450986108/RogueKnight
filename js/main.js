/* ============================================================
 * 星寰骑士 STELATO Knight — 启动引导：画布 / 输入 / 缩放 / 主循环 / 主菜单动画
 * ============================================================ */
"use strict";

(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");
  const hudTl = document.getElementById("hud-tl");
  const hudTc = document.getElementById("hud-tc");
  const hudTr = document.getElementById("hud-tr");
  const btnPauseEl = document.getElementById("btnPause");

  let Scale = 1;   // 舞台整体缩放倍率（resize() 更新）；舞台逻辑坐标 × Scale = 屏幕像素
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = CONFIG.W * DPR;
  canvas.height = CONFIG.H * DPR;

  Art.buildScene(DPR);
  Ambient.init();

  /* ---------------- 输入 ---------------- */
  const Input = {
    keys: {},
    mouse: { x: CONFIG.W / 2, y: CONFIG.H / 2, wx: CONFIG.W / 2, wy: CONFIG.H / 2, down: false },
  };

  function toWorld(e) {
    const rect = canvas.getBoundingClientRect();
    Input.mouse.wx = (e.clientX - rect.left) * (CONFIG.W / rect.width);
    Input.mouse.wy = (e.clientY - rect.top) * (CONFIG.H / rect.height);
  }
  canvas.addEventListener("mousemove", toWorld);
  canvas.addEventListener("mousedown", e => {
    if (e.button === 0) { Input.mouse.down = true; toWorld(e); }
    SFX.ensure();
  });
  window.addEventListener("mouseup", e => { if (e.button === 0) Input.mouse.down = false; });
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    Input.keys[e.code] = true;
    if (e.code === "Escape" || e.code === "KeyP") game.togglePause();
    if (e.code === "KeyM") game.toggleMute();
    if (e.code === "Enter") {
      if (game.state === "menu") {
        // 主菜单回车 = 用上次的操作方式开始
        const btn = document.getElementById(UI.playMode === "touch" ? "btnStartTouch" : "btnStartDesk");
        if (btn) { SFX.ensure(); btn.click(); }
      } else if (!UI.el.heroselect.classList.contains("hidden")) {
        const btn = document.getElementById("btnEmbark");
        if (btn) btn.click();
      }
    }
  });
  window.addEventListener("keyup", e => { Input.keys[e.code] = false; });
  window.addEventListener("blur", () => {
    Input.keys = {};
    Input.mouse.down = false;
    Touch.releaseAll();
  });

  /* ---------------- 触屏双摇杆 ----------------
   * 左半屏按下 → 移动摇杆（模拟量）；右半屏按下 → 瞄准摇杆（推出死区即攻击）。
   * 触点跟踪用 identifier，两指互不干扰；摇杆为"浮动式"——出现在手指落点。 */
  const Touch = {
    mode: false,                     // 首次触控后进入触屏模式（切换提示文案/HUD 按钮）
    move: { on: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0 },        // 左：移动向量 -1..1
    aim:  { on: false, id: -1, ax: 0, ay: 0, ang: 0, held: false }, // 右：攻击方向
    spots: { lx: 0, ly: 0, rx: 0, ry: 0 },                          // 空闲提示位
    _shown: false,

    releaseAll() {
      this.move.on = false; this.move.id = -1; this.move.dx = this.move.dy = 0;
      this.aim.on = false; this.aim.id = -1; this.aim.held = false;
      this.layoutIdle();
    },
    layoutIdle() {
      if (!this.mode) return;
      if (!this.move.on) setJoy(joyL, knobL, this.spots.lx, this.spots.ly, 0, 0, false);
      if (!this.aim.on) setJoy(joyR, knobR, this.spots.rx, this.spots.ry, 0, 0, false);
    },
  };
  Input.touch = Touch;

  const joyL = document.getElementById("joyL");
  const joyR = document.getElementById("joyR");
  const knobL = joyL.querySelector(".joy-knob");
  const knobR = joyR.querySelector(".joy-knob");

  function joyR2() { return window.innerHeight < 560 ? 44 : 52; }   // 摇杆半径（屏幕像素）

  /* 摇杆渲染：x/y 为舞台逻辑坐标（视觉坐标 ÷Scale），旋钮平移量为真实触点向量
   * （摇杆本体被 resize() 反向放大，其内部 1 CSS px = 1 屏幕像素） */
  function setJoy(el, knob, x, y, kx, ky, on) {
    el.style.left = x + "px";
    el.style.top = y + "px";
    knob.style.transform = "translate(" + kx + "px," + ky + "px)";
    el.classList.toggle("on", !!on);
  }

  function layoutSpots() {
    /* 空闲提示位用舞台逻辑坐标（= 1280x720 设计坐标），与缩放无关 */
    Touch.spots = { lx: CONFIG.W * 0.2, ly: CONFIG.H * 0.74, rx: CONFIG.W * 0.8, ry: CONFIG.H * 0.74 };
    Touch.layoutIdle();
  }

  function engageStick(s, x, y, id) {
    s.on = true; s.id = id; s.ax = x; s.ay = y;
    updateStick(s, x, y);
  }

  function updateStick(s, x, y) {
    const R = joyR2();
    const vx = x - s.ax, vy = y - s.ay;
    const d = Math.hypot(vx, vy) || 0.0001;
    const cd = Math.min(d, R);
    const kx = vx / d * cd, ky = vy / d * cd;
    if (s === Touch.move) {
      s.dx = kx / R; s.dy = ky / R;
      setJoy(joyL, knobL, s.ax / Scale, s.ay / Scale, kx, ky, true);
    } else {
      if (d > R * 0.32) s.ang = Math.atan2(vy, vx);   // 死区内保持上次朝向
      s.held = d > R * 0.32;
      setJoy(joyR, knobR, s.ax / Scale, s.ay / Scale, kx, ky, s.held);
    }
  }

  function endTouch(e) {
    for (const t of e.changedTouches) {
      if (Touch.move.on && t.identifier === Touch.move.id) {
        Touch.move.on = false; Touch.move.id = -1; Touch.move.dx = Touch.move.dy = 0;
        setJoy(joyL, knobL, Touch.spots.lx, Touch.spots.ly, 0, 0, false);
      } else if (Touch.aim.on && t.identifier === Touch.aim.id) {
        Touch.aim.on = false; Touch.aim.id = -1; Touch.aim.held = false;
        setJoy(joyR, knobR, Touch.spots.rx, Touch.spots.ry, 0, 0, false);
      }
    }
  }

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();               // 阻止滚动/缩放/双击放大
    SFX.ensure();
    const r = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const x = t.clientX - r.left, y = t.clientY - r.top;
      const wantMove = x < r.width / 2;
      let s = null;
      if (wantMove && !Touch.move.on) s = Touch.move;
      else if (!wantMove && !Touch.aim.on) s = Touch.aim;
      else if (!Touch.move.on) s = Touch.move;      // 本侧被占用时借用另一只空闲摇杆
      else if (!Touch.aim.on) s = Touch.aim;
      if (s) engageStick(s, x, y, t.identifier);
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const x = t.clientX - r.left, y = t.clientY - r.top;
      if (Touch.move.on && t.identifier === Touch.move.id) updateStick(Touch.move, x, y);
      else if (Touch.aim.on && t.identifier === Touch.aim.id) updateStick(Touch.aim, x, y);
    }
  }, { passive: false });

  canvas.addEventListener("touchend", endTouch);
  canvas.addEventListener("touchcancel", endTouch);

  /* 任意触控（含按钮）即进入触屏模式 */
  window.addEventListener("touchstart", () => {
    if (Touch.mode) return;
    Touch.mode = true;
    document.body.classList.add("touch");
    layoutSpots();
  }, { passive: true });

  /* 操作模式切换：主菜单"桌面端 / 移动端"按钮调用（绑定见 ui.js）。
   * 上方的触屏兜底监听只开不关 —— 混合设备上选了桌面端又去触屏，仍能切回摇杆。 */
  window.setPlayMode = mode => {
    Touch.mode = mode === "touch";
    document.body.classList.toggle("touch", Touch.mode);
    resize();   // 触屏模式画布更贴边；重算摇杆提示位
  };

  /* ---------------- 自适应缩放 ----------------
   * 整个 #stage（画布 + 菜单/选人/升级等覆盖层 + HUD）按 1280x720 设计坐标
   * 统一 transform:scale —— 手机上所有界面与桌面布局完全一致、等比变小，
   * 不会因 HTML 元素固定 px 溢出舞台（旧做法只缩放画布，菜单会被截断）。
   * 摇杆/暂停按钮反向放大回真实尺寸（拇指友好）；HUD 三组部分补偿放大。 */
  function resize() {
    /* 手机浏览器地址栏收缩时 visualViewport 更准；触屏模式画布更贴边 */
    const vp = window.visualViewport;
    const vw = vp ? vp.width : window.innerWidth;
    const vh = vp ? vp.height : window.innerHeight;
    const padX = Touch.mode ? 0.995 : 0.97;
    const padY = Touch.mode ? 0.97 : 0.95;
    const s = Math.min((vw * padX) / CONFIG.W, (vh * padY) / CONFIG.H);
    Scale = s;
    canvas.style.width = CONFIG.W + "px";
    canvas.style.height = CONFIG.H + "px";
    /* translate 居中（#stage 绝对定位在 50%/50%）：不受弹性布局溢出方向影响，任何窗口尺寸都居中 */
    stage.style.transform = "translate(-50%,-50%) scale(" + s + ")";

    /* 摇杆反向放大：内部 1 CSS px = 1 屏幕像素 */
    const inv = "scale(" + (1 / s) + ")";
    joyL.style.transform = inv;
    joyR.style.transform = inv;

    /* HUD 三组部分补偿（上限 1.55 倍）：纯等比在手机上会小到看不清 */
    const hk = s < 1 ? Math.min(1 / s, 1.55) : 1;
    hudTl.style.transform = "scale(" + hk + ")";
    hudTr.style.transform = "scale(" + hk + ")";
    hudTc.style.transform = "translateX(-50%) scale(" + hk + ")";
    btnPauseEl.style.transform = "scale(" + hk + ")";
    btnPauseEl.style.marginTop = 62 * hk + "px";   /* 跟随补偿倍率避开上方武器槽 */

    layoutSpots();
  }
  window.addEventListener("resize", resize);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
  resize();

  /* ---------------- 游戏实例 ---------------- */
  const game = new Game();
  UI.init(game);
  window.game = game;   // 调试用

  /* 调试模式（仅截图/验证用）：
   * #debug  = 开局并展示全部武器/四种怪物
   * #debug2 = 直接触发过关结算界面
   * #debug3 = 直接触发胜利结算界面 */
  const dbg = location.hash;
  if (dbg.indexOf("debug") >= 0) {
    setTimeout(() => {
      game.startRun();
      if (dbg.indexOf("debug2") >= 0) {
        game.killsThisLevel = CONFIG.LEVELS.quota(1);
        game.levelTime = 41.5; game.totalTime = 41.5; game.killsTotal = 15;
        game._beginClear();
      } else if (dbg.indexOf("debug3") >= 0) {
        game.level = CONFIG.LEVELS.count;
        game.killsThisLevel = CONFIG.LEVELS.quota(game.level);
        game.levelTime = 30; game.totalTime = 620; game.killsTotal = 390;
        game._beginClear();
      } else {
        game.player.maxHp = game.player.hp = 9999;
        game.player.weapons = CONFIG.WEAPON_ORDER.map(id => ({ id, level: 1, cd: 0 }));
        game.player.slots = CONFIG.WEAPON_ORDER.length;   // 调试：突破槽位上限展示全部
        game.player.x = 560; game.player.y = 400;
        game.monsters.push(new Monster("goblin", 1, 380, 420));
        game.monsters.push(new Monster("goblin", 1, 440, 490));
        game.monsters.push(new Monster("bat", 2, 950, 280));
        game.monsters.push(new Monster("ogre", 4, 880, 520));
        game.monsters.push(new Monster("demon", 12, 950, 170));
        Input.mouse.wx = 800; Input.mouse.wy = 350; Input.mouse.down = true;
        UI.weaponsDirty = true;
      }
    }, 400);
  }

  /* ---------------- 主菜单骑士动画 ---------------- */
  const mkCanvas = document.getElementById("menuKnight");
  mkCanvas.width = 240 * DPR; mkCanvas.height = 270 * DPR;
  const mkCtx = mkCanvas.getContext("2d");
  mkCtx.scale(DPR, DPR);
  const menuKnight = {
    x: 120, y: 222, aim: 0.2, moving: false, walkT: 0,
    iframe: 0, hurtFlash: 0, dead: false,
    swing: null, thrust: null, pulse: null,
    weapons: [{ id: "sword" }],   // 仅持剑，完整展示胸前 STELATO 徽章
  };

  function drawMenuKnight(t) {
    mkCtx.clearRect(0, 0, 240, 270);
    const cyc = t % 2.6;
    if (cyc < 0.24) menuKnight.swing = { id: "sword", t01: cyc / 0.24, dir: 1 };
    else menuKnight.swing = null;
    menuKnight.aim = 0.25 + Math.sin(t * 0.8) * 0.3;
    menuKnight.hero = UI.selectedHero;   // 主菜单大骑士 = 当前选中英雄
    // STELATO 纹章水印（骑士身后的品牌纹章，缓慢呼吸明暗）
    Art.stelato(mkCtx, 120, 155, 100, {
      light: true,
      alpha: 0.26 + 0.07 * (1 + Math.sin(t * 1.3)) / 2,
      glow: true,
    });
    // 地面光圈
    mkCtx.save();
    mkCtx.fillStyle = "rgba(255,225,140,0.16)";
    mkCtx.beginPath();
    mkCtx.ellipse(120, 228, 74, 22, 0, 0, Math.PI * 2);
    mkCtx.fill();
    mkCtx.restore();
    Art.knight(mkCtx, menuKnight, t);
  }

  /* ---------------- 选人界面卡片预览动画 ---------------- */
  const heroSelectEl = document.getElementById("heroselect");
  function drawHeroPreviews(t) {
    if (!UI.heroPreviews) return;
    for (let i = 0; i < UI.heroPreviews.length; i++) {
      const pv = UI.heroPreviews[i];
      const pt = t + i * 0.37;                    // 各卡相位错开，不齐步
      const cyc = pt % 2.6;
      pv.mock.swing = (pv.melee && cyc < 0.24) ? { id: pv.melee, t01: cyc / 0.24, dir: 1 } : null;
      pv.mock.aim = 0.25 + Math.sin(pt * 0.8) * 0.3;
      pv.ctx.setTransform(1, 0, 0, 1, 0, 0);
      pv.ctx.clearRect(0, 0, pv.w, pv.h);
      pv.ctx.setTransform(pv.s, 0, 0, pv.s, pv.tx, pv.ty);
      // 享界骑士（STELATO 原味甲）：卡片预览背后衬品牌纹章
      if (pv.mock.hero === "astro") Art.stelato(pv.ctx, 0, -52, 42, { light: true, alpha: 0.55 });
      Art.knight(pv.ctx, pv.mock, pt);
    }
  }

  /* ---------------- 主循环 ---------------- */
  let last = performance.now();

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = now / 1000;

    // 顿帧（击杀瞬间）：游戏世界短暂减速，氛围层照常流动
    FX.hitStop = Math.max(0, FX.hitStop - dt);
    game.update(FX.hitStop > 0 ? dt * 0.18 : dt, Input);
    Ambient.update(dt);

    // 画面
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sh = FX.shake * FX.shake * 14;
    if (sh > 0.3) ctx.translate((Math.random() - 0.5) * 2 * sh, (Math.random() - 0.5) * 2 * sh);

    if (game.state === "menu") {
      ctx.drawImage(Art.bgCanvas, 0, 0, CONFIG.W, CONFIG.H);
      Ambient.drawBack(ctx, t);
      FX.draw(ctx);
      drawMenuKnight(t);
      Ambient.drawFront(ctx, t);
      if (!heroSelectEl.classList.contains("hidden")) drawHeroPreviews(t);
    } else {
      game.render(ctx);
      UI.updateHUD(game);
    }

    // 摇杆仅在对局中显示（菜单/选卡等覆盖层之下不露出）
    const joyShow = Touch.mode && (game.state === "playing" || game.state === "clearing");
    if (joyShow !== Touch._shown) {
      Touch._shown = joyShow;
      joyL.style.display = joyShow ? "block" : "none";
      joyR.style.display = joyShow ? "block" : "none";
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
