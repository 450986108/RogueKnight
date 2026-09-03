/* ============================================================
 * 星寰骑士 STELATO Knight — 武器系统（16 种，全部可命中多个敌人）
 *   近战: 阔剑/双手战斧（扇形挥砍） 骑士长枪（窄锥突刺） 盾牌（盾击+正面格挡）
 *         影刃（极快连刺） 破甲战锤（眩晕） 链刃（穿透拉拽） 血镰（击杀吸血）
 *   法杖: 火焰（持续锥形+灼烧） 闪电（跳跃连锁） 风刃（穿透） 水球（爆炸AoE）
 *         冰魄（霜冻叠加+碎冰） 瘟疫（毒液区域） 光棱（引导激光） 引力（黑洞聚怪引爆）
 * ============================================================ */
"use strict";

const Weapons = {

  /* 等级成长：每级 +20% 伤害、+5% 攻速 */
  dmgOf(w, player) {
    const cfg = CONFIG.WEAPONS[w.id];
    return cfg.dmg * (1 + CONFIG.WEAPON_LVL.dmgPerLvl * (w.level - 1)) * player.mult.dmg;
  },
  cdOf(w, player) {
    const cfg = CONFIG.WEAPONS[w.id];
    return cfg.cd / (1 + CONFIG.WEAPON_LVL.asPerLvl * (w.level - 1)) / player.mult.as;
  },

  rollCrit(player) { return Math.random() < player.crit; },

  /* 每帧驱动所有武器：
   * 近战手持 —— 朝玩家瞄准方向（鼠标/右摇杆）出手；
   * 法杖悬浮 —— 自动索敌出手：第 i 把法杖认领第 i 近的敌人，多杖分散不同目标。 */
  update(dt, player, game) {
    if (player.beamT > 0) player.beamT -= dt;
    let sorted = null;        // 敌人近→远排序表（惰性：有法杖才计算）
    let staffIdx = 0;         // 已锁定目标的法杖序号 → 认领第几近的敌人
    for (const w of player.weapons) {
      w.cd -= dt;
      const cfg = CONFIG.WEAPONS[w.id];

      if (cfg.type !== "melee") {
        if (!sorted) sorted = game.monstersByDistance(player.x, player.y);
        if (!this._autoAim(w, player, game, sorted, staffIdx)) continue;
        staffIdx++;
      }
      if (!game.attackHeld || w.cd > 0) continue;

      w.cd = this.cdOf(w, player);
      if (w.id === "fire") this._fireTick(w, player, game);
      else if (w.id === "prism") this._prismTick(w, player, game);
      else this._attack(w, player, game);
    }
  },

  /* 悬浮法杖自动索敌：从近→远排序表中认领第 idx 近的射程内敌人
   * （敌人比法杖少时环绕复用）。有目标 → 记录朝向与目标引用；无目标 → 挂起冷却。 */
  _autoAim(w, player, game, sorted, idx) {
    const cfg = CONFIG.WEAPONS[w.id];
    const inRange = sorted.filter(m => Math.hypot(m.x - player.x, m.y - player.y) - m.radius <= cfg.range);
    if (!inRange.length) {
      w.hasTarget = false; w.target = null;
      if (w.cd < 0.1) w.cd = 0.1;   // 目标出现后 ≤0.1s 内出手
      return false;
    }
    const tgt = inRange[idx % inRange.length];
    w.hasTarget = true; w.target = tgt;
    w.aimAng = Math.atan2(tgt.y - 26 - player.y, tgt.x - player.x);
    return true;
  },

  _attack(w, player, game) {
    const cfg = CONFIG.WEAPONS[w.id];
    const aim = cfg.type === "melee" ? player.aim : w.aimAng;   // 法杖朝索敌方向

    if (cfg.type === "melee") {
      const slashCol = { shadow: "#c9b8ff", hammer: "#ffd9a0", chain: "#cfe0ff", scythe: "#ff9aa8" }[w.id]
        || (w.id === "shield" ? "#9bc4ff" : "#fff8dc");
      if (cfg.thrust) {
        player.thrust = { id: w.id, t01: 0 };
        FX.slash(player.x, player.y, aim, cfg.range, cfg.arc, "#dcecff");
        SFX.thrust();
      } else {
        if (!player.swing || player.swing.id !== w.id) player._swingDir = 1;
        player._swingDir = -(player._swingDir || 1);
        player.swing = { id: w.id, t01: 0, dir: player._swingDir };
        FX.slash(player.x, player.y, aim, cfg.range, cfg.arc, slashCol);
        SFX.swing();
      }
      // 扇形范围内所有敌人受伤（多目标）+ 各武器附加效果
      const targets = game.monstersInCone(player.x, player.y, aim, cfg.range, cfg.arc);
      for (const m of targets) {
        const crit = this.rollCrit(player);
        const dmg = this.dmgOf(w, player) * (crit ? CONFIG.CRIT_MULT : 1);
        game.hitMonster(m, dmg, crit, player.x, player.y, cfg.knockback);
        // 破甲战锤：眩晕
        if (cfg.stun && !m.dead) {
          m.stunT = Math.max(m.stunT, cfg.stun);
          FX.text(m.x, m.y - m.radius - 30, "眩晕！", "#ffe14a", 15);
          FX.ring(m.x, m.y - m.radius, 34, "#ffe14a", 4, 0.3);
          FX.spark(m.x, m.y - m.radius - 12, "#ffe14a", 5, 90);
          SFX.stun();
        }
        // 链刃：把命中的敌人聚拢到挥击路径中段（不往角色方向拉回）
        if (cfg.gather) {
          const ax = player.x + Math.cos(aim) * cfg.gatherDist;
          const ay = player.y + Math.sin(aim) * cfg.gatherDist;
          const gAng = Math.atan2(ay - m.y, ax - m.x);
          m.kb.x += Math.cos(gAng) * cfg.gather;
          m.kb.y += Math.sin(gAng) * cfg.gather;
          FX.spark(m.x, m.y - m.radius, "#cfe0ff", 4, 80);
        }
        // 血镰：击杀回复生命
        if (cfg.healPerKill && m.dead) {
          const before = player.hp;
          player.hp = Math.min(player.maxHp, player.hp + cfg.healPerKill);
          if (player.hp > before) {
            FX.text(player.x, player.y - 74, "+" + cfg.healPerKill, "#7dff8a", 16);
          }
        }
      }
    }
    else if (cfg.type === "lightning") {
      // 朝本杖认领的目标放电（_autoAim 已锁定，此处兜底最近敌人）
      const first = w.target || game.nearestMonster(player.x, player.y, cfg.range);
      if (!first) { w.cd = 0.1; return; }
      player.pulse = { id: w.id, t01: 0 };
      const pts = [{ x: player.x, y: player.y - 34 }];
      const visited = new Set();
      let cur = first;
      let dmg = this.dmgOf(w, player);
      for (let jump = 0; jump <= cfg.chains; jump++) {
        visited.add(cur);
        pts.push({ x: cur.x, y: cur.y - cur.radius - 6 });
        const crit = this.rollCrit(player);
        game.hitMonster(cur, dmg * (crit ? CONFIG.CRIT_MULT : 1), crit, cur.x + 1, cur.y + 1, 40);
        dmg *= cfg.falloff;
        // 寻找下一个连锁目标
        let next = null, best = cfg.chainRange;
        for (const m of game.monsters) {
          if (m.dead || visited.has(m)) continue;
          const d = Math.hypot(m.x - cur.x, m.y - cur.y);
          if (d < best) { best = d; next = m; }
        }
        if (!next) break;
        cur = next;
      }
      FX.bolt(pts);
      SFX.zap();
    }
    else if (cfg.type === "proj") {
      player.pulse = { id: w.id, t01: 0 };
      const crit = this.rollCrit(player);
      const dmg = this.dmgOf(w, player) * (crit ? CONFIG.CRIT_MULT : 1);
      game.projectiles.push(new Projectile(w.id, player.x, player.y, aim, w, dmg, crit));
      if (w.id === "gravity") SFX.warp();
      else SFX.shoot();
    }
  },

  /* 火焰 tick：锥形持续伤害 + 附着灼烧（朝索敌方向） */
  _fireTick(w, player, game) {
    const cfg = CONFIG.WEAPONS[w.id];
    player.pulse = { id: w.id, t01: 0 };
    const targets = game.monstersInCone(player.x, player.y, w.aimAng, cfg.range, cfg.arc);
    const dmg = this.dmgOf(w, player);
    for (const m of targets) {
      game.hitMonster(m, dmg, false, player.x, player.y, 10);
      m.burnT = cfg.burnTime;
      m.burnDps = dmg * cfg.burnDps;
    }
    SFX.fire();
  },

  /* 光棱 tick：窄束激光，距离越近伤害越高（朝索敌方向） */
  _prismTick(w, player, game) {
    const cfg = CONFIG.WEAPONS[w.id];
    player.pulse = { id: w.id, t01: 0 };
    player.beamT = 0.12;                       // 渲染层据此绘制束光
    const base = this.dmgOf(w, player);
    const targets = game.monstersInBeam(player.x, player.y - 26, w.aimAng, cfg.range, cfg.width);
    for (const m of targets) {
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      const closeness = 1 - Math.min(1, d / cfg.range);
      const crit = this.rollCrit(player);
      const dmg = base * (1 + cfg.closeBonus * closeness) * (crit ? CONFIG.CRIT_MULT : 1);
      game.hitMonster(m, dmg, crit, player.x, player.y, 12);
      FX.spark(m.x, m.y - m.radius, "#ffb0f0", 2, 70);
    }
    SFX.laser();
  },

  /* 光棱束光渲染（由 Game.render 调用；beamT>0 时可见，朝索敌方向） */
  drawPrism(ctx, game) {
    const p = game.player;
    if (!p || p.beamT <= 0 || p.dead) return;
    const w = p.weapons.find(x => x.id === "prism");
    if (!w) return;
    const ang = w.aimAng !== undefined ? w.aimAng : p.aim;
    const cfg = CONFIG.WEAPONS.prism;
    const sx = p.x + Math.cos(ang) * 30;
    const sy = p.y - 30 + Math.sin(ang) * 30;
    const ex = p.x + Math.cos(ang) * cfg.range;
    const ey = p.y - 30 + Math.sin(ang) * cfg.range;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    // 外晕
    ctx.strokeStyle = "rgba(255,150,230,0.22)";
    ctx.lineWidth = cfg.width;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    // 中层
    ctx.strokeStyle = "rgba(255,180,245,0.5)";
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    // 白热核心
    ctx.strokeStyle = "rgba(255,245,255,0.95)";
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    // 枪口辉光
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 16);
    g.addColorStop(0, "rgba(255,230,250,0.9)"); g.addColorStop(1, "rgba(255,150,230,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  /* 火焰持续视觉粒子（每帧由 Game 调用；只画锁定了目标的法杖，朝索敌方向） */
  flameFx(player) {
    for (const w of player.weapons) {
      if (w.id !== "fire" || !w.hasTarget) continue;
      const cfg = CONFIG.WEAPONS.fire;
      const sx = player.x + Math.cos(w.aimAng) * 34;
      const sy = player.y - 30 + Math.sin(w.aimAng) * 34;
      const n = 3;
      for (let i = 0; i < n; i++) {
        FX.flame(sx, sy, w.aimAng, cfg.arc * Math.PI / 180, 300 + Math.random() * 160);
      }
    }
  },

  /* 盾牌正面格挡判定：攻击来源是否在玩家正面格挡弧内 */
  shieldBlocks(player, srcX, srcY) {
    const hasShield = player.weapons.some(w => w.id === "shield");
    if (!hasShield) return false;
    const cfg = CONFIG.WEAPONS.shield;
    const angTo = Math.atan2(srcY - player.y, srcX - player.x);
    let d = Math.abs(angTo - player.aim);
    while (d > Math.PI) d = Math.abs(d - Math.PI * 2);
    return d <= (cfg.blockArc * Math.PI / 180) / 2;
  },
};
