/* ============================================================
 * 星寰骑士 STELATO Knight — 游戏主控：状态机 / 生成 / 碰撞 / 关卡推进
 * 状态: menu → playing ⇄ levelup/paused → clearing → transition
 *       playing → dying → gameover ；第20关 clearing → victory
 * ============================================================ */
"use strict";

class Game {
  constructor() {
    this.state = "menu";
    this.player = null;
    this.heroId = CONFIG.HERO_DEFAULT;   // 当前对局骑士（重开沿用）
    this.monsters = [];
    this.projectiles = [];
    this.gems = [];
    this.pools = [];           // 毒液区域（瘟疫法杖）
    this.level = 1;
    this.killsThisLevel = 0;
    this.killsTotal = 0;
    this.levelTime = 0;
    this.totalTime = 0;
    this.spawnTimer = 0;
    this.pendingLevelups = 0;
    this.attackHeld = false;
    this.clearTimer = 0;
    this.deathTimer = 0;
    this.t = 0;
  }

  /* ---------------- 流程 ---------------- */
  startRun(heroId) {
    this.heroId = heroId || this.heroId || CONFIG.HERO_DEFAULT;   // 重开一局沿用上次所选
    this.player = new Player(this.heroId);
    this.monsters.length = 0;
    this.projectiles.length = 0;
    this.gems.length = 0;
    this.pools.length = 0;
    this.level = 1;
    this.killsThisLevel = 0; this.killsTotal = 0;
    this.levelTime = 0; this.totalTime = 0;
    this.spawnTimer = 1.2;
    this.pendingLevelups = 0;
    this.clearTimer = 0; this.deathTimer = 0;
    FX.reset();
    UI.hideAllOverlays();
    UI.show(UI.el.hud);
    UI.weaponsDirty = true;
    this.state = "playing";
    UI.banner("第 1 关");
    SFX.horn();
  }

