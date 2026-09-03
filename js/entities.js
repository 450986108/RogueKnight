/* ============================================================
 * 星寰骑士 STELATO Knight — 实体：玩家 / 怪物 / 投射物 / 经验宝石
 * ============================================================ */
"use strict";

/* ---------------- 玩家 ---------------- */
class Player {
  constructor(heroId) {
    const P = CONFIG.PLAYER;
    this.hero = heroId || CONFIG.HERO_DEFAULT;
    const H = CONFIG.HEROES[this.hero] || CONFIG.HEROES[CONFIG.HERO_DEFAULT];
    this.x = CONFIG.W / 2; this.y = CONFIG.H / 2 + 40;
    this.radius = P.radius;
    this.hp = H.hp; this.maxHp = H.hp;
    this.speed = H.speed;
    this.mult = { dmg: 1, as: H.as, spd: 1 };
    this.armor = H.armor; this.regen = H.regen;
    this.pickupR = P.pickup * H.pickup; this.xpMult = H.xp;
    this.crit = CONFIG.BASE_CRIT;
    this.slots = H.slots;
    // 初始武器：默认阔剑；秘法骑士自带双法杖
    const start = H.startWeapons && H.startWeapons.length ? H.startWeapons : ["sword"];
    this.weapons = start.map(id => ({ id, level: 1, cd: 0 }));
    this.level = 1; this.xp = 0;
    this.upgradeLevels = {};          // 各强化已获取次数（强化幅度递进依据）

    // 圣盾（圣辉骑士）：脱战累计计时，shieldDelay 秒后生成，格挡一次伤害后破碎
    this.shield = false;
    this.shieldT = 0;

    this.aim = 0;
    this.moving = false; this.walkT = 0;
    this.iframe = 0; this.hurtFlash = 0;
    this.dustT = 0;               // 脚步扬尘计时
    this.swing = null; this.thrust = null; this.pulse = null;   // 攻击动画状态
    this.beamT = 0;                                            // 光棱激光束余辉（>0 时渲染束光）
    this.dead = false;
    this.kb = { x: 0, y: 0 };                                  // 受击击退速度
  }

  xpNeeded() { return CONFIG.xpNeeded(this.level); }

  /* 获得经验（不直接弹升级界面，由 Game 统一处理 pending 计数）。
   * 每次升级附带固有成长：生命上限与攻击力小幅提升（数值见 CONFIG.LEVELUP_GROWTH） */
  gainXp(v) {
    this.xp += v;
    let ups = 0;
    while (this.xp >= this.xpNeeded()) {
      this.xp -= this.xpNeeded();
      this.level++;
      ups++;
      const g = CONFIG.LEVELUP_GROWTH;
      const add = this.maxHp * g.hpPct / 100;
      this.maxHp += add;
      this.hp = Math.min(this.maxHp, this.hp + add);
      this.mult.dmg *= 1 + g.dmgPct / 100;
    }
    return ups;
  }

  update(dt, input) {
    // 移动（键盘方向 或 左摇杆模拟量）
    let dx = 0, dy = 0;
    if (input.keys["KeyW"] || input.keys["ArrowUp"]) dy -= 1;
    if (input.keys["KeyS"] || input.keys["ArrowDown"]) dy += 1;
    if (input.keys["KeyA"] || input.keys["ArrowLeft"]) dx -= 1;
    if (input.keys["KeyD"] || input.keys["ArrowRight"]) dx += 1;
    let len = Math.hypot(dx, dy);
    const tc = input.touch;
    if (tc && tc.move.on) { dx = tc.move.dx; dy = tc.move.dy; len = Math.hypot(dx, dy); }
    this.moving = len > 0.15;
    if (this.moving) {
      const spd = this.speed * this.mult.spd * Math.min(1, len);
      this.x += (dx / len) * spd * dt;
      this.y += (dy / len) * spd * dt;
      this.walkT += dt;
      // 脚步扬尘（周期性小土烟）
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.22;
        FX.dust(this.x - (dx / len) * 10, this.y + 1);
      }
    }
    // 击退惯性
    this.x += this.kb.x * dt; this.y += this.kb.y * dt;
    this.kb.x *= Math.max(0, 1 - 7 * dt); this.kb.y *= Math.max(0, 1 - 7 * dt);

