/* ============================================================
 * 星寰骑士 STELATO Knight — 武器系统（16 种，全部可命中多个敌人）
 *   近战: 阔剑/战斧/血镰（扇形挥砍） 长枪/链刃（直线突刺） 盾牌（盾击+正面格挡）
 *         影刃（双手速刺） 破甲战锤（眩晕） 链刃（穿透+拉到中线） 血镰（击杀吸血）
 *   法杖: 火焰（持续锥形+灼烧） 闪电（跳跃连锁） 风刃（穿透） 水球（爆炸AoE）
 *         冰魄（霜冻叠加+碎冰） 瘟疫（毒液区域） 光棱（单体锁定激光） 引力（黑洞聚怪引爆）
 * ============================================================ */
"use strict";

const Weapons = {

  /* 等级成长：第 n 次强化 伤害 +(dmgBase+dmgPer×(n-1))%、攻速 +(asBase+asPer×(n-1))%，逐次乘算 */
  _lvlMult(level, base, per) {
    let m = 1;
    for (let n = 1; n < level; n++) m *= 1 + (base + per * (n - 1)) / 100;
    return m;
  },
  dmgOf(w, player) {
    const cfg = CONFIG.WEAPONS[w.id];
    const L = CONFIG.WEAPON_LVL;
    return cfg.dmg * this._lvlMult(w.level, L.dmgBase, L.dmgPer) * player.mult.dmg;
  },
  cdOf(w, player) {
    const cfg = CONFIG.WEAPONS[w.id];
    const L = CONFIG.WEAPON_LVL;
    return cfg.cd / this._lvlMult(w.level, L.asBase, L.asPer) / player.mult.as;
  },

  rollCrit(player) { return Math.random() < player.crit; },

  /* 每帧驱动所有武器：
   * 近战手持 —— 朝玩家瞄准方向（鼠标/右摇杆）出手；
   * 法杖悬浮 —— 自动索敌出手：第 i 把法杖认领第 i 近的敌人，多杖分散不同目标。 */
  update(dt, player, game) {
    if (player.beamT > 0) player.beamT -= dt;
    // 多段刺结算（影刃 hits:2）：第二把匕首刺出帧（hit2At 对齐左手突刺曲线）再结算一击
    if (player.thrust && !player.thrust.hit2) {
      const cfg2 = CONFIG.WEAPONS[player.thrust.id];
      if (cfg2 && cfg2.hits >= 2 && player.thrust.t01 >= (cfg2.hit2At || 0.6)) {
        player.thrust.hit2 = true;
        const w2 = player.weapons.find(x => x.id === player.thrust.id);
        if (w2) {
          const aim2 = player.aim;                      // 近战沿玩家瞄准方向
          FX.lunge(player.x, player.y, aim2, cfg2.range, "#c9b8ff");
          SFX.thrust();
          this._meleeConeHit(w2, player, game, aim2);
        }
      }
    }
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
   * （敌人比法杖少时环绕复用）。有目标 → 记录朝向与目标引用；无目标 → 挂起冷却。
   * 光棱例外：单体持续照射，锁定目标直到其死亡或脱离射程才换目标（不追最近跳变）。 */
  _autoAim(w, player, game, sorted, idx) {
    const cfg = CONFIG.WEAPONS[w.id];
    const inRange = sorted.filter(m => Math.hypot(m.x - player.x, m.y - player.y) - m.radius <= cfg.range);
    if (!inRange.length) {
      w.hasTarget = false; w.target = null;
      if (w.cd < 0.1) w.cd = 0.1;   // 目标出现后 ≤0.1s 内出手
      return false;
    }
    if (w.id === "prism" && w.target && !w.target.dead && inRange.includes(w.target)) {
      w.hasTarget = true;           // 目标仍在射程内：光棱继续锁定，不重新认领
      w.aimAng = Math.atan2(w.target.y - 26 - player.y, w.target.x - player.x);
      return true;
    }
    const tgt = inRange[idx % inRange.length];
    w.hasTarget = true; w.target = tgt;
    w.aimAng = Math.atan2(tgt.y - 26 - player.y, tgt.x - player.x);
    return true;
  },

  /* 近战锥形命中结算：扇形范围内所有敌人受伤（多目标）+ 各武器附加效果
   * （出手瞬间与影刃二段刺共用：同一次出手可按 hits 多次调用，每次独立掷暴击） */
  _meleeConeHit(w, player, game, aim) {
    const cfg = CONFIG.WEAPONS[w.id];
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
      // 链刃：把命中者垂直拉到突刺中线上（沿线聚成一列；保持各自远近，不拉回角色）
      if (cfg.gather) {
        const dx = m.x - player.x, dy = m.y - player.y;
        const fwd = Math.max(60, Math.min(cfg.range - 30, dx * Math.cos(aim) + dy * Math.sin(aim)));
        const tx = player.x + Math.cos(aim) * fwd;
        const ty = player.y + Math.sin(aim) * fwd;
        const off = Math.hypot(tx - m.x, ty - m.y);
        if (off > 2) {
          // 击退速度按 6/s 衰减 → 位移≈初速/6；拉力∝偏离距离则刚好收在线上不穿线
          const gAng = Math.atan2(ty - m.y, tx - m.x);
          const pull = Math.min(cfg.gather, off * 6.5);
          m.kb.x += Math.cos(gAng) * pull;
          m.kb.y += Math.sin(gAng) * pull;
        }
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
  },

  _attack(w, player, game) {
    const cfg = CONFIG.WEAPONS[w.id];
    const aim = cfg.type === "melee" ? player.aim : w.aimAng;   // 法杖朝索敌方向

    if (cfg.type === "melee") {
      const slashCol = { hammer: "#ffd9a0", scythe: "#ff9aa8" }[w.id]
        || (w.id === "shield" ? "#9bc4ff" : "#fff8dc");
      if (cfg.thrust) {
        player._thrustDir = -(player._thrustDir || 1);          // 左右手交替刺（影刃）/曲腕方向交替
        player.thrust = { id: w.id, t01: 0, dir: player._thrustDir, dur: cfg.anim || 0.26 };
        if (w.id === "shield") {
          // 盾击：盾面冲击环（盾在左手，见 art2 持盾臂前顶）
          FX.ring(player.x + Math.cos(aim) * 42, player.y - 18 + Math.sin(aim) * 42, 34, "#9bc4ff", 4, 0.24);
        } else {
          const lungeCol = { chain: "#cfe0ff", shadow: "#c9b8ff" }[w.id] || "#dcecff";
          FX.lunge(player.x, player.y, aim, cfg.range, lungeCol);   // 直刺光带（随进度刺出后消散）
        }
        SFX.thrust();
      } else {
        if (!player.swing || player.swing.id !== w.id) player._swingDir = 1;
        player._swingDir = -(player._swingDir || 1);
        player.swing = { id: w.id, t01: 0, dir: player._swingDir, dur: cfg.anim || 0.24 };
        FX.slash(player.x, player.y, aim, cfg.range, cfg.arc, slashCol);
        SFX.swing();
      }
      this._meleeConeHit(w, player, game, aim);
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

  /* 光棱 tick：单体照射——只伤本杖认领的目标（w.target），距离越近伤害越高 */
  _prismTick(w, player, game) {
    const cfg = CONFIG.WEAPONS[w.id];
    player.pulse = { id: w.id, t01: 0 };
    player.beamT = 0.12;                       // 渲染层据此绘制束光
    const m = w.target;
    if (!m || m.dead) return;
    const d = Math.hypot(m.x - player.x, m.y - player.y);
    const closeness = 1 - Math.min(1, d / cfg.range);
    const crit = this.rollCrit(player);
    const dmg = this.dmgOf(w, player) * (1 + cfg.closeBonus * closeness) * (crit ? CONFIG.CRIT_MULT : 1);
    game.hitMonster(m, dmg, crit, player.x, player.y, 12);
    FX.spark(m.x, m.y - m.radius, "#ffb0f0", 2, 70);
    SFX.laser();
  },

  /* 光棱束光渲染（由 Game.render 调用；beamT>0 时可见）
   * 单体：杖头到目标身上的光斑连一条发光细线，长度随主角与敌人间距变化（最远到射程） */
  drawPrism(ctx, game) {
    const p = game.player;
    if (!p || p.beamT <= 0 || p.dead) return;
    const w = p.weapons.find(x => x.id === "prism");
    const m = w && w.target;
    if (!w || !m || m.dead) return;
    const cfg = CONFIG.WEAPONS.prism;
    const mx = m.x, my = m.y - 26;                        // 光斑中心：目标躯干
    const dx = mx - p.x, dy = my - (p.y - 30);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, cfg.range / d);                 // 连线长度封顶在射程处
    const ex = p.x + dx * k, ey = (p.y - 30) + dy * k;
    const sx = p.x + dx / d * 30, sy = (p.y - 30) + dy / d * 30;   // 杖头（朝目标方向 30px 处）
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, p.beamT / 0.08);        // 出手间隔内的余辉淡出
    ctx.lineCap = "round";
    // 细线三层：外晕 / 中层 / 白热核心
    ctx.strokeStyle = "rgba(255,150,230,0.25)";
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "rgba(255,180,245,0.6)";
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "rgba(255,245,255,0.95)";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    // 杖头辉光
    const g0 = ctx.createRadialGradient(sx, sy, 1, sx, sy, 13);
    g0.addColorStop(0, "rgba(255,230,250,0.85)"); g0.addColorStop(1, "rgba(255,150,230,0)");
    ctx.fillStyle = g0;
    ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI * 2); ctx.fill();
    // 目标身上的光斑（径向渐变 + 呼吸脉动；超射程封顶时随比例收回）
    const R = (18 + 3 * Math.sin(game.t * 14)) * k;
    const g = ctx.createRadialGradient(ex, ey, 1, ex, ey, R);
    g.addColorStop(0, "rgba(255,250,255,0.95)");
    g.addColorStop(0.35, "rgba(255,180,245,0.75)");
    g.addColorStop(1, "rgba(255,150,230,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ex, ey, R, 0, Math.PI * 2); ctx.fill();
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