  nextLevel() {
    this.level++;
    this.player.hp = this.player.maxHp;        // 过关回满血
    // 通过第 10 关：额外奖励升 1 级（下一关开始时弹选卡）
    if (this.level - 1 === CONFIG.LEVELS.bonusAfter) {
      this.pendingLevelups += this.player.gainXp(this.player.xpNeeded());
      FX.text(this.player.x, this.player.y - 100, "通关奖励：升 1 级！", "#ffe14a", 22);
      FX.ring(this.player.x, this.player.y, 90, "#ffe14a", 6, 0.5);
      SFX.pick();
    }
    this.killsThisLevel = 0;
    this.levelTime = 0;
    this.monsters.length = 0;
    this.projectiles.length = 0;
    this.gems.length = 0;
    this.pools.length = 0;
    this.spawnTimer = 1.0;
    UI.hide(UI.el.transition);
    this.state = "playing";
    UI.banner(`第 ${this.level} 关`);
    SFX.horn();
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      UI.show(UI.el.pause);
      UI.updatePause(SFX.muted);
    } else if (this.state === "paused") {
      this.state = "playing";
      UI.hide(UI.el.pause);
    }
  }

  toggleMute() {
    SFX.muted = !SFX.muted;
    UI.updatePause(SFX.muted);
  }

  /* 重启轮回：放弃本局，回到主菜单重新选择桌面端/移动端入口 */
  backToMenu() {
    this.state = "menu";
    this.player = null;
    this.monsters.length = 0;
    this.projectiles.length = 0;
    this.gems.length = 0;
    this.pools.length = 0;
    this.pendingLevelups = 0;
    FX.reset();
    UI.hideAllOverlays();
    UI.hide(UI.el.hud);
    UI.show(UI.el.menu);
  }

  /* ---------------- 主更新 ---------------- */
  update(dt, input) {
    this.t += dt;
    if (this.state === "playing") this._playing(dt, input);
    else if (this.state === "clearing") this._clearing(dt);
    else if (this.state === "dying") this._dying(dt);
    FX.update(dt);
  }

  _playing(dt, input) {
    const L = CONFIG.LEVELS;
    this.levelTime += dt; this.totalTime += dt;
    // 自动攻击（默认开）：武器始终出手；关闭时回到键鼠/摇杆按住攻击
    this.attackHeld = !!CONFIG.AUTO_ATTACK || input.mouse.down || !!input.keys["Space"]
      || !!(input.touch && input.touch.aim.on && input.touch.aim.held);
    const p = this.player;

    // 生成怪物（关卡配额外持续刷新，同屏有上限）
    if (this.monsters.length < L.maxOnScreen(this.level)) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawn();
        this.spawnTimer = L.spawnGap(this.level) * (0.75 + Math.random() * 0.5);
      }
    }

    p.update(dt, input);
    Weapons.update(dt, p, this);
    if (p.weapons.some(w => w.id === "fire")) Weapons.flameFx(p);

    for (const m of this.monsters) m.update(dt, p, this);
    this._separate();
    this._projectiles(dt);
    this._pools(dt);
    this._gems(dt);

    this.monsters = this.monsters.filter(m => !m.dead);
    this.gems = this.gems.filter(g => !g.dead);

    // 升级优先于过关结算
    if (p.dead) return;
    if (this.pendingLevelups > 0) {
      this.state = "levelup";
      UI.showLevelUp(this, () => { this.state = "playing"; });
    } else if (this.killsThisLevel >= L.quota(this.level)) {
      this._beginClear();
    }
  }

  /* 击杀配额达成 → 清场 */
  _beginClear() {
    this.state = "clearing";
    this.clearTimer = 0;
    for (const m of this.monsters) {
      const cfg = CONFIG.MONSTERS[m.type];
      const big = m.type === "ogre" || m.type === "demon";
      FX.poof(m.x, m.y, cfg.color, big ? 20 : 10, big ? 9 : 6);
    }
    this.monsters.length = 0;
    // 场上全部经验宝石开启真空吸取，飞向玩家逐个结算（见 _clearing）
    for (const g of this.gems) { g.magnet = true; g.vacuum = true; }
    this.projectiles.length = 0;
    this.pools.length = 0;
    FX.ring(this.player.x, this.player.y, 130, "#ffe14a", 7, 0.55);
    FX.addShake(0.2);
    SFX.horn();
  }

  _clearing(dt) {
    this.clearTimer += dt;

    // 经验真空吸取：宝石飞到玩家身上即结算
    const p = this.player;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.update(dt, p);
      if (g.dead) {
        this.pendingLevelups += p.gainXp(g.value * p.xpMult);
        this._pickupSfx();
        FX.spark(g.x, g.y - 8, "#8fe0ff", 3, 60);
        this.gems.splice(i, 1);
      }
    }
    // 兜底：吸取超过 3.2s 还没飞到的（理论上不会发生）直接结算
    if (this.clearTimer > 3.2 && this.gems.length) {
      for (const g of this.gems) this.pendingLevelups += p.gainXp(g.value * p.xpMult);
      this.gems.length = 0;
    }

    if (this.clearTimer < 1.0 || this.gems.length) return;
    const finish = () => {
      if (this.level >= CONFIG.LEVELS.count) {
        this.state = "victory";
        UI.showVictory(this);
      } else {
        this.state = "transition";
        UI.showTransition(this);
      }
    };
    if (this.pendingLevelups > 0) {
      this.state = "levelup";
      UI.showLevelUp(this, finish);
    } else {
      finish();
    }
  }

  _dying(dt) {
    this.deathTimer += dt;
    if (this.deathTimer >= 1.3) {
      this.state = "gameover";
      UI.showGameOver(this);
    }
  }

  /* ---------------- 战斗结算 ---------------- */
  hurtPlayer(dmg, srcX, srcY) {
    const p = this.player;
    if (p.iframe > 0 || p.dead || this.state !== "playing") return;

    if (Weapons.shieldBlocks(p, srcX, srcY)) {
      FX.text(p.x, p.y - 66, "格挡！", "#9bc4ff", 19);
      FX.spark((p.x + srcX) / 2, (p.y + srcY) / 2 - 18, "#9bc4ff", 8, 130);
      FX.ring(p.x, p.y, 48, "#9bc4ff", 4, 0.25);
      SFX.block();
      return;
    }

    // 圣盾（圣辉骑士）：完全格挡一次伤害，破碎后重新脱战计时
    if (p.shield) {
      p.shield = false;
      p.shieldT = 0;
      p.iframe = CONFIG.PLAYER.iframes;
      FX.text(p.x, p.y - 66, "圣盾！", "#ffe9a0", 21);
      FX.spark(p.x, p.y - 30, "#ffe9a0", 9, 150);
      FX.ring(p.x, p.y - 24, 56, "#ffe9a0", 5, 0.3);
      SFX.block();
      return;
    }

    const real = Math.max(1, dmg - p.armor);
    p.hp -= real;
    p.iframe = CONFIG.PLAYER.iframes;
    p.hurtFlash = 0.3;
    p.shieldT = 0;                       // 受伤打断圣盾蓄能
    const ang = Math.atan2(p.y - srcY, p.x - srcX);
    p.kb.x += Math.cos(ang) * 190;
    p.kb.y += Math.sin(ang) * 190;
    FX.addShake(0.4);
    FX.text(p.x, p.y - 66, "-" + Math.round(real), "#ff5a4a", 21);
    FX.spark(p.x, p.y - 30, "#ff5a4a", 7, 150);
    UI.hurtFlash();
    SFX.hurt();

    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      this.state = "dying";
      this.deathTimer = 0;
      FX.poof(p.x, p.y, "#56637a", 18, 9);
      FX.addShake(0.8);
    }
  }

  hitMonster(m, dmg, crit, srcX, srcY, kb = 70) {
    if (m.dead) return;
    m.hp -= dmg;
    m.hitFlash = 0.12;
    m.squash = Math.min(1, m.squash + (crit ? 0.85 : 0.55));   // 受击挤压（渲染层）
    const ang = Math.atan2(m.y - srcY, m.x - srcX);
    const mass = m.type === "demon" ? 0.25 : m.type === "ogre" ? 0.35 : 1;   // 巨魔/恶魔难以击退
    m.kb.x += Math.cos(ang) * kb * 3 * mass;
    m.kb.y += Math.sin(ang) * kb * 3 * mass;
    FX.dmg(m.x, m.y - m.radius * 1.6, Math.max(1, Math.round(dmg)), crit);
    // 方向性火花：沿击退方向锥形喷溅（贴图感的全向火花 → 有来有回的打击感）
    FX.sparkDir(m.x, m.y - m.radius * 0.7, ang, crit ? "#ffb028" : "#ffe14a", crit ? 8 : 5, 190, 0.85);
    if (crit) {
      FX.ring(m.x, m.y - m.radius * 0.5, 30 + m.radius, "rgba(255,190,80,0.9)", 3.5, 0.22);
      FX.addShake(0.1);
    }
    if (crit) SFX.crit(); else SFX.hit();
    if (m.hp <= 0) {
      m.dead = true;
      this.onMonsterKilled(m);
    }
  }

  onMonsterKilled(m) {
    this.killsThisLevel++;
    this.killsTotal++;
    const cfg = CONFIG.MONSTERS[m.type];
    const big = m.type === "ogre" || m.type === "demon";
    // 击杀爆裂：白闪冲击环 + 本色粒子 + 方向飞溅 + 微顿帧
    FX.ring(m.x, m.y - m.radius * 0.4, (big ? 78 : 48) + m.radius, "rgba(255,255,255,0.95)", 5, 0.26);
    FX.ring(m.x, m.y - m.radius * 0.4, (big ? 56 : 34) + m.radius * 0.7, cfg.color, 4, 0.34);
    FX.poof(m.x, m.y, cfg.color, big ? 22 : 12, big ? 10 : 7);
    FX.sparkDir(m.x, m.y - m.radius, -Math.PI / 2 + (Math.random() - 0.5) * 1.2, cfg.color, big ? 10 : 6, 230, 1.1);
    FX.addHitStop(big ? 0.085 : 0.045);
    if (big) FX.addShake(0.3);
    this.gems.push(new Gem(m.x, m.y, m.xp));
    SFX.mDie();
    // 血怒骑士：击杀回复生命（与血镰的吸血叠加）
    const p = this.player;
    const heal = CONFIG.HEROES[p.hero].healPerKill;
    if (heal && !p.dead) {
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      if (p.hp > before) FX.text(p.x, p.y - 74, "+" + heal, "#ff8a96", 15);
    }
  }

  /* ---------------- 查询工具 ---------------- */
  monstersInCone(x, y, ang, range, arcDeg) {
    const half = (arcDeg * Math.PI / 180) / 2;
    const out = [];
    for (const m of this.monsters) {
      if (m.dead) continue;
      const dx = m.x - x, dy = m.y - y;
      const d = Math.hypot(dx, dy);
      if (d > range + m.radius) continue;
      let ad = Math.abs(Math.atan2(dy, dx) - ang);
      while (ad > Math.PI) ad = Math.abs(ad - Math.PI * 2);
      // 近身敌人按体型放宽角度，避免贴脸打不中
      if (ad <= half + Math.atan2(m.radius, Math.max(d, 1))) out.push(m);
    }
    return out;
  }

  nearestMonsterInCone(x, y, ang, range, arcDeg) {
    const list = this.monstersInCone(x, y, ang, range, arcDeg);
    let best = null, bd = Infinity;
    for (const m of list) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  /* 射程内最近敌人（悬浮法杖自动索敌用）；距离计入体型，无则返回 null */
  nearestMonster(x, y, range) {
    let best = null, bd = Infinity;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - x, m.y - y) - m.radius;
      if (d < bd) { bd = d; best = m; }
    }
    return bd <= range ? best : null;
  }

  /* 存活敌人按与玩家距离近→远排序（多法杖错开认领目标用） */
  monstersByDistance(x, y) {
    return this.monsters
      .filter(m => !m.dead)
      .map(m => ({ m, d: Math.hypot(m.x - x, m.y - y) }))
      .sort((a, b) => a.d - b.d)
      .map(e => e.m);
  }

  /* ---------------- 怪物生成 ---------------- */
  _spawn() {
    const w = CONFIG.LEVELS.weights[this.level - 1];
    const types = ["goblin", "bat", "ogre", "demon"];
    let total = 0;
    for (const v of w) total += v;
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < types.length; idx++) { r -= w[idx] || 0; if (r <= 0) break; }
    idx = Math.min(idx, types.length - 1);

    const A = CONFIG.ARENA;
    const side = (Math.random() * 4) | 0;
    let x, y;
    if (side === 0) { x = A.x - 34; y = A.y + Math.random() * A.h; }
    else if (side === 1) { x = A.x + A.w + 34; y = A.y + Math.random() * A.h; }
    else if (side === 2) { x = A.x + Math.random() * A.w; y = A.y - 34; }
    else { x = A.x + Math.random() * A.w; y = A.y + A.h + 34; }
    this.monsters.push(new Monster(types[idx], this.level, x, y));
    // 破土尘土
    FX.poof(x, y + 6, "#cabf9c", 6, 5);
  }

  /* 怪物间分离，防止叠成一团 */
  _separate() {
    const ms = this.monsters;
    for (let i = 0; i < ms.length; i++) {
      for (let j = i + 1; j < ms.length; j++) {
        const a = ms[i], b = ms[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.radius + b.radius;
        if (d > 0 && d < min) {
          const push = (min - d) / d * 0.5;
          const wa = b.radius / (a.radius + b.radius);
          const wb = a.radius / (a.radius + b.radius);
          a.x -= dx * push * wa * 2; a.y -= dy * push * wa * 2;
          b.x += dx * push * wb * 2; b.y += dy * push * wb * 2;
        }
      }
    }
  }

  /* ---------------- 投射物 ---------------- */
  _projectiles(dt) {
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      pr.update(dt);
      if (pr.kind === "wind") {
        if (Math.random() < dt * 30) {
          FX.particles.push({
            x: pr.x, y: pr.y, vx: -pr.vx * 0.12, vy: -pr.vy * 0.12,
            life: 0.2, max: 0.2, size: 4, col: "#bdf2df", grav: 0, add: true, shrink: true,
          });
        }
        for (const m of this.monsters) {
          if (m.dead || pr.hitSet.has(m)) continue;
          const d = Math.hypot(m.x - pr.x, m.y - 26 - pr.y);
          if (d < pr.width / 2 + m.radius) {
            pr.hitSet.add(m);
            this.hitMonster(m, pr.dmg, pr.crit, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, 40);
          }
        }
      } else if (pr.kind === "water") {
        if (Math.random() < dt * 24) {
          FX.particles.push({
            x: pr.x, y: pr.y,
            vx: -pr.vx * 0.1 + (Math.random() - 0.5) * 50,
            vy: -pr.vy * 0.1 + (Math.random() - 0.5) * 50,
            life: 0.28, max: 0.28, size: 3.5, col: "#7ec4ff", grav: 80, add: false, shrink: true,
          });
        }
        for (const m of this.monsters) {
          if (m.dead) continue;
          const d = Math.hypot(m.x - pr.x, m.y - 26 - pr.y);
          if (d < 12 + m.radius) {
            pr.dead = true;
            this._explodeWater(pr);
            break;
          }
        }
      } else if (pr.kind === "ice") {
        // 冰晶矢：穿透命中叠加霜冻，叠满碎冰溅射
        if (Math.random() < dt * 26) {
          FX.particles.push({
            x: pr.x, y: pr.y,
            vx: -pr.vx * 0.08 + (Math.random() - 0.5) * 40,
            vy: -pr.vy * 0.08 + (Math.random() - 0.5) * 40,
            life: 0.24, max: 0.24, size: 3, col: "#bfeeff", grav: 30, add: true, shrink: true,
          });
        }
        for (const m of this.monsters) {
          if (m.dead || pr.hitSet.has(m)) continue;
          const d = Math.hypot(m.x - pr.x, m.y - 26 - pr.y);
          if (d < 12 + m.radius) {
            pr.hitSet.add(m);
            this.hitMonster(m, pr.dmg, pr.crit, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, 30);
            const cfg = CONFIG.WEAPONS.ice;
            m.frostStacks = Math.min(cfg.frostMax, m.frostStacks + 1);
            m.frostT = cfg.frostTime;
            m.frostSlowPer = cfg.frostSlow;
            FX.spark(m.x, m.y - m.radius, "#9fe8ff", 4, 90);
            if (m.frostStacks >= cfg.frostMax) this._iceShatter(m, pr);
          }
        }
      } else if (pr.kind === "plague") {
        // 毒液球：命中敌人或落地即形成毒液区域
        if (Math.random() < dt * 20) {
          FX.particles.push({
            x: pr.x, y: pr.y,
            vx: -pr.vx * 0.06 + (Math.random() - 0.5) * 30,
            vy: -pr.vy * 0.06 + (Math.random() - 0.5) * 30,
            life: 0.3, max: 0.3, size: 3, col: "#8fd44a", grav: 100, add: false, shrink: true,
          });
        }
        for (const m of this.monsters) {
          if (m.dead) continue;
          const d = Math.hypot(m.x - pr.x, m.y - 26 - pr.y);
          if (d < 12 + m.radius) {
            this.hitMonster(m, pr.dmg, pr.crit, pr.x, pr.y, 30);
            pr.dead = true;
            break;
          }
        }
      } else if (pr.kind === "gravity") {
        // 引力黑洞：飞行/压缩阶段持续把附近敌人吸向球体
        const cfg = CONFIG.WEAPONS.gravity;
        for (const m of this.monsters) {
          if (m.dead) continue;
          const dx = pr.x - m.x, dy = pr.y - 26 - m.y;
          const d = Math.hypot(dx, dy);
          if (d > 1 && d < cfg.pullR + m.radius) {
            const pull = cfg.pull * (pr.phase === "collapse" ? 1.6 : 1);
            m.x += dx / d * pull * dt;
            m.y += dy / d * pull * dt;
          }
        }
        // 压缩倒计时结束 → 引爆
        if (pr.phase === "collapse" && pr.timer <= 0) this._gravityBlast(pr);
      }
      // 水球到达射程尽头也会爆裂
      if (pr.dead && pr.kind === "water" && !pr.exploded) this._explodeWater(pr);
      // 毒球到达射程尽头落地成池
      if (pr.dead && pr.kind === "plague" && !pr.pooled) this._spawnPool(pr);
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  _explodeWater(pr) {
    pr.exploded = true;
    const aoe = CONFIG.WEAPONS.water.aoe;
    FX.ring(pr.x, pr.y + 14, aoe, "#4aa8f0", 8, 0.4);
    FX.droplet(pr.x, pr.y, 14);
    FX.addShake(0.22);
    SFX.boom();
    for (const m of this.monsters) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - pr.x, m.y - 26 - pr.y);
      if (d < aoe + m.radius) {
        this.hitMonster(m, pr.dmg, pr.crit, pr.x, pr.y, 90);
      }
    }
  }

  /* 冰魄：霜冻叠满 → 碎冰溅射（对含目标在内的周围敌人） */
  _iceShatter(m, pr) {
    const cfg = CONFIG.WEAPONS.ice;
    m.frostStacks = 0;
    m.frostT = 0;
    FX.ring(m.x, m.y - 14, cfg.shatterR, "#9fe8ff", 6, 0.3);
    FX.poof(m.x, m.y - 14, "#c9f2ff", 10, 6);
    SFX.shatter();
    for (const o of this.monsters) {
      if (o.dead) continue;
      if (Math.hypot(o.x - m.x, o.y - m.y) < cfg.shatterR + o.radius) {
        this.hitMonster(o, pr.dmg * cfg.shatterDmg, false, m.x, m.y, 40);
      }
    }
  }

  /* 瘟疫：毒液球落点生成毒液区域 */
  _spawnPool(pr) {
    pr.pooled = true;
    const cfg = CONFIG.WEAPONS.plague;
    this.pools.push({
      x: pr.x, y: pr.y + 26, r: cfg.poolR,
      ticks: cfg.poolTicks, tickCd: cfg.poolTickDelay * 0.4,   // 落地后短暂延迟开始
      dmg: pr.dmg * cfg.poolDmgMul, t: 0,
    });
    FX.poof(pr.x, pr.y + 10, "#8fd44a", 8, 5);
    FX.ring(pr.x, pr.y + 26, cfg.poolR, "#8fd44a", 5, 0.4);
    SFX.venom();
  }

  /* 毒液区域：每跳对范围内所有敌人结算，跳数耗尽后消失 */
  _pools(dt) {
    for (const pool of this.pools) {
      pool.t += dt;
      pool.tickCd -= dt;
      if (pool.tickCd <= 0 && pool.ticks > 0) {
        pool.ticks--;
        pool.tickCd = CONFIG.WEAPONS.plague.poolTickDelay;
        for (const m of this.monsters) {
          if (m.dead) continue;
          if (Math.hypot(m.x - pool.x, m.y - pool.y) < pool.r + m.radius * 0.6) {
            this.hitMonster(m, pool.dmg, false, pool.x, pool.y, 0);
          }
        }
        if (Math.random() < 0.7) FX.poof(pool.x + (Math.random() - 0.5) * pool.r, pool.y + (Math.random() - 0.5) * pool.r * 0.5, "#a8e06a", 3, 4);
      }
      if (pool.ticks <= 0) pool.dead = true;
    }
    this.pools = this.pools.filter(p => !p.dead);
  }

  /* 引力：黑洞压缩完成 → 引爆（吸附数量越多伤害越高） */
  _gravityBlast(pr) {
    pr.dead = true;
    const cfg = CONFIG.WEAPONS.gravity;
    const inBlast = this.monsters.filter(m => !m.dead &&
      Math.hypot(m.x - pr.x, m.y - 26 - pr.y) < cfg.blastR + m.radius);
    const dmg = pr.dmg + cfg.dmgPerPull * inBlast.length;
    FX.ring(pr.x, pr.y, cfg.blastR, "#b06ff2", 9, 0.5);
    FX.ring(pr.x, pr.y, cfg.blastR * 0.55, "#e6d0ff", 6, 0.35);
    FX.poof(pr.x, pr.y, "#6a3fa8", 18, 9);
    FX.addShake(0.35);
    SFX.boom();
    SFX.warp();
    if (inBlast.length > 0) FX.text(pr.x, pr.y - 46, `×${inBlast.length} 引爆`, "#d9b3ff", 18);
    for (const m of inBlast) {
      this.hitMonster(m, dmg, false, pr.x, pr.y - 26, 130);
    }
  }

  /* ---------------- 经验宝石 ---------------- */
  _gems(dt) {
    const p = this.player;
    for (const g of this.gems) {
      g.update(dt, p);
      // 吸附拖尾：磁吸/真空飞行时留下一串淡光点
      if (g.magnet && !g.dead && Math.random() < dt * 30) {
        FX.particles.push({
          x: g.x, y: g.y - 6, vx: 0, vy: 0,
          life: 0.22, max: 0.3, size: 2.6,
          col: "#9fe8ff", grav: 0, add: true, shrink: true,
        });
      }
      if (g.dead) {
        this.pendingLevelups += p.gainXp(g.value * p.xpMult);
        this._pickupSfx();
        FX.spark(g.x, g.y - 8, "#8fe0ff", 4, 70);
      }
    }
  }

  /* 拾取音效节流：大批宝石同时吸收时避免声音叠加爆音 */
  _pickupSfx() {
    if (this.t - (this._lastPickSfx || -1) > 0.06) {
      SFX.pickup();
      this._lastPickSfx = this.t;
    }
  }

  /* ---------------- 渲染 ---------------- */
  render(ctx) {
    const t = this.t;
    ctx.drawImage(Art.bgCanvas, 0, 0, CONFIG.W, CONFIG.H);
    Ambient.drawBack(ctx, t);   // 云影 + 风摆草簇（实体之下）

    // 毒液区域（地面层）
    for (const pool of this.pools) Art.pool(ctx, pool, t);

    // 宝石
    for (const g of this.gems) Art.gem(ctx, g, t);

    // 实体按 y 排序（伪深度）
    const ents = this.monsters.slice();
    if (this.player) ents.push(this.player);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) {
      if (e === this.player) this._drawPlayer(ctx, t);
      else {
        // 出生：弹性放大破土而出（easeOutBack）
        const sp = e.spawnT !== undefined ? e.spawnT : 1;
        // 受击挤压 squash & stretch
        const sq = e.squash || 0;
        if (sp < 1 || sq > 0) {
          ctx.save();
          ctx.translate(e.x, e.y);
          if (sp < 1) {
            const bk = 1 + 2.7 * Math.pow(sp - 1, 3) + 1.7 * Math.pow(sp - 1, 2);
            ctx.scale(Math.max(0.05, bk), Math.max(0.05, bk));
            ctx.globalAlpha = Math.min(1, sp * 1.8);
          }
          if (sq > 0) {
            const s2 = sq * 0.16;
            ctx.scale(1 + s2, 1 - s2);
          }
          ctx.translate(-e.x, -e.y);
        }
        // 眩晕（破甲战锤）：整只怪物原地迷糊晃动
        if (e.stunT > 0) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(Math.sin(e.animT * 9) * 0.1);
          ctx.translate(-e.x, -e.y);
          Art[e.type](ctx, e, t);
          ctx.restore();
        } else {
          Art[e.type](ctx, e, t);
        }
        if (sp < 1 || sq > 0) ctx.restore();
        // 巨魔/恶魔受伤时显示血条
        if ((e.type === "ogre" || e.type === "demon") && e.hp < e.maxHp) {
          const w = e.type === "demon" ? 64 : 56, hx = e.x - w / 2;
          const hy = e.type === "demon" ? e.y - 108 : e.y - 96;
          ctx.fillStyle = "rgba(20,15,10,0.8)";
          ctx.fillRect(hx - 2, hy - 2, w + 4, 9);
          ctx.fillStyle = "#d92b1f";
          ctx.fillRect(hx, hy, w * Math.max(0, e.hp / e.maxHp), 5);
        }
      }
    }

    for (const pr of this.projectiles) pr.draw(ctx, t);
    Weapons.drawPrism(ctx, this);     // 光棱激光束（叠加发光）
    Ambient.drawFront(ctx, t);        // 炊烟 / 光尘 / 落叶 / 蝴蝶（实体之上）
    FX.draw(ctx);
  }

  _drawPlayer(ctx, t) {
    const p = this.player;
    if (p.dead) {
      const k = Math.min(1, this.deathTimer * 2.2);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(k * Math.PI / 2);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, this.deathTimer - 0.7) * 2);
      ctx.translate(-p.x, -p.y);
      Art.knight(ctx, p, t);
      ctx.restore();
      return;
    }
    // 受击挤压（squash & stretch，随 hurtFlash 恢复）
    const hf = p.hurtFlash || 0;
    if (hf > 0.02) {
      const k = (hf / 0.3) * 0.13;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1 + k, 1 - k);
      ctx.translate(-p.x, -p.y);
      Art.knight(ctx, p, t);
      ctx.restore();
    } else {
      Art.knight(ctx, p, t);
    }
  }
}