    // 场地边界
    const A = CONFIG.ARENA;
    this.x = Math.max(A.x + this.radius, Math.min(A.x + A.w - this.radius, this.x));
    this.y = Math.max(A.y + this.radius + 14, Math.min(A.y + A.h - this.radius + 6, this.y));

    // 瞄准：鼠标 或 右摇杆方向；触屏模式下松开右摇杆时保持最后的朝向
    if (tc && tc.mode) {
      if (tc.aim.on && tc.aim.held) this.aim = tc.aim.ang;
    } else {
      this.aim = Math.atan2(input.mouse.wy - this.y, input.mouse.wx - this.x);
    }

    // 计时器
    this.iframe = Math.max(0, this.iframe - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.swing) { this.swing.t01 += dt / (this.swing.dur || 0.24); if (this.swing.t01 > 1.4) this.swing = null; }
    if (this.thrust) { this.thrust.t01 += dt / (this.thrust.dur || 0.26); if (this.thrust.t01 > 1.4) this.thrust = null; }
    if (this.pulse) { this.pulse.t01 += dt / 0.3; if (this.pulse.t01 > 1.4) this.pulse = null; }

    // 生命回复
    if (this.regen > 0 && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    }

    // 圣盾：脱战累计计时，满了生成（受击 / 格挡时由 hurtPlayer 清零重攒）
    const delay = CONFIG.HEROES[this.hero].shieldDelay;
    if (delay > 0 && !this.shield && !this.dead) {
      this.shieldT += dt;
      if (this.shieldT >= delay) {
        this.shield = true;
        FX.text(this.x, this.y - 84, "圣盾就绪", "#ffe9a0", 15);
        FX.ring(this.x, this.y - 24, 46, "#ffe9a0", 4, 0.4);
        SFX.block();
      }
    }
  }
}

/* ---------------- 怪物 ---------------- */
class Monster {
  constructor(typeId, gameLevel, x, y) {
    const M = CONFIG.MONSTERS[typeId];
    const L = CONFIG.LEVELS;
    this.type = typeId;
    this.x = x; this.y = y;
    this.radius = M.radius;
    this.hp = M.hp * L.hpScale(gameLevel);
    this.maxHp = this.hp;
    this.speed = M.speed * L.spdScale(gameLevel);
    this.dmg = M.dmg * L.dmgScale(gameLevel);
    this.xp = M.xp;
    this.animT = Math.random() * 10;
    this.atkCd = 0.6;
    this.hitFlash = 0;
    this.burnT = 0; this.burnDps = 0;
    this.stunT = 0;                                  // 眩晕（战锤）
    this.frostStacks = 0; this.frostT = 0; this.frostSlowPer = 0;   // 霜冻（冰魄）
    this.kb = { x: 0, y: 0 };
    this.dead = false;
    this.wobble = Math.random() * Math.PI * 2;
    this.spawnT = 0;        // 出生动画进度 0→1（弹性放大破土而出）
    this.squash = 0;        // 受击挤压量 1→0（渲染层做 squash & stretch）
  }

  update(dt, player, game) {
    this.animT += dt;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.spawnT = Math.min(1, this.spawnT + dt * 3.4);
    this.squash = Math.max(0, this.squash - dt * 5.5);

    // 霜冻：持续时间结束后层数清零
    if (this.frostT > 0) {
      this.frostT -= dt;
      if (this.frostT <= 0) this.frostStacks = 0;
    }
    const stunned = this.stunT > 0;
    if (stunned) this.stunT = Math.max(0, this.stunT - dt);

    // 追踪玩家（蝙蝠带横向摆动）；眩晕时停滞
    let dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist; dy /= dist;
    if (!stunned) {
      if (this.type === "bat") {
        this.wobble += dt * 5;
        const px = -dy * Math.sin(this.wobble) * 0.55;
        const py = dx * Math.sin(this.wobble) * 0.55;
        dx += px; dy += py;
        const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      }
      const slow = 1 - Math.min(0.6, this.frostStacks * this.frostSlowPer);
      this.x += dx * this.speed * slow * dt;
      this.y += dy * this.speed * slow * dt;
    }

    // 击退惯性
    this.x += this.kb.x * dt; this.y += this.kb.y * dt;
    this.kb.x *= Math.max(0, 1 - 6 * dt); this.kb.y *= Math.max(0, 1 - 6 * dt);

    // 灼烧
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.hp -= this.burnDps * dt;
      if (Math.random() < dt * 9) FX.flame(this.x, this.y - this.radius, -Math.PI / 2, 1.2, 60);
      if (this.hp <= 0 && !this.dead) { this.dead = true; game.onMonsterKilled(this, true); }
    }

