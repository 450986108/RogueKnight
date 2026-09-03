/* ============================================================
 * 星寰骑士 STELATO Knight — DOM UI：HUD / 主菜单 / 升级选卡 / 过关 / 胜负 / 暂停
 * ============================================================ */
"use strict";

const UI = {
  game: null,
  weaponsDirty: true,
  _slots: [],           // {el, mask, w} 缓存的武器槽

  init(game) {
    this.game = game;
    const $ = id => document.getElementById(id);
    this.el = {
      hud: $("hud"), hpFill: $("hpFill"), hpGhost: $("hpGhost"), hpText: $("hpText"),
      xpFill: $("xpFill"), xpText: $("xpText"),
      killFill: $("killFill"), killText: $("killText"),
      levelLabel: $("levelLabel"), hudTr: $("hud-tr"),
      levelBanner: $("levelBanner"),
      menu: $("menu"), levelup: $("levelup"), cards: $("cards"),
      levelupSub: $("levelupSub"),
      transition: $("transition"), transTitle: $("transTitle"), transStats: $("transStats"),
      gameover: $("gameover"), overStats: $("overStats"),
      victory: $("victory"), vicStats: $("vicStats"),
      pause: $("pause"), muteState: $("muteState"),
      hurtFx: $("hurtFx"),
      menuKnight: $("menuKnight"),
      heroselect: $("heroselect"), heroGrid: $("heroGrid"), heroDetail: $("heroDetail"),
      shieldPip: $("shieldPip"), shieldIcon: $("shieldIcon"), shieldText: $("shieldText"),
      btnPause: $("btnPause"), btnMute: $("btnMute"),
    };
    // 已选骑士（持久化；异常环境降级为默认流浪骑士）
    this.selectedHero = CONFIG.HERO_DEFAULT;
    try {
      const saved = localStorage.getItem("rk_hero");
      if (saved && CONFIG.HEROES[saved]) this.selectedHero = saved;
    } catch (e) { /* file:// 或受限环境无 localStorage */ }
    // 开始入口：桌面端（键鼠）/ 移动端（触屏双摇杆），记住上次选择
    this.playMode = "desktop";
    try {
      if (localStorage.getItem("rk_mode") === "touch") this.playMode = "touch";
    } catch (e) { }
    this._markLastMode();
    $("btnStartDesk").onclick = () => this._startWith("desktop");
    $("btnStartTouch").onclick = () => this._startWith("touch");
    $("btnEmbark").onclick = () => { SFX.ensure(); game.startRun(this.selectedHero); };
    $("btnHeroBack").onclick = () => { SFX.ensure(); this.hide(this.el.heroselect); this.show(this.el.menu); };
    $("btnNext").onclick = () => { SFX.ensure(); game.nextLevel(); };
    $("btnRetry").onclick = () => { SFX.ensure(); game.startRun(); };
    $("btnAgain").onclick = () => { SFX.ensure(); game.startRun(); };
    $("btnResume").onclick = () => game.togglePause();
    $("btnRestart").onclick = () => { SFX.ensure(); game.startRun(); };
    $("btnRestartMenu").onclick = () => { SFX.ensure(); game.backToMenu(); };
    $("btnRetryMenu").onclick = () => { SFX.ensure(); game.backToMenu(); };
    $("btnPause").onclick = () => { SFX.ensure(); game.togglePause(); };   // 触屏 HUD 暂停按钮
    $("btnMute").onclick = () => game.toggleMute();
    // 圣盾指示图标（一次性绘制）
    Art.icon(this.el.shieldIcon.getContext("2d"), "shield", 22);
    // 面板 STELATO 纹章（胜利/暂停顶部，原图贴图压印羊皮纸；贴图异步就绪后重绘一次）
    const drawPanelEmblems = () => {
      for (const id of ["vicEmblem", "pauseEmblem"]) {
        const c = $(id);
        if (!c) continue;
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
        Art.stelato(ctx, c.width / 2, c.height / 2, c.width * 0.9,
          { maxH: c.height * 0.98, alpha: 0.95 });
      }
    };
    drawPanelEmblems();
    Art.stelatoOnReady(drawPanelEmblems);
  },

  show(el) { el.classList.remove("hidden"); },
  hide(el) { el.classList.add("hidden"); },

  /* ---------------- 操作方式（桌面端 / 移动端） ---------------- */
  /* 按选定操作方式进入角色选择；setPlayMode 定义于 main.js（切 body.touch、摇杆模式、画布边距） */
  _startWith(mode) {
    SFX.ensure();
    this.playMode = mode;
    try { localStorage.setItem("rk_mode", mode); } catch (e) { }
    this._markLastMode();
    if (window.setPlayMode) window.setPlayMode(mode);
    this.showHeroSelect();
  },

  /* 给上次使用的入口按钮加"上次"角标（样式见 css） */
  _markLastMode() {
    const d = document.getElementById("btnStartDesk");
    const t = document.getElementById("btnStartTouch");
    if (d) d.classList.toggle("last-used", this.playMode === "desktop");
    if (t) t.classList.toggle("last-used", this.playMode === "touch");
  },

  hideAllOverlays() {
    for (const k of ["menu", "heroselect", "levelup", "transition", "gameover", "victory", "pause"]) {
      this.hide(this.el[k]);
    }
  },

  /* ---------------- 角色选择 ---------------- */
  /* 打开选人界面（卡片与预览动画数据只构建一次，main.js 帧循环驱动） */
  showHeroSelect() {
    this.hide(this.el.menu);
    this.show(this.el.heroselect);
    if (!this._heroCards) this.buildHeroSelect();
    this._selectHero(this.selectedHero);
  },

  buildHeroSelect() {
    const grid = this.el.heroGrid;
    grid.innerHTML = "";
    this._heroCards = {};
    this.heroPreviews = [];                 // main.js 每帧驱动的小人预览
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const id of CONFIG.HERO_ORDER) {
      const H = CONFIG.HEROES[id];
      const div = document.createElement("div");
      div.className = "hero-card";
      const cv = document.createElement("canvas");
      cv.width = 96 * dpr; cv.height = 108 * dpr;
      const name = document.createElement("div");
      name.className = "hname"; name.textContent = H.name;
      const role = document.createElement("div");
      role.className = "hrole"; role.textContent = "「" + H.role + "」";
      const stats = document.createElement("div");
      stats.className = "hstats";
      stats.innerHTML = H.lore.join("<br>");   // 模糊人物设定，每行一短句（≤12 字）
      div.append(cv, name, role, stats);
      div.onclick = () => { this._selectHero(id); SFX.pick(); };
      grid.append(div);
      this._heroCards[id] = div;
      // 预览 mock：站桩小幅摆头 + 周期挥击（法杖英雄改为浮杖环游）
      const startList = H.startWeapons && H.startWeapons.length ? H.startWeapons : ["sword"];
      const melee = CONFIG.WEAPONS[startList[0]].type === "melee" ? startList[0] : null;
      this.heroPreviews.push({
        ctx: cv.getContext("2d"),
        w: cv.width, h: cv.height,
        melee,
        s: 0.66 * dpr,                                  // 96×108 逻辑画布内的骑士缩放
        tx: 48 * dpr, ty: 94 * dpr,                     // 骑士脚底锚点（逻辑画布中心偏下）
        mock: {
          x: 0, y: 0, hero: id, aim: 0.25, moving: false, walkT: 0,
          iframe: 0, hurtFlash: 0, dead: false,
          swing: null, thrust: null, pulse: null,
          weapons: startList.map(wid => ({ id: wid })),
        },
      });
    }
  },

  _selectHero(id) {
    this.selectedHero = id;
    try { localStorage.setItem("rk_hero", id); } catch (e) { }
    for (const k in this._heroCards) this._heroCards[k].classList.toggle("selected", k === id);
    const H = CONFIG.HEROES[id];
    this.el.heroDetail.textContent = `【${H.name}】${H.lore.join("，")}`;
  },

  /* ---------------- HUD ---------------- */
  banner(text) {
    const b = this.el.levelBanner;
    b.textContent = "✦ " + text + " ✦";   // 品牌四芒星缀边
    b.classList.remove("hidden");
    b.style.animation = "none";
    void b.offsetWidth;           // 重置动画
    b.style.animation = "";
  },

  hurtFlash() {
    const h = this.el.hurtFx;
    h.classList.add("on");
    requestAnimationFrame(() => requestAnimationFrame(() => h.classList.remove("on")));
  },

  rebuildWeaponSlots(player) {
    this.el.hudTr.innerHTML = "";
    this._slots = [];
    for (const w of player.weapons) {
      const slot = document.createElement("div");
      slot.className = "wslot";
      const c = document.createElement("canvas");
      c.width = 44; c.height = 44;
      Art.icon(c.getContext("2d"), w.id, 44);
      const lv = document.createElement("span");
      lv.className = "lv";
      lv.textContent = "Lv" + w.level;
      const mask = document.createElement("div");
      mask.className = "cdmask";
      slot.append(c, lv, mask);
      this.el.hudTr.append(slot);
      this._slots.push({ w, mask, lv });
    }
    this.weaponsDirty = false;
  },

  updateHUD(game) {
    const p = game.player;
    if (!p) return;
    if (this.weaponsDirty) this.rebuildWeaponSlots(p);

    // 血条：红色即时变化；暖白残影定格片刻后缓慢追上（伤害可视化）
    const hpPct = Math.max(0, p.hp / p.maxHp);
    if (this._ghostPct === undefined) this._ghostPct = hpPct;
    if (hpPct < this._ghostPct) this._ghostHold = 28;      // 受伤定格 ~0.47s
    else { this._ghostPct = hpPct; this._ghostHold = 0; }  // 回血立即贴合
    if (this._ghostHold > 0) this._ghostHold--;
    else this._ghostPct = Math.max(hpPct, this._ghostPct - 0.009);
    this.el.hpGhost.style.width = (this._ghostPct * 100) + "%";
    this.el.hpFill.style.width = (hpPct * 100) + "%";
    this.el.hpText.textContent = `${Math.ceil(Math.max(0, p.hp))}/${Math.round(p.maxHp)}`;
    // 低血量脉动警示
    this.el.hpFill.parentElement.classList.toggle("low", hpPct > 0 && hpPct < 0.3);

    const need = p.xpNeeded();
    this.el.xpFill.style.width = Math.min(100, p.xp / need * 100) + "%";
    this.el.xpText.textContent = `Lv.${p.level}  经验 ${Math.floor(p.xp)}/${need}`;
    // 升级瞬间 XP 条流光
    if (this._lastLevel === undefined) this._lastLevel = p.level;
    if (p.level > this._lastLevel) {
      this.el.xpFill.classList.remove("lvl");
      void this.el.xpFill.offsetWidth;   // 强制重排以重启动画
      this.el.xpFill.classList.add("lvl");
    }
    this._lastLevel = p.level;
    const quota = CONFIG.LEVELS.quota(game.level);
    this.el.killFill.style.width = Math.min(100, game.killsThisLevel / quota * 100) + "%";
    this.el.killText.textContent = `击杀 ${game.killsThisLevel}/${quota}`;
    this.el.levelLabel.textContent = `第 ${game.level} 关`;

    // 圣盾指示（拥有圣盾特性的骑士）：就绪金色 / 充能中灰化
    if (CONFIG.HEROES[p.hero] && CONFIG.HEROES[p.hero].shieldDelay > 0) {
      this.show(this.el.shieldPip);
      const ready = !!p.shield;
      this.el.shieldPip.classList.toggle("charging", !ready);
      this.el.shieldText.textContent = ready ? "圣盾就绪" : "圣盾充能中";
    } else {
      this.hide(this.el.shieldPip);
    }

    for (const s of this._slots) {
      const cdMax = Weapons.cdOf(s.w, p);
      const frac = Math.max(0, Math.min(1, s.w.cd / cdMax));
      s.mask.style.transform = `scaleY(${frac})`;
    }
  },

  /* ---------------- 升级选卡 ---------------- */
  /* 强化幅度递进：第 n 次获取同一强化时幅度 = base + per ×(n-1) */
  statMagnitude(u, p) {
    return u.base + u.per * (p.upgradeLevels[u.id] || 0);
  },

  /* 强化生效：百分比类以基础值为基数加算（如基础 100 血 +15% 再 +18% = 133，而非 115×1.18） */
  _applyStat(u, p) {
    const v = this.statMagnitude(u, p);
    switch (u.id) {
      case "hp": {
        const add = p.base.hp * v / 100;
        p.maxHp += add;
        p.hp = Math.min(p.maxHp, p.hp + add);
        break;
      }
      case "dmg": p.mult.dmg += v / 100; break;             // 攻击基数为 1
      case "as": p.mult.as += p.base.as * v / 100; break;
      case "spd": p.mult.spd += p.base.spd * v / 100; break;
      case "armor": p.armor += v; break;
      case "regen": p.regen += v; break;
      case "pickup": p.pickupR += p.base.pickup * v / 100; break;
      case "xp": p.xpMult += p.base.xp * v / 100; break;
      case "crit": p.crit += v / 100; break;
    }
    p.upgradeLevels[u.id] = (p.upgradeLevels[u.id] || 0) + 1;
  },

  /* 生成 4 张随机不重复卡（属性/武器槽/新武器/武器升级，带权重） */
  buildCards(game) {
    const p = game.player;
    const pool = [];
    for (const u of CONFIG.UPGRADES) {
      const times = p.upgradeLevels[u.id] || 0;
      if (times >= CONFIG.UPGRADE_MAX) continue;          // 满级强化不再进卡池
      const v = Math.round(this.statMagnitude(u, p) * 10) / 10;
      pool.push({
        key: "stat:" + u.id, w: u.weight,
        icon: u.id,
        name: times > 0 ? `${u.name} Lv.${times + 1}` : u.name,
        desc: u.fmt(v), tag: "强 化", cls: "",
        apply: () => this._applyStat(u, p),
      });
    }
    if (p.weapons.length >= p.slots && p.slots < CONFIG.PLAYER.slotsMax) {
      pool.push({
        key: "slot", w: CONFIG.SLOT_CARD.weight,
        icon: "slot", name: "武器插槽", desc: "武器槽 +1，可同时装备更多武器", tag: "扩 展", cls: "",
        apply: () => { p.slots++; this.weaponsDirty = true; },
      });
    }
    /* 新武器：空槽直接装备；槽满时仍进池，选卡后进入"替换旧武器"流程 */
    const slotsFull = p.weapons.length >= p.slots;
    const notOwned = CONFIG.WEAPON_ORDER.filter(id => !p.weapons.some(w => w.id === id));
    for (const id of notOwned) {
      const cfg = CONFIG.WEAPONS[id];
      pool.push({
        key: "new:" + id, w: CONFIG.WEAPON_CARD.weight / notOwned.length,
        icon: id, name: cfg.name,
        desc: slotsFull ? cfg.desc + "（槽位已满，选择后需替换一把现有武器）" : cfg.desc,
        tag: slotsFull ? "新武器·替换" : "新 武 器", cls: "weapon-card",
        newWeaponId: id, needReplace: slotsFull,
        apply: () => { p.weapons.push({ id, level: 1, cd: 0 }); this.weaponsDirty = true; },
      });
    }
    const upgradable = p.weapons.filter(w => w.level < CONFIG.WEAPON_LVL.max);
    for (const w of upgradable) {
      const wl = CONFIG.WEAPON_LVL;
      const dInc = wl.dmgBase + wl.dmgPer * (w.level - 1);   // 本次为该武器第 w.level 次强化
      const aInc = wl.asBase + wl.asPer * (w.level - 1);
      pool.push({
        key: "wup:" + w.id, w: CONFIG.WUPGRADE_WEIGHT / upgradable.length,
        icon: w.id, name: `${CONFIG.WEAPONS[w.id].name} 强化`,
        desc: `Lv.${w.level} → Lv.${w.level + 1}：伤害 +${dInc}%，攻速 +${aInc}%`,
        tag: "武器升级", cls: "weapon-card",
        apply: () => { w.level++; this.weaponsDirty = true; },
      });
    }

    // 加权不放回抽取 4 张
    const picked = [];
    const items = pool.slice();
    while (picked.length < 4 && items.length > 0) {
      let total = 0;
      for (const it of items) total += it.w;
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < items.length; idx++) {
        r -= items[idx].w;
        if (r <= 0) break;
      }
      idx = Math.min(idx, items.length - 1);
      picked.push(items[idx]);
      items.splice(idx, 1);
    }
    return picked;
  },

  showLevelUp(game, onAllDone) {
    this.show(this.el.levelup);
    this._cards = null;                       // 新一批选卡（清掉上一批缓存）
    this._levelUpChain(game, onAllDone);
  },

  _levelUpChain(game, onAllDone) {
    if (game.pendingLevelups <= 0) {
      this._cards = null;
      this.hide(this.el.levelup);
      onAllDone && onAllDone();
      return;
    }
    if (!this._cards) this._cards = this.buildCards(game);   // 缓存：替换流程返回时重渲同一批
    this._renderCards(game, onAllDone);
  },

  _renderCards(game, onAllDone) {
    const box = this.el.cards;
    box.innerHTML = "";
    box.classList.remove("picker");
    const g = CONFIG.LEVELUP_GROWTH;
    this.el.levelupSub.textContent =
      `骑士等级提升到 Lv.${game.player.level}！固有成长：生命上限 +${g.hpFlat}，攻击力 +${g.dmgFlat}%`;
    let chosen = false;
    for (const c of this._cards) {
      const div = document.createElement("div");
      div.className = "card " + c.cls;
      const cv = document.createElement("canvas");
      cv.width = 84; cv.height = 84;
      Art.icon(cv.getContext("2d"), c.icon, 84);
      const name = document.createElement("div");
      name.className = "cname"; name.textContent = c.name;
      const desc = document.createElement("div");
      desc.className = "cdesc"; desc.textContent = c.desc;
      const tag = document.createElement("div");
      tag.className = "ctag"; tag.textContent = c.tag;
      div.append(cv, name, desc, tag);
      div.onclick = () => {
        if (chosen) return;
        chosen = true;
        // 槽满新武器：先挑一把旧武器替换；其余直接生效
        if (c.needReplace) this._showReplacePicker(game, c, onAllDone);
        else this._finishPick(game, c, onAllDone);
      };
      box.append(div);
    }
  },

  /* 应用选卡效果并推进选卡链 */
  _finishPick(game, c, onAllDone) {
    c.apply();
    game.pendingLevelups--;
    SFX.pick();
    FX.text(game.player.x, game.player.y - 70, "升级！", "#ffe14a", 24);
    FX.ring(game.player.x, game.player.y, 70, "#ffe14a", 5, 0.45);
    this._cards = null;
    this._levelUpChain(game, onAllDone);
  },

  /* 武器槽已满时选新武器：挑一把旧武器替换（可返回重选） */
  _showReplacePicker(game, card, onAllDone) {
    const p = game.player;
    const box = this.el.cards;
    box.innerHTML = "";
    box.classList.add("picker");
    this.el.levelupSub.textContent = `武器槽已满 —— 「${card.name}」将替换哪把武器？`;
    let done = false;
    p.weapons.forEach((old, idx) => {
      const cfg = CONFIG.WEAPONS[old.id];
      const div = document.createElement("div");
      div.className = "card weapon-card";
      const cv = document.createElement("canvas");
      cv.width = 84; cv.height = 84;
      Art.icon(cv.getContext("2d"), old.id, 84);
      const name = document.createElement("div");
      name.className = "cname"; name.textContent = `${cfg.name} Lv.${old.level}`;
      const desc = document.createElement("div");
      desc.className = "cdesc"; desc.textContent = cfg.desc;
      const tag = document.createElement("div");
      tag.className = "ctag"; tag.textContent = "替 换";
      div.append(cv, name, desc, tag);
      div.onclick = () => {
        if (done) return;
        done = true;
        p.weapons.splice(idx, 1);
        p.weapons.push({ id: card.newWeaponId, level: 1, cd: 0 });
        this.weaponsDirty = true;
        game.pendingLevelups--;
        SFX.pick();
        FX.text(p.x, p.y - 70, "武器替换！", "#ffd873", 24);
        FX.ring(p.x, p.y, 70, "#ffd873", 5, 0.45);
        this._cards = null;
        this._levelUpChain(game, onAllDone);
      };
      box.append(div);
    });
    const back = document.createElement("button");
    back.className = "btn back-btn";
    back.textContent = "◀ 返回重选";
    back.onclick = () => { if (!done) this._renderCards(game, onAllDone); };
    box.append(back);
  },

  /* ---------------- 过关 / 结算 ---------------- */
  _fmt(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  },

  showTransition(game) {
    this.el.transTitle.textContent = `✦ 第 ${game.level} 关 完成！✦`;
    const bonus = game.level === CONFIG.LEVELS.bonusAfter
      ? `<p><b>通过第 ${CONFIG.LEVELS.bonusAfter} 关！</b>额外奖励：<b>升 1 级</b>（下一关开始时选卡）</p>` : "";
    this.el.transStats.innerHTML =
      `<p>本关击杀 <b>${game.killsThisLevel}</b> 只怪物</p>` +
      `<p>本关用时 <b>${this._fmt(game.levelTime)}</b>　总击杀 <b>${game.killsTotal}</b></p>` +
      `<p>骑士等级 <b>Lv.${game.player.level}</b>　生命已全部恢复 ❤</p>` + bonus;
    this.show(this.el.transition);
  },

  showVictory(game) {
    this.el.vicStats.innerHTML =
      `<p>总击杀 <b>${game.killsTotal}</b>　总用时 <b>${this._fmt(game.totalTime)}</b></p>` +
      `<p>最终等级 <b>Lv.${game.player.level}</b>　武器 ${game.player.weapons.map(w =>
        `${CONFIG.WEAPONS[w.id].name}Lv${w.level}`).join("、")}</p>`;
    this.show(this.el.victory);
    SFX.victory();
  },

  showGameOver(game) {
    this.el.overStats.innerHTML =
      `<p>倒在 <b>第 ${game.level} 关</b>（击杀 ${game.killsThisLevel}/${CONFIG.LEVELS.quota(game.level)}）</p>` +
      `<p>总击杀 <b>${game.killsTotal}</b>　总用时 <b>${this._fmt(game.totalTime)}</b></p>` +
      `<p>骑士等级 <b>Lv.${game.player.level}</b></p>`;
    this.show(this.el.gameover);
    SFX.defeat();
  },

  updatePause(muted) {
    this.el.muteState.textContent = muted ? "音效：已静音（按 M 切换）" : "音效：开启（按 M 切换）";
    if (this.el.btnMute) this.el.btnMute.textContent = muted ? "音效：已静音" : "音效：开启";
  },
};