    // 接触攻击（眩晕 / 破土未完成时无法出手）
    if (!stunned && !this.dead && this.spawnT > 0.75
        && dist < this.radius + player.radius + 4 && this.atkCd <= 0) {
      this.atkCd = CONFIG.MONSTER_ATK_CD;
      game.hurtPlayer(this.dmg, this.x, this.y);
    }
  }
}

/* ---------------- 投射物（风刃 / 水球 / 冰晶 / 毒球 / 黑洞） ---------------- */
class Projectile {
  /* kind: 'wind' | 'water' | 'ice' | 'plague' | 'gravity' */
  constructor(kind, x, y, ang, weapon, dmg, crit) {
    const cfg = CONFIG.WEAPONS[weapon.id];
    this.kind = kind;
    this.x = x; this.y = y - 26;
    this.ang = ang;
    this.vx = Math.cos(ang) * cfg.speed;
    this.vy = Math.sin(ang) * cfg.speed;
    this.dist = 0;
    this.maxDist = cfg.range;
    this.dmg = dmg;
    this.crit = crit;
    this.width = cfg.width || 24;
    this.aoe = cfg.aoe || 0;
    this.spin = Math.random() * Math.PI * 2;
    this.hitSet = new Set();
    this.dead = false;
    this.srcId = weapon.id;
    this.phase = "fly";        // gravity 专用：fly 飞行 → collapse 压缩倒计时
    this.timer = 0;
  }

  update(dt) {
    if (this.kind === "gravity" && this.phase === "collapse") {
      this.timer -= dt;               // 压缩阶段原地不动，吸附由 Game 驱动
      return;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.dist += Math.hypot(this.vx, this.vy) * dt;
    this.spin += dt * 14;
    if (this.dist >= this.maxDist) {
      if (this.kind === "gravity") {
        this.phase = "collapse";
        this.timer = CONFIG.WEAPONS.gravity.collapseTime;
      } else this.dead = true;
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.kind === "wind") {
      ctx.rotate(this.ang);
      // 旋转月牙风刃
      ctx.save();
      ctx.rotate(this.spin);
      ctx.strokeStyle = "rgba(210,250,235,0.95)";
      ctx.lineWidth = 4;
      ctx.fillStyle = "rgba(190,245,225,0.55)";
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, -2.4, 2.4);
      ctx.arc(9, 0, this.width / 2 - 13, 2.35, -2.35, true);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      // 内圈淡纹
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, this.width / 2 - 7, -2.1, 2.1); ctx.stroke();
    } else if (this.kind === "water") {
      // 水球
      const wob = 1 + Math.sin(t * 16 + this.spin) * 0.12;
      ctx.scale(wob, 2 - wob);
      const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 13);
      g.addColorStop(0, "#cfeaff"); g.addColorStop(0.45, "#4aa8f0"); g.addColorStop(1, "#2b62c4");
      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(30,60,120,0.65)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.arc(-4, -5, 3.4, 0, Math.PI * 2); ctx.fill();
    } else if (this.kind === "ice") {
      // 冰晶矢（带侧棱的六棱碎冰）
      ctx.rotate(this.ang);
      ctx.rotate(Math.sin(this.spin * 3) * 0.08);
      const g = ctx.createLinearGradient(-16, 0, 14, 0);
      g.addColorStop(0, "#eaf9ff"); g.addColorStop(0.6, "#8ed8f8"); g.addColorStop(1, "#3f9fd8");
      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(30,80,130,0.7)"; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(15, 0); ctx.lineTo(-2, -6.5); ctx.lineTo(-15, -2);
      ctx.lineTo(-9, 0); ctx.lineTo(-15, 2); ctx.lineTo(-2, 6.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 冰面高光
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -1.5); ctx.lineTo(9, -1.5); ctx.stroke();
    } else if (this.kind === "plague") {
      // 毒液球（晃动的黏稠绿球）
      const wob = 1 + Math.sin(t * 13 + this.spin) * 0.14;
      ctx.scale(wob, 2 - wob);
      const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 13);
      g.addColorStop(0, "#d8f0a0"); g.addColorStop(0.45, "#7ec24a"); g.addColorStop(1, "#3f7a24");
      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(30,60,20,0.7)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // 气泡
      ctx.fillStyle = "rgba(230,255,190,0.8)";
      ctx.beginPath(); ctx.arc(-3.5, -4, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, 2, 1.7, 0, Math.PI * 2); ctx.fill();
      // 尾迹毒滴
      ctx.fillStyle = "rgba(126,194,74,0.7)";
      ctx.beginPath(); ctx.arc(-Math.cos(this.spin) * 14 - 8, Math.sin(this.spin * 2) * 4, 2.6, 0, Math.PI * 2); ctx.fill();
    } else {
      // 引力黑洞（飞行/压缩两态）
      const collapsing = this.phase === "collapse";
      const pul = 1 + Math.sin(t * (collapsing ? 30 : 16)) * (collapsing ? 0.12 : 0.06);
      const R = (collapsing ? 15 - Math.min(6, (1 - this.timer / CONFIG.WEAPONS.gravity.collapseTime) * 6) : 15) * pul;
      // 吸积环
      ctx.save();
      ctx.rotate(this.spin);
      ctx.scale(1, 0.4);
      ctx.strokeStyle = "rgba(190,140,255,0.75)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 23 * pul, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(230,200,255,0.4)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 29 * pul, 0.5, Math.PI + 0.5); ctx.stroke();
      ctx.restore();
      // 黑洞主体
      ctx.save();
      ctx.shadowColor = "#8a5fc9"; ctx.shadowBlur = 16;
      const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, Math.max(R, 4));
      g.addColorStop(0, "#5a3a8a"); g.addColorStop(0.55, "#241440"); g.addColorStop(1, "#0a0616");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, Math.max(R, 4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // 中心亮核（压缩时增亮闪烁）
      ctx.fillStyle = collapsing ? "#f0dcff" : "#c9a8ff";
      ctx.shadowColor = "#e0c8ff"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, collapsing ? 5 + Math.sin(t * 40) * 1.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}

/* ---------------- 经验宝石 ---------------- */
class Gem {
  constructor(x, y, value) {
    this.x = x; this.y = y;
    this.value = value;
    this.seed = Math.random();
    const a = Math.random() * Math.PI * 2;
    this.vx = Math.cos(a) * 90; this.vy = Math.sin(a) * 90;
    this.magnet = false;
    this.vacuum = false;      // 过关清场全场吸取（吸得更快）
    this.magnetT = 0;         // 已被吸附的时间（速度渐起）
    this.dead = false;
  }

  /* 吸附：一旦进入拾取半径（或被清场吸取），速度直接指向玩家并不断加速。
   * 速度矢量始终正对玩家 → 不会绕着玩家公转盘旋，必定被吸收。 */
  update(dt, player) {
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (!this.magnet && dist < player.pickupR) this.magnet = true;

    if (this.magnet) {
      this.magnetT += dt;
      const cap = this.vacuum ? 1050 : 560;
      const speed = Math.min(cap, 250 + this.magnetT * 1500);
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
    } else {
      // 散落时的弹跳减速
      this.vx *= Math.max(0, 1 - 5 * dt);
      this.vy *= Math.max(0, 1 - 5 * dt);
    }
    this.x += this.vx * dt; this.y += this.vy * dt;

    // 移动后再判定吸收（半径略大于单帧位移，保证不会穿过）
    if (Math.hypot(player.x - this.x, player.y - this.y) < 30) this.dead = true;
  }
}
