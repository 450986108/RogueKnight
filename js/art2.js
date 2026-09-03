Object.assign(Art, {

  /* ============================================================
   * 骑士（Q版 2 头身 外太空重甲 · 享界骑士，胸前 STELATO 徽章）
   * p: {x,y, aim, moving, walkT, swing:{id,t01,dir}, thrust:{id,t01},
   *     pulse:{id,t01}, iframe, hurtFlash, weapons:[], dead}
   * ============================================================ */
  knight(ctx, p, t) {
    const cosA = Math.cos(p.aim);
    const facing = cosA >= 0 ? 1 : -1;
    const bob = p.moving ? Math.abs(Math.sin(p.walkT * 11)) * 3.4 : Math.sin(t * 2.2) * 1.4;
    const idleSway = Math.sin(t * 2.2) * 0.05;

    // 皮肤解析：按英雄合并配色/形体覆盖（每帧合并 → editor.html 改全局 SP/KP 即时生效）
    const skin = HERO_SKINS[p.hero] || HERO_SKINS.astro;   // 缺省 = 享界骑士原味
    const sp = skin.sp ? Object.assign({}, SP, skin.sp) : SP;
    const kp = skin.kp ? Object.assign({}, KP, skin.kp) : KP;
    const deco = skin.deco || {};

    ctx.save();
    ctx.translate(p.x, p.y);

    // 无敌闪烁
    if (p.iframe > 0 && Math.floor(t * 18) % 2 === 0) ctx.globalAlpha = 0.35;

    shadowEll(ctx, 21, 7.5, 0.28);

    // ---- 背层装饰（围巾/披风，压在铠甲之下） ----
    if (deco.behind) deco.behind(ctx, p, t, bob, sp, kp, facing);

    // ---- 武器布局：近战手持（下方绘制），法杖悬浮（见 _floatingStaves） ----
    const hasShield = p.weapons.some(w => w.id === "shield");
    const primary = this._primaryWeapon(p);
    const twoHanded = ["axe", "lance", "hammer", "scythe"].includes(primary);   // 双手武器：左手也上柄
    // 双手持武器时，盾牌斜挂背上（仅露出轮廓）
    if (hasShield && twoHanded) {
      ctx.save();
      ctx.translate(-12, -20 + bob);
      ctx.rotate(0.55);
      ctx.scale(0.66, 0.66);
      this.weaponInHand(ctx, "shield");
      ctx.restore();
    }

    // ---- 铁靴（太空重靴） ----
    const stepL = p.moving ? -Math.sin(p.walkT * 11) * 5 : 0;
    const stepR = p.moving ? Math.sin(p.walkT * 11) * 5 : 0;
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    const boot = (bx, dy) => {
      ctx.save();
      ctx.translate(bx, 0);
      ctx.scale(kp.bootScale, kp.bootScale);   // 围绕靴底中心缩放
      ctx.fillStyle = sp.chest;
      rr(ctx, -7, -10 - dy, 15, 11, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sp.dark;
      rr(ctx, -7, -4 - dy, 15, 5, 2.5); ctx.fill();
      // 踝部指示灯
      ctx.fillStyle = sp.eye;
      ell(ctx, 0, -7.5 - dy, 1.5, 1.5); ctx.fill();
      ctx.restore();
    };
    boot(-10, Math.max(0, stepL));
    boot(10, Math.max(0, stepR));

    // ---- 躯干铠甲（太空胸甲） ----
    ctx.save();
    ctx.translate(0, bob);
    ctx.translate(0, -9); ctx.scale(kp.bodyW, kp.bodyH); ctx.translate(0, 9);  // 躯干横纵缩放（锚点腰底）
    const tg = ctx.createLinearGradient(-14, -42, 14, -6);
    tg.addColorStop(0, sp.chestLt); tg.addColorStop(0.55, sp.chest); tg.addColorStop(1, sp.chestDk);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(-13, -40); ctx.quadraticCurveTo(-16, -20, -12, -9);
    ctx.quadraticCurveTo(0, -3, 12, -9);
    ctx.quadraticCurveTo(16, -20, 13, -40);
    ctx.quadraticCurveTo(0, -46, -13, -40);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 胸甲中线（止于徽章上方）
    ctx.strokeStyle = "rgba(20,26,38,0.45)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -43); ctx.lineTo(0, -36.5); ctx.stroke();
    // 胸侧橙色通风格
    ctx.fillStyle = sp.accent;
    rr(ctx, -12.4, -27, 2.4, 4.4, 1); ctx.fill();
    rr(ctx, 10, -27, 2.4, 4.4, 1); ctx.fill();
    // ---- 徽章（胸口正中；皮肤可用 kp.badge=false 隐藏） ----
    if (kp.badge !== false) {
      const bdg = ctx.createLinearGradient(0, -36, 0, -36 + kp.badgeH);
      bdg.addColorStop(0, sp.badgeA); bdg.addColorStop(1, sp.badgeB);
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = bdg;
      rr(ctx, -kp.badgeW / 2, -36, kp.badgeW, kp.badgeH, 3.5); ctx.fill(); ctx.stroke();
      // 四向星芒纹样
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.moveTo(0, -35.3);
      ctx.lineTo(1.1, -33.4); ctx.lineTo(3.3, -32.5);
      ctx.lineTo(1.1, -31.6); ctx.lineTo(0, -29.6);
      ctx.lineTo(-1.1, -31.6); ctx.lineTo(-3.3, -32.5);
      ctx.lineTo(-1.1, -33.4);
      ctx.closePath(); ctx.fill();
      // 徽章字样（字号自适应：宽 3px 起测，超出徽章内宽则按比例缩小）
      ctx.save();
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 3px Arial, sans-serif";
      const maxW = kp.badgeW - 4;
      const tw = ctx.measureText(kp.badgeText).width;
      if (tw > maxW) ctx.font = "bold " + Math.max(1.2, 3 * maxW / tw).toFixed(2) + "px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(kp.badgeText, 0, -36 + kp.badgeH - 1.7);
      ctx.restore();
    }
    // 深色甲带腰封
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = sp.dark;
    rr(ctx, -12, -13, 24, 7, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sp.accent;
    ell(ctx, 0, -9.5, 2.6, 2.6); ctx.fill();
    ctx.restore();

    // ---- 躯干层装饰（罩袍下摆等，压在腰封之上、手臂之下） ----
    if (deco.body) deco.body(ctx, p, t, bob, sp, kp, facing);

    // ---- 空手侧手臂（自然下垂：无盾且非双手持的左臂 / 无主武器的右臂） ----
    const armSway = p.moving ? Math.sin(p.walkT * 11) * 2.2 : Math.sin(t * 2.2) * 0.9;
    const restArm = (dir) => {          // dir: -1 左 / +1 右；手垂在体侧，走路时轻微外摆
      const hx = dir * (kp.shoulderX + 3) + dir * armSway;
      const hy = -24 + bob * 0.7;
      this._armorArm(ctx, dir * kp.shoulderX, -36 + bob, hx, hy, sp);
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = sp.glove;
      ell(ctx, hx, hy, kp.gloveR, kp.gloveR); ctx.fill(); ctx.stroke();
    };
    if (!hasShield && !twoHanded) restArm(-1);
    if (!primary) restArm(1);

    // ---- 肩甲（双层圆弧 + 铆钉） ----
    const pauldron = (sx) => {
      ctx.save();
      ctx.translate(0, bob);
      ctx.translate(sx, -37); ctx.scale(kp.pauldronScale, kp.pauldronScale); ctx.translate(-sx, 37);
      ctx.fillStyle = sp.pauldron;
      ell(ctx, sx, -37, 10, 8.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(200,210,220,0.3)";
      ell(ctx, sx, -39.5, 6.5, 5); ctx.fill();
      ctx.fillStyle = sp.hi;
      ell(ctx, sx - Math.sign(sx) * 5.5, -34.8, 1.3, 1.3); ctx.fill();
      ell(ctx, sx + Math.sign(sx) * 2, -41.5, 1.3, 1.3); ctx.fill();
      ctx.restore();
    };
    pauldron(-kp.shoulderX); pauldron(kp.shoulderX);

    // ---- 头盔（大头盔：后掠鳍角 + 一体黑面罩 + 发光眼） ----
    ctx.save();
    ctx.translate(cosA * 2, bob);
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    const hy = kp.headY;
    // 后掠双鳍角（先画，在盔体后面，随面向后掠；围绕盔心缩放；皮肤可置 finScale=0 隐藏）
    const fin = (dir) => {
      if (kp.finScale <= 0.05) return;
      ctx.save();
      ctx.translate(0, hy); ctx.scale(kp.finScale, kp.finScale); ctx.translate(0, -hy);
      ctx.fillStyle = sp.dark;
      ctx.beginPath();
      ctx.moveTo(dir * 6, hy - 10);
      ctx.quadraticCurveTo(dir * 14, hy - 24, dir * 10 - facing * 14, hy - 19);
      ctx.quadraticCurveTo(dir * 6 - facing * 9, hy - 13, dir * 4, hy - 8);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    };
    fin(-1); fin(1);
    // 盔体（球盔）
    const hg = ctx.createRadialGradient(-5, hy - 6, 4, 0, hy, kp.helmW);
    hg.addColorStop(0, sp.helmLt); hg.addColorStop(0.55, sp.helm); hg.addColorStop(1, sp.dark);
    ctx.fillStyle = hg;
    ell(ctx, 0, hy, kp.helmW, kp.helmH); ctx.fill(); ctx.stroke();
    // 盔顶中线脊 + 横向刻线
    ctx.strokeStyle = "rgba(16,22,34,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, hy - 16.2); ctx.lineTo(0, hy - 8.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3.2, hy - 13.5); ctx.lineTo(3.2, hy - 13.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.6, hy - 11); ctx.lineTo(2.6, hy - 11); ctx.stroke();
    // 耳罩（同心圆 + 侧凸，随盔宽联动）
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    const ear = (dir) => {
      const ex = dir * (kp.helmW - 1.5);
      ctx.fillStyle = sp.chest;
      ell(ctx, ex, hy + 0.5, kp.earR, kp.earR); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(16,22,34,0.5)"; ctx.lineWidth = 1.6;
      ell(ctx, ex, hy + 0.5, kp.earR * 0.52, kp.earR * 0.52); ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = sp.dark;
      rr(ctx, dir === 1 ? ex + 3.6 : ex - 6.4, hy - 0.6, 2.8, 2.2, 1); ctx.fill(); ctx.stroke();
    };
    ear(-1); ear(1);
    // 一体式宽面罩（随瞄准微移）
    const vx = cosA * 3;
    ctx.fillStyle = sp.visor;
    rr(ctx, -kp.visorW / 2 + vx, hy - kp.visorH / 2, kp.visorW, kp.visorH, kp.visorH / 2); ctx.fill(); ctx.stroke();
    // 面罩顶缘反光
    ctx.strokeStyle = "rgba(200,230,255,0.26)"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-kp.visorW * 0.35 + vx, hy - kp.visorH * 0.17);
    ctx.quadraticCurveTo(vx, hy - kp.visorH * 0.32, kp.visorW * 0.35 + vx, hy - kp.visorH * 0.17);
    ctx.stroke();
    // 发光怒目（内低外高；围绕面罩中心按 eyeSize 缩放）
    ctx.save();
    ctx.translate(vx, hy + 0.6); ctx.scale(kp.eyeSize, kp.eyeSize); ctx.translate(-vx, -(hy + 0.6));
    ctx.shadowColor = sp.eye; ctx.shadowBlur = kp.eyeGlow;
    ctx.fillStyle = sp.eye;
    const eye = (dir) => {
      ctx.beginPath();
      ctx.moveTo(vx + dir * 2.4, hy + 1.1);
      ctx.lineTo(vx + dir * 7.4, hy - 1.5);
      ctx.lineTo(vx + dir * 7.4, hy + 0.6);
      ctx.lineTo(vx + dir * 2.4, hy + 3);
      ctx.closePath(); ctx.fill();
    };
    eye(-1); eye(1);
    ctx.shadowBlur = 3;
    ctx.fillStyle = "#ffffff";
    ell(ctx, vx - 5.6, hy + 0.1, 0.9, 0.9); ctx.fill();
    ell(ctx, vx + 5.6, hy + 0.1, 0.9, 0.9); ctx.fill();
    ctx.restore();
    ctx.restore();

    // ---- 头部装饰（盔缨/光环/角/法帽，随头部平移与浮动） ----
    if (deco.head) {
      ctx.save();
      ctx.translate(cosA * 2, bob);
      deco.head(ctx, p, t, bob, sp, kp, facing);
      ctx.restore();
    }

    // ---- 左臂：盾牌（拥有且非双手持时永远举向瞄准方向，臂袖随伸） ----
    if (hasShield && !twoHanded) {
      const angS = p.aim + idleSway;
      const shx = -kp.shoulderX, shy = -36 + bob;
      const hx = shx + Math.cos(angS) * kp.armLen;
      const hy = shy + Math.sin(angS) * kp.armLen;
      this._armorArm(ctx, shx, shy, hx, hy, sp);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(angS);
      this.weaponInHand(ctx, "shield");
      // 持盾手（黑色机械手套，握在盾后缘可见）
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = sp.glove;
      ell(ctx, 2, 0, kp.gloveR, kp.gloveR); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // ---- 右臂：主武器（臂袖从肩甲伸向握柄，挥砍/突刺随动） ----
    if (primary) {
      let ang = p.aim + idleSway;
      let ext = 0;
      const cfg = CONFIG.WEAPONS[primary];
      if (p.swing && p.swing.t01 < 1 && p.swing.id === primary) {
        // 挥砍：从弧一端扫到另一端
        const arcHalf = (cfg.arc * Math.PI / 180) / 2;
        const e = 1 - Math.pow(1 - p.swing.t01, 3);
        ang = p.aim + p.swing.dir * (-arcHalf + e * arcHalf * 2);
      } else if (p.thrust && p.thrust.t01 < 1 && p.thrust.id === primary) {
        // 突刺：前伸后收
        const e = p.thrust.t01;
        ext = Math.sin(Math.min(e * 1.6, 1) * Math.PI) * 26;
      }
      const shx = kp.shoulderX, shy = -36 + bob;
      const hx = shx + Math.cos(ang) * (kp.armLen + ext);
      const hy = shy + Math.sin(ang) * (kp.armLen + ext);
      // 双手武器：左臂垫在右臂下，后手越过中线握在柄尾缠皮段
      if (twoHanded) {
        const rg = -32;                 // 后手握点：横向持握时落在身体中线左侧
        this._armorArm(ctx, -kp.shoulderX, shy, hx + Math.cos(ang) * rg, hy + Math.sin(ang) * rg, sp);
      }
      this._armorArm(ctx, shx, shy, hx, hy, sp);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      this.weaponInHand(ctx, primary);
      // 手（黑色机械手套，覆在握柄上呈握持状）
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = sp.glove;
      ell(ctx, 2, 0, kp.gloveR, kp.gloveR); ctx.fill(); ctx.stroke();
      // 双手武器的后手（握在柄尾缠皮段，覆于柄上）
      if (twoHanded) {
        ell(ctx, -32, 0, kp.gloveR, kp.gloveR); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }

    // ---- 悬浮法杖（近战绘完后叠加，环绕身体漂浮） ----
    this._floatingStaves(ctx, p, t, bob);

    // ---- 圣盾气泡（圣辉骑士，覆盖全身的淡金护罩） ----
    if (p.shield) this._shieldBubble(ctx, t);

    // ---- 受击红闪 ----
    if (p.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,60,40,${Math.min(p.hurtFlash * 3.4, 0.55)})`;
      ell(ctx, 0, -36 + bob, 26, 32); ctx.fill();
    }
    ctx.restore();
  },

  /* 装甲臂袖：肩锚点(sx,sy) → 手(hx,hy)，圆角胶囊 + 肘部关节环 */
  _armorArm(ctx, sx, sy, hx, hy, sp) {
    sp = sp || SP;
    const ang = Math.atan2(hy - sy, hx - sx);
    const len = Math.hypot(hx - sx, hy - sy);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    const g = ctx.createLinearGradient(0, -3.5, 0, 3.5);
    g.addColorStop(0, sp.chestLt); g.addColorStop(1, sp.chestDk);
    ctx.fillStyle = g;
    rr(ctx, -3, -3.5, len + 4, 7, 3.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sp.dark;
    rr(ctx, len * 0.5, -2.8, 2.4, 5.6, 1); ctx.fill();
    ctx.restore();
  },

  /* 圣盾气泡：脉动的淡金护罩罩住全身 + 边缘高光 + 游动光点 */
  _shieldBubble(ctx, t) {
    const pul = 1 + Math.sin(t * 4) * 0.03;
    ctx.save();
    const g = ctx.createRadialGradient(0, -28, 8, 0, -26, 46 * pul);
    g.addColorStop(0, "rgba(255,240,190,0.04)");
    g.addColorStop(0.7, "rgba(255,232,160,0.10)");
    g.addColorStop(1, "rgba(255,225,140,0.22)");
    ctx.fillStyle = g;
    ell(ctx, 0, -26, 40 * pul, 48 * pul); ctx.fill();
    ctx.strokeStyle = "rgba(255,235,170,0.85)"; ctx.lineWidth = 2.5;
    ctx.shadowColor = "#ffe9a0"; ctx.shadowBlur = 10;
    ctx.stroke();
    // 罩面游动光点（两颗，绕罩缓慢巡游）
    ctx.shadowBlur = 6;
    ctx.fillStyle = "rgba(255,250,220,0.9)";
    ell(ctx, Math.cos(t * 2.6) * 26, -26 + Math.sin(t * 2.6) * 33, 2, 2); ctx.fill();
    ell(ctx, Math.cos(t * 2.6 + Math.PI) * 26, -26 + Math.sin(t * 2.6 + Math.PI) * 33, 1.6, 1.6); ctx.fill();
    ctx.restore();
  },

  /* 主手显示的武器：只持近战（法杖悬浮在体外，不占手） */
  _primaryWeapon(p) {
    let id = null;
    if (p.swing && p.swing.t01 < 1 && this._isMelee(p.swing.id)) id = p.swing.id;
    else if (p.thrust && p.thrust.t01 < 1 && this._isMelee(p.thrust.id)) id = p.thrust.id;
    if (id && id !== "shield") return id;
    const first = p.weapons.find(w => w.id !== "shield" && this._isMelee(w.id));
    return first ? first.id : null;
  },

  _isMelee(id) { const c = CONFIG.WEAPONS[id]; return !!c && c.type === "melee"; },

  /* 悬浮法杖：环绕身体漂浮，锁定目标时朝向目标并按开火节奏后坐；
   * 无目标时绕体缓慢环游。朝向/位置做了插值平滑，索敌切换不瞬移。 */
  _floatingStaves(ctx, p, t, bob) {
    const list = p.weapons.filter(w => CONFIG.WEAPONS[w.id] && CONFIG.WEAPONS[w.id].type !== "melee");
    const n = list.length;
    if (!n) return;
    const R = 40 + Math.min(14, (n - 1) * 3);        // 法杖越多，环半径越大
    for (let i = 0; i < n; i++) {
      const w = list[i];
      const hasT = w.hasTarget && w.aimAng !== undefined;
      let dx, dy, ang;
      if (hasT) {
        ang = w.aimAng;
        const spread = (i - (n - 1) / 2) * 0.42;     // 多杖沿目标方向扇形错开
        dx = Math.cos(ang + spread) * R;
        dy = Math.sin(ang + spread) * R * 0.62 - 32;
      } else {
        ang = (i / n) * Math.PI * 2 + t * 0.55;      // 无目标：绕体慢游
        dx = Math.cos(ang) * R;
        dy = Math.sin(ang) * R * 0.62 - 32;
      }
      dy += Math.sin(t * 2.6 + i * 1.9) * 2.6;       // 各自的悬浮起伏

      // 开火后坐：刚出手（冷却比例高）时向后缩
      let recoil = 0;
      if (hasT) {
        const cdMax = Weapons.cdOf(w, p);
        const f = cdMax > 0 ? Math.max(0, w.cd) / cdMax : 0;
        recoil = f * f * 7;
      }

      // 渲染状态平滑
      if (w._fx === undefined) { w._fx = dx; w._fy = dy; w._fa = ang; }
      w._fx += (dx - w._fx) * 0.22;
      w._fy += (dy - w._fy) * 0.22;
      let da = ang - w._fa;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      w._fa += da * 0.3;

      ctx.save();
      ctx.translate(w._fx - Math.cos(w._fa) * recoil, w._fy - Math.sin(w._fa) * recoil + bob * 0.4);
      // 悬浮辉环（脚下小椭圆，魔法悬浮感）
      ctx.strokeStyle = "rgba(140,200,255,0.30)";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 10, 11, 3.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(w._fa);
      ctx.scale(0.66, 0.66);
      this.weaponInHand(ctx, w.id);
      // 出手瞬间辉光
      if (recoil > 3.5) {
        ctx.fillStyle = "rgba(190,230,255,0.5)";
        ell(ctx, 16, 0, 5, 5); ctx.fill();
      }
      ctx.restore();
    }
  },

  /* ============================================================
   * 怪物
   * ============================================================ */
  goblin(ctx, m, t) {
    ctx.save();
    ctx.translate(m.x, m.y);
    const hop = Math.abs(Math.sin(m.animT * 9)) * 3.2;
    shadowEll(ctx, 14, 5, 0.24);

    // 双脚
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#3f7030";
    ell(ctx, -7, -3 - Math.max(0, -Math.sin(m.animT * 9)) * 3, 5.5, 4); ctx.fill(); ctx.stroke();
    ell(ctx, 7, -3 - Math.max(0, Math.sin(m.animT * 9)) * 3, 5.5, 4); ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.translate(0, -hop);

    // 身体
    ctx.fillStyle = "#5da03f";
    ctx.beginPath();
    ctx.moveTo(-11, -20); ctx.quadraticCurveTo(-14, -6, 0, -4);
    ctx.quadraticCurveTo(14, -6, 11, -20);
    ctx.quadraticCurveTo(0, -26, -11, -20);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 肚皮
    ctx.fillStyle = "#9ccf70";
    ell(ctx, 0, -10, 7, 6); ctx.fill();

    // 左手木棒（挥舞）
    ctx.save();
    ctx.translate(-10, -18);
    ctx.rotate(-0.7 + Math.sin(m.animT * 9) * 0.35);
    ctx.fillStyle = "#8a5f36";
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.lineTo(-5, -16); ctx.lineTo(3, -19); ctx.lineTo(4, -2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6d4826";
    ell(ctx, -1, -17, 5, 4); ctx.fill();
    ctx.restore();

    // 头（大）
    const hy = -30;
    ctx.fillStyle = "#68ad47";
    ell(ctx, 0, hy, 13, 12); ctx.fill(); ctx.stroke();
    // 尖耳朵
    ctx.fillStyle = "#68ad47";
    ctx.beginPath(); ctx.moveTo(-11, hy - 4); ctx.lineTo(-24, hy - 12); ctx.lineTo(-10, hy + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, hy - 4); ctx.lineTo(24, hy - 12); ctx.lineTo(10, hy + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 眼睛（愤怒）
    ctx.fillStyle = "#fff";
    ell(ctx, -4.5, hy - 1, 3.6, 4); ctx.fill(); ctx.stroke();
    ell(ctx, 4.5, hy - 1, 3.6, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1d1d1d";
    ell(ctx, -3.6, hy - 0.4, 1.7, 2); ctx.fill();
    ell(ctx, 5.4, hy - 0.4, 1.7, 2); ctx.fill();
    // 怒眉
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-8, hy - 6); ctx.lineTo(-2, hy - 3.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, hy - 6); ctx.lineTo(2, hy - 3.4); ctx.stroke();
    // 咧嘴獠牙
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#3c6e2c";
    ctx.beginPath(); ctx.ellipse(0, hy + 6.5, 6, 3.6, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-4, hy + 6.4); ctx.lineTo(-2.4, hy + 9.6); ctx.lineTo(-1, hy + 6.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, hy + 6.4); ctx.lineTo(2.4, hy + 9.6); ctx.lineTo(4, hy + 6.4); ctx.closePath(); ctx.fill();
    ctx.restore();
    this._flash(ctx, m, 0, -22, 20);
    ctx.restore();
  },

  bat(ctx, m, t) {
    ctx.save();
    ctx.translate(m.x, m.y);
    const hover = Math.sin(m.animT * 6) * 4;
    shadowEll(ctx, 10, 3.6, 0.16);
    const flap = Math.sin(m.animT * 15);

    ctx.save();
    ctx.translate(0, -30 + hover);

    // 翅膀
    const wing = (dir) => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.rotate(flap * 0.55 * dir * -1 + 0.15);
      ctx.fillStyle = "#6b47a8";
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.beginPath();
      ctx.moveTo(4, -4);
      ctx.quadraticCurveTo(20, -22, 34, -16);
      ctx.quadraticCurveTo(26, -8, 28, -2);
      ctx.quadraticCurveTo(20, -4, 16, 3);
      ctx.quadraticCurveTo(10, 0, 4, 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 翼骨
      ctx.strokeStyle = "rgba(40,20,70,0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, -2); ctx.quadraticCurveTo(18, -12, 30, -14); ctx.stroke();
      ctx.restore();
    };
    wing(-1); wing(1);

    // 身体
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#8a5fc9";
    ell(ctx, 0, 0, 10, 11.5); ctx.fill(); ctx.stroke();
    // 胸毛
    ctx.fillStyle = "#c9b0ea";
    ell(ctx, 0, 4, 5.5, 5); ctx.fill();
    // 耳朵
    ctx.fillStyle = "#8a5fc9";
    ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(-10, -19); ctx.lineTo(-1.6, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -8); ctx.lineTo(10, -19); ctx.lineTo(1.6, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 红眼
    ctx.fillStyle = "#ff4a3a";
    ell(ctx, -3.8, -3, 2.6, 2.8); ctx.fill();
    ell(ctx, 3.8, -3, 2.6, 2.8); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ell(ctx, -4.4, -3.8, 0.9, 0.9); ctx.fill();
    ell(ctx, 3.2, -3.8, 0.9, 0.9); ctx.fill();
    // 獠牙
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-2.6, 6.4); ctx.lineTo(-1.4, 9.4); ctx.lineTo(-0.2, 6.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.2, 6.4); ctx.lineTo(1.4, 9.4); ctx.lineTo(2.6, 6.4); ctx.closePath(); ctx.fill();
    ctx.restore();
    this._flash(ctx, m, 0, -30, 14);
    ctx.restore();
  },

  ogre(ctx, m, t) {
    ctx.save();
    ctx.translate(m.x, m.y);
    const step = Math.sin(m.animT * 4.2);
    shadowEll(ctx, 30, 10, 0.26);

    // 大脚
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#557d31";
    ell(ctx, -14, -4 - Math.max(0, -step) * 4, 10, 6); ctx.fill(); ctx.stroke();
    ell(ctx, 14, -4 - Math.max(0, step) * 4, 10, 6); ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.rotate(step * 0.045);

    // 身体（巨大椭圆）
    const bg2 = ctx.createLinearGradient(0, -66, 0, 0);
    bg2.addColorStop(0, "#7dab4c"); bg2.addColorStop(1, "#5d8a34");
    ctx.fillStyle = bg2;
    ell(ctx, 0, -34, 30, 33); ctx.fill(); ctx.stroke();
    // 肚皮
    ctx.fillStyle = "#b3cf7f";
    ell(ctx, 0, -24, 17, 19); ctx.fill();
    ctx.fillStyle = "#8db45e";
    ell(ctx, 0, -16, 2.6, 2.6); ctx.fill();
    // 兽皮腰布
    ctx.fillStyle = "#8a5f36";
    ctx.beginPath();
    ctx.moveTo(-27, -14); ctx.quadraticCurveTo(0, -4, 27, -14);
    ctx.quadraticCurveTo(20, -2, 6, -3); ctx.quadraticCurveTo(-8, -1, -27, -14);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // 双臂（摆动）
    const arm = (dir) => {
      ctx.save();
      ctx.translate(dir * 26, -44);
      ctx.rotate(dir * (0.5 + step * 0.25));
      ctx.fillStyle = "#6c9a3e";
      rr(ctx, -6, -6, 14, 32, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#5d8a34";
      ell(ctx, 1, 28, 9, 8.5); ctx.fill(); ctx.stroke();
      ctx.restore();
    };
    arm(-1); arm(1);

    // 头（小，双牙突出）
    const hy = -66;
    ctx.fillStyle = "#75a646";
    ell(ctx, 0, hy, 14, 12.5); ctx.fill(); ctx.stroke();
    // 下巴咬合
    ctx.fillStyle = "#9ccf70";
    ell(ctx, 0, hy + 6, 9.5, 6); ctx.fill(); ctx.stroke();
    // 獠牙
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-6.4, hy + 8.5); ctx.lineTo(-4.4, hy + 1.5); ctx.lineTo(-2.6, hy + 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6.4, hy + 8.5); ctx.lineTo(4.4, hy + 1.5); ctx.lineTo(2.6, hy + 8); ctx.closePath(); ctx.fill();
    // 小怒眼
    ctx.fillStyle = "#ffde4a";
    ell(ctx, -5, hy - 2, 3.4, 3.6); ctx.fill(); ctx.stroke();
    ell(ctx, 5, hy - 2, 3.4, 3.6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1d1d1d";
    ell(ctx, -4.4, hy - 1.4, 1.6, 1.9); ctx.fill();
    ell(ctx, 5.6, hy - 1.4, 1.6, 1.9); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-9, hy - 6.5); ctx.lineTo(-2.6, hy - 4.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, hy - 6.5); ctx.lineTo(2.6, hy - 4.4); ctx.stroke();
    // 耳朵
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#75a646";
    ell(ctx, -14.5, hy - 1, 4.4, 3.4); ctx.fill(); ctx.stroke();
    ell(ctx, 14.5, hy - 1, 4.4, 3.4); ctx.fill(); ctx.stroke();
    // 疤
    ctx.strokeStyle = "rgba(50,80,25,0.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, hy - 9); ctx.lineTo(-3, hy - 11); ctx.stroke();

    ctx.restore();
    this._flash(ctx, m, 0, -38, 36);
    ctx.restore();
  },

  demon(ctx, m, t) {
    ctx.save();
    ctx.translate(m.x, m.y);
    const step = Math.sin(m.animT * 3.4);
    shadowEll(ctx, 32, 11, 0.26);

    // 利爪脚
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#6e211a";
    ell(ctx, -15, -4 - Math.max(0, -step) * 4, 10.5, 6); ctx.fill(); ctx.stroke();
    ell(ctx, 15, -4 - Math.max(0, step) * 4, 10.5, 6); ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.rotate(step * 0.045);

    // 背后蝠翼（慢速扇动）
    const wing = (dir) => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.rotate(-0.45 + Math.sin(m.animT * 5) * 0.18);
      ctx.fillStyle = "#8f2c22";
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.beginPath();
      ctx.moveTo(10, -50);
      ctx.quadraticCurveTo(36, -80, 54, -66);
      ctx.quadraticCurveTo(44, -56, 46, -44);
      ctx.quadraticCurveTo(34, -48, 30, -38);
      ctx.quadraticCurveTo(21, -44, 10, -38);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 翼骨
      ctx.strokeStyle = "rgba(60,12,8,0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, -48); ctx.quadraticCurveTo(28, -62, 48, -64); ctx.stroke();
      ctx.restore();
    };
    wing(-1); wing(1);

    // 身体（巨大椭圆）
    const bg3 = ctx.createLinearGradient(0, -72, 0, 0);
    bg3.addColorStop(0, "#c14a3a"); bg3.addColorStop(1, "#8f2c22");
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = bg3;
    ell(ctx, 0, -37, 31, 34); ctx.fill(); ctx.stroke();
    // 胸腹亮面 + 肋纹
    ctx.fillStyle = "#d97a5f";
    ell(ctx, 0, -27, 17, 19); ctx.fill();
    ctx.strokeStyle = "rgba(60,15,10,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, -35); ctx.lineTo(-5, -19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -35); ctx.lineTo(5, -19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -37); ctx.lineTo(0, -17); ctx.stroke();

    // 双臂（摆动 + 利爪）
    const arm = (dir) => {
      ctx.save();
      ctx.translate(dir * 27, -48);
      ctx.rotate(dir * (0.5 + step * 0.25));
      ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
      ctx.fillStyle = "#a83a30";
      rr(ctx, -6, -6, 14, 32, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#6e211a";
      ell(ctx, 1, 28, 9, 8.5); ctx.fill(); ctx.stroke();
      // 爪尖
      ctx.fillStyle = "#e8d9c2";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(1 + i * 5 - 2, 33);
        ctx.lineTo(1 + i * 5, 40);
        ctx.lineTo(1 + i * 5 + 2, 33);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    };
    arm(-1); arm(1);

    // 头（双弯角）
    const hy = -70;
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#c14a3a";
    ell(ctx, 0, hy, 15, 13); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3a2a24";
    ctx.beginPath(); ctx.moveTo(-9, hy - 6); ctx.quadraticCurveTo(-21, hy - 22, -12, hy - 27); ctx.quadraticCurveTo(-15, hy - 12, -6, hy - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, hy - 6); ctx.quadraticCurveTo(21, hy - 22, 12, hy - 27); ctx.quadraticCurveTo(15, hy - 12, 6, hy - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 怒目（橙黄）
    ctx.fillStyle = "#ffb84a";
    ell(ctx, -5.2, hy - 1, 3.6, 3.8); ctx.fill(); ctx.stroke();
    ell(ctx, 5.2, hy - 1, 3.6, 3.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8a1e12";
    ell(ctx, -4.6, hy - 0.4, 1.7, 2); ctx.fill();
    ell(ctx, 5.8, hy - 0.4, 1.7, 2); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-9.5, hy - 7); ctx.lineTo(-2.8, hy - 4.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9.5, hy - 7); ctx.lineTo(2.8, hy - 4.6); ctx.stroke();
    // 咧嘴獠牙
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
    ctx.fillStyle = "#5c1810";
    ctx.beginPath(); ctx.ellipse(0, hy + 7, 7, 4, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-5, hy + 6.8); ctx.lineTo(-3.2, hy + 10.6); ctx.lineTo(-1.2, hy + 6.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1.2, hy + 6.8); ctx.lineTo(3.2, hy + 10.6); ctx.lineTo(5, hy + 6.8); ctx.closePath(); ctx.fill();

    ctx.restore();
    this._flash(ctx, m, 0, -42, 38);
    ctx.restore();
  },

  /* 受击白闪覆盖 */
  _flash(ctx, m, x, y, r) {
    if (m.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(m.hitFlash * 5, 0.75)})`;
      ell(ctx, x, y, r, r * 1.1); ctx.fill();
    }
    // 灼烧指示
    if (m.burnT > 0) {
      ctx.fillStyle = `rgba(255,110,30,${0.16 + Math.sin(m.animT * 14) * 0.08})`;
      ell(ctx, x, y, r * 0.94, r * 1.04); ctx.fill();
    }
    // 霜冻指示（叠层越深越蓝）
    if (m.frostStacks > 0 && m.frostT > 0) {
      ctx.fillStyle = `rgba(150,220,255,${0.14 + m.frostStacks * 0.07})`;
      ell(ctx, x, y, r * 0.94, r * 1.04); ctx.fill();
    }
    // 眩晕星屑（绕头四颗，发光、近大远小，随怪物体型放大）
    if (m.stunT > 0) {
      ctx.save();
      ctx.fillStyle = "#ffe14a";
      ctx.shadowColor = "#ffe14a"; ctx.shadowBlur = 7;
      const orbR = r * 0.55 + 7;
      for (let i = 0; i < 4; i++) {
        const a = m.animT * 7 + i * Math.PI / 2;
        const sx = x + Math.cos(a) * orbR;
        const sy = y - r - 10 + Math.sin(a) * 4.5;
        const ss = 2.6 + Math.sin(a) * 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy - ss * 1.7); ctx.lineTo(sx + ss, sy);
        ctx.lineTo(sx, sy + ss * 1.7); ctx.lineTo(sx - ss, sy);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  },

  /* ============================================================
   * 经验宝石
   * ============================================================ */
  gem(ctx, g, t) {
    const s = g.value >= 8 ? 10 : g.value >= 3 ? 8 : 6.4;
    const col = g.value >= 8 ? "#ffd042" : g.value >= 3 ? "#b06ff2" : "#5ad1ff";
    const bob2 = Math.sin(t * 5 + g.seed * 9) * 2.2;
    ctx.save();
    ctx.translate(g.x, g.y - 8 + bob2);
    // 光晕
    ctx.save();
    ctx.globalAlpha = 0.32 + Math.sin(t * 5 + g.seed * 9) * 0.1;
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ell(ctx, 0, 0, s * 0.8, s * 0.8); ctx.fill();
    ctx.restore();
    // 菱形主体
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.4;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.72, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 高光
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.4); ctx.lineTo(0, -s * 0.62); ctx.stroke();
    ctx.restore();
  },

  /* ============================================================
   * 毒液地面区域（瘟疫法杖）
   * ============================================================ */
  pool(ctx, pool, t) {
    const fade = Math.min(1, pool.ticks / 1.5);   // 剩余跳数越少越透明
    ctx.save();
    ctx.translate(pool.x, pool.y);
    ctx.globalAlpha = 0.15 + 0.6 * fade;
    // 外圈深毒渍
    ctx.fillStyle = "#4e7a2a";
    ell(ctx, 0, 0, pool.r, pool.r * 0.55); ctx.fill();
    // 内圈鲜活毒液
    ctx.fillStyle = "#7ec24a";
    ell(ctx, 0, 2, pool.r * 0.78, pool.r * 0.42); ctx.fill();
    // 冒泡
    ctx.fillStyle = "rgba(216,240,160,0.8)";
    for (let i = 0; i < 4; i++) {
      const ph = t * 1.6 + i * 1.7 + (pool.x % 10);
      const bx = Math.cos(ph * 0.9 + i * 2.4) * pool.r * 0.5;
      const by = Math.sin(ph * 1.3 + i) * pool.r * 0.24;
      ell(ctx, bx, by, 3 + Math.sin(ph * 2) * 1.2, 2.2 + Math.sin(ph * 2) * 0.8); ctx.fill();
    }
    ctx.restore();
  },

  /* ============================================================
   * 图标（HUD / 升级卡）：武器 id 或属性 id
   * ============================================================ */
  icon(ctx, id, size) {
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    const s = size / 100;
    ctx.scale(s, s);
    ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W; ctx.lineJoin = "round"; ctx.lineCap = "round";

    const wcfg = CONFIG.WEAPONS[id];
    if (wcfg) {
      // 武器图标：斜置（长柄双手武器缩装入框）
      const long = id === "lance" || id === "chain" || id === "scythe";
      const mid = id === "axe" || id === "hammer";
      const scl = long ? 0.62 : mid ? 0.8 : 0.95;
      const off = id === "shield" ? -18 : long ? -30 : mid ? -20 : -34;
      ctx.rotate(-Math.PI / 4);
      ctx.scale(scl, scl);
      ctx.translate(off, 0);
      this.weaponInHand(ctx, id);
      ctx.restore();
      return;
    }

    switch (id) {
      case "hp": {   // 红心
        ctx.fillStyle = "#e33427";
        ctx.beginPath();
        ctx.moveTo(0, 34);
        ctx.bezierCurveTo(-44, 4, -30, -34, 0, -12);
        ctx.bezierCurveTo(30, -34, 44, 4, 0, 34);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ell(ctx, -13, -8, 7, 5); ctx.fill();
        break;
      }
      case "dmg": {  // 交叉双剑
        for (const r2 of [Math.PI / 4, -Math.PI / 4]) {
          ctx.save(); ctx.rotate(r2);
          ctx.translate(0, 26);
          ctx.fillStyle = "#c3ccd6";
          ctx.beginPath();
          ctx.moveTo(-5, -60); ctx.lineTo(5, -60); ctx.lineTo(3, 18); ctx.lineTo(-3, 18);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#d8a93e";
          rr(ctx, -13, -44, 26, 7, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#8a5f36";
          rr(ctx, -4, -38, 8, 20, 3); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case "as": {   // 迅捷双箭
        ctx.fillStyle = "#ff9a2a";
        for (const off of [-22, 8]) {
          ctx.beginPath();
          ctx.moveTo(off - 12, -14); ctx.lineTo(off + 10, 0); ctx.lineTo(off - 12, 14);
          ctx.lineTo(off - 4, 0); ctx.closePath();
          ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "spd": {  // 铁靴
        ctx.fillStyle = "#8d97a3";
        rr(ctx, -18, -34, 22, 44, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-18, 4); ctx.lineTo(-18, 22); ctx.lineTo(28, 22);
        ctx.quadraticCurveTo(30, 8, 14, 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#5f6873";
        rr(ctx, -20, 16, 50, 9, 4); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(0, -26); ctx.stroke();
        break;
      }
      case "armor": { // 银盾
        ctx.fillStyle = "#b7c1cd";
        ctx.beginPath();
        ctx.moveTo(0, -36); ctx.quadraticCurveTo(30, -32, 30, -4);
        ctx.quadraticCurveTo(28, 22, 0, 36);
        ctx.quadraticCurveTo(-28, 22, -30, -4);
        ctx.quadraticCurveTo(-30, -32, 0, -36);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#d8a93e"; ell(ctx, 0, -2, 9, 9); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#7f8a99"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 24); ctx.stroke();
        break;
      }
      case "regen": { // 白圆红十字
        ctx.fillStyle = "#f4efe2";
        ell(ctx, 0, 0, 34, 34); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#e33427";
        rr(ctx, -8, -22, 16, 44, 4); ctx.fill();
        rr(ctx, -22, -8, 44, 16, 4); ctx.fill();
        break;
      }
      case "pickup": { // 磁铁
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        ctx.fillStyle = "#e33427";
        ctx.beginPath();
        ctx.arc(0, -8, 26, Math.PI, 0, false);
        ctx.lineTo(16, -2); ctx.lineTo(16, 12); ctx.lineTo(4, 12); ctx.lineTo(4, -4);
        ctx.quadraticCurveTo(0, -12, -4, -4); ctx.lineTo(-4, 12); ctx.lineTo(-16, 12); ctx.lineTo(-16, -2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#c3ccd6";
        rr(ctx, -16, 6, 12, 14, 3); ctx.fill(); ctx.stroke();
        rr(ctx, 4, 6, 12, 14, 3); ctx.fill(); ctx.stroke();
        break;
      }
      case "xp": {   // 金星
        ctx.fillStyle = "#ffd042";
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = -Math.PI / 2 + i * Math.PI * 2 / 5;
          const a2 = a1 + Math.PI / 5;
          ctx.lineTo(Math.cos(a1) * 36, Math.sin(a1) * 36);
          ctx.lineTo(Math.cos(a2) * 15, Math.sin(a2) * 15);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "crit": { // 准星
        ctx.strokeStyle = OUT; ctx.lineWidth = OUT_W;
        ctx.fillStyle = "#e33427";
        ell(ctx, 0, 0, 28, 28); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f4efe2";
        ell(ctx, 0, 0, 18, 18); ctx.fill();
        ctx.fillStyle = OUT; ell(ctx, 0, 0, 7, 7); ctx.fill();
        ctx.fillStyle = "#e33427";
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
          rr(ctx, dx === 0 ? -5 : dx * 30 - 5, dy === 0 ? -5 : dy * 30 - 5, 10, 10, 2); ctx.fill();
        });
        break;
      }
      case "slot": { // 金圈加号
        ctx.fillStyle = "#d8a93e";
        ell(ctx, 0, 0, 34, 34); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#5a3a12";
        rr(ctx, -22, -7, 44, 14, 6); ctx.fill();
        rr(ctx, -7, -22, 14, 44, 6); ctx.fill();
        break;
      }
      case "wup": {  // 铁砧+箭头（武器升级）
        ctx.fillStyle = "#5f6873";
        ctx.beginPath();
        ctx.moveTo(-30, -6); ctx.quadraticCurveTo(0, -26, 30, -6);
        ctx.lineTo(22, 6); ctx.lineTo(8, 2); ctx.lineTo(2, 26); ctx.lineTo(-14, 26); ctx.lineTo(-8, 0);
        ctx.quadraticCurveTo(-20, 2, -30, -6);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#4fb52f";
        ctx.beginPath();
        ctx.moveTo(34, -30); ctx.lineTo(34, -6); ctx.lineTo(24, -12); ctx.lineTo(14, 2);
        ctx.lineTo(30, -2); ctx.lineTo(26, 6); ctx.lineTo(44, -4);
        ctx.closePath();
        ctx.fillStyle = "#4fb52f";
        ctx.fill(); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  },
});


/* ============================================================
 * 动态氛围层：让静态场景"活"起来
 *   drawBack  —— 实体之下：云影漂移 + 草簇风摆
 *   drawFront —— 实体之上：炊烟 / 光尘 / 落叶 / 蝴蝶
 *   update 每帧驱动（菜单与对局都生效），draw 由 Game.render / main 调用
 * ============================================================ */
const Ambient = {
  grassSprites: [], tufts: [], smokes: [], motes: [],
  butterflies: [], cloudShadows: [], leaves: [],
  smokeTimer: 0, leafTimer: 0,

  init() {
    const R = mulberry32(9527);
    const W = CONFIG.W, H = CONFIG.H;

    // —— 预渲染草簇贴图（2x 超采样，避免每帧重画叶片） ——
    const mkTuft = (kind, col, hi) => {
      const cv = document.createElement("canvas");
      const S = 2;
      cv.width = 44 * S; cv.height = 34 * S;
      const q = cv.getContext("2d");
      q.scale(S, S); q.translate(22, 32);
      q.lineCap = "round"; q.lineJoin = "round";
      const blade = (x0, cx, x1, h2, w2, c2) => {
        q.strokeStyle = c2 || col; q.lineWidth = w2;
        q.beginPath(); q.moveTo(x0, 0); q.quadraticCurveTo(cx, -h2 * 0.6, x1, -h2); q.stroke();
      };
      if (kind === 0) {          // 宽叶草
        blade(-2, -9, -12, 22, 3.2); blade(0, -1, 1, 27, 3.4); blade(2, 9, 11, 20, 3.2);
        blade(0, -3, -5, 24, 1.4, hi);
      } else if (kind === 1) {   // 细高草
        blade(0, -5, -9, 30, 2); blade(1, 2, 6, 33, 2); blade(-1, -1, -1, 28, 2);
        blade(1, 4, 8, 30, 1.1, hi);
      } else {                   // 苔草簇
        blade(-3, -8, -11, 14, 3.6); blade(0, 0, 0, 17, 3.6); blade(3, 8, 10, 13, 3.6);
      }
      return cv;
    };
    this.grassSprites = [
      mkTuft(0, "rgba(52,96,30,0.85)", "rgba(150,200,90,0.7)"),
      mkTuft(1, "rgba(45,88,26,0.85)", "rgba(140,190,80,0.7)"),
      mkTuft(2, "rgba(36,74,20,0.8)", "rgba(110,160,70,0.6)"),
    ];

    // —— 摆动草簇实例 ——
    this.tufts = [];
    for (let i = 0; i < 56; i++) {
      this.tufts.push({
        x: 30 + R() * (W - 60),
        y: 132 + R() * (H - 170),
        img: this.grassSprites[(R() * 3) | 0],
        s: 0.8 + R() * 0.8,
        fl: R() < 0.5,
        ph: R() * Math.PI * 2,
        amp: 0.05 + R() * 0.06,
        spd: 1.2 + R() * 0.9,
      });
    }

    // —— 光尘 ——
    this.motes = [];
    for (let i = 0; i < 16; i++) {
      this.motes.push({
        x: R() * W, y: 110 + R() * (H - 170),
        ph: R() * 9, spd: 0.5 + R() * 0.7,
        s: 1 + R() * 1.8, dx: 6 + R() * 10, dy: 4 + R() * 6,
      });
    }

    // —— 蝴蝶 ×2 ——
    this.butterflies = [
      { ax: 320, ay: 320, x: 320, y: 320, ph: R() * 9, col: "#fff7f0", t: 0 },
      { ax: 920, ay: 470, x: 920, y: 470, ph: R() * 9, col: "#ffb347", t: 0 },
    ];

    // —— 云影 ——
    this.cloudShadows = [];
    for (let i = 0; i < 3; i++) {
      this.cloudShadows.push({ x: R() * W, y: 150 + R() * (H - 280), rx: 200 + R() * 140, spd: 7 + R() * 6 });
    }

    this.smokes = [];
    this.leaves = [];
    this.smokeTimer = 0;
    this.leafTimer = 1 + R() * 2;
  },

  update(dt) {
    const W = CONFIG.W, H = CONFIG.H;

    // 炊烟：从烟囱缓慢升腾
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0 && Art.chimneys && Art.chimneys.length) {
      this.smokeTimer = 0.34 + Math.random() * 0.16;
      for (const ch of Art.chimneys) {
        if (this.smokes.length > 18) break;
        this.smokes.push({
          x: ch.x, y: ch.y, r: 7.5 + Math.random() * 3,
          t: 0, life: 4.4 + Math.random() * 0.8, drift: (Math.random() - 0.5) * 9,
        });
      }
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.t += dt;
      if (s.t > s.life) { this.smokes.splice(i, 1); continue; }
      s.y -= 12.5 * dt;
      s.x += (s.drift + Math.sin(s.t * 1.8) * 6) * dt;
      s.r += 6.5 * dt;
    }

    // 落叶
    this.leafTimer -= dt;
    if (this.leafTimer <= 0) {
      this.leafTimer = 1.8 + Math.random() * 2.6;
      if (this.leaves.length < 6) {
        this.leaves.push({
          x: Math.random() * W, y: 60 + Math.random() * 40,
          t: 0, life: 7 + Math.random() * 3, ph: Math.random() * 9,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 2.4,
          col: Math.random() < 0.5 ? "#7ea84e" : "#a8b04a",
        });
      }
    }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i];
      l.t += dt;
      if (l.t > l.life || l.y > H - 70) { this.leaves.splice(i, 1); continue; }
      l.y += (26 + Math.sin(l.ph + l.t * 2.2) * 10) * dt;
      l.x += (Math.sin(l.ph * 3 + l.t * 1.6) * 34 + 8) * dt;
      l.rot += l.vr * dt;
    }

    // 蝴蝶游走（锚点漂移 + 环绕抖动，位置平滑跟随）
    for (const b of this.butterflies) {
      b.t += dt;
      b.ax += Math.sin(b.t * 0.23 + b.ph) * 18 * dt;
      b.ay += Math.cos(b.t * 0.31 + b.ph * 2) * 12 * dt;
      b.ax = Math.max(80, Math.min(W - 80, b.ax));
      b.ay = Math.max(150, Math.min(H - 120, b.ay));
      const tx = b.ax + Math.sin(b.t * 2.1 + b.ph) * 34;
      const ty = b.ay + Math.sin(b.t * 3.7 + b.ph * 2) * 22 - 18;
      b.x += (tx - b.x) * Math.min(1, dt * 2.4);
      b.y += (ty - b.y) * Math.min(1, dt * 2.4);
    }
  },

  /* 实体之下：云影 + 风摆草簇 */
  drawBack(ctx, t) {
    const W = CONFIG.W;
    ctx.save();
    for (const cs of this.cloudShadows) {
      const cx = ((cs.x + t * cs.spd) % (W + cs.rx * 2)) - cs.rx;
      const grd = ctx.createRadialGradient(cx, cs.y, 0, cx, cs.y, cs.rx);
      grd.addColorStop(0, "rgba(20,40,10,0.055)");
      grd.addColorStop(1, "rgba(20,40,10,0)");
      ctx.fillStyle = grd;
      ell(ctx, cx, cs.y, cs.rx, cs.rx * 0.5); ctx.fill();
    }
    ctx.restore();

    for (const gf of this.tufts) {
      const sk = Math.sin(t * gf.spd + gf.ph) * gf.amp + Math.sin(t * 0.6 + gf.ph * 2) * 0.02;
      ctx.save();
      ctx.translate(gf.x, gf.y);
      ctx.transform(1, 0, sk, 1, 0, 0);       // 水平 skew：底部固定、顶部摆动
      ctx.scale(gf.fl ? -gf.s : gf.s, gf.s);
      ctx.drawImage(gf.img, -22, -32, 44, 34);
      ctx.restore();
    }
  },

  /* 实体之上：炊烟 + 光尘 + 落叶 + 蝴蝶 */
  drawFront(ctx, t) {
    // 炊烟（柔边灰白团，上升膨胀淡出）
    ctx.save();
    for (const s of this.smokes) {
      const k = s.t / s.life;
      const a = 0.42 * Math.pow(1 - k, 1.25) * Math.min(1, s.t * 4);
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.2);
      grd.addColorStop(0, `rgba(238,236,230,${a})`);
      grd.addColorStop(0.55, `rgba(238,236,230,${a * 0.55})`);
      grd.addColorStop(1, "rgba(238,236,230,0)");
      ctx.fillStyle = grd;
      ell(ctx, s.x, s.y, s.r * 2.2, s.r * 2); ctx.fill();
    }
    ctx.restore();

    // 光尘（加法混合的暖色小光点，呼吸明灭）
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const m of this.motes) {
      const a = 0.12 + 0.10 * (1 + Math.sin(t * m.spd + m.ph)) / 2;
      const x = m.x + Math.sin(t * m.spd * 0.7 + m.ph) * m.dx;
      const y = m.y + Math.cos(t * m.spd * 0.5 + m.ph * 1.7) * m.dy;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, m.s * 3);
      grd.addColorStop(0, `rgba(255,244,200,${a})`);
      grd.addColorStop(1, "rgba(255,244,200,0)");
      ctx.fillStyle = grd;
      ell(ctx, x, y, m.s * 3, m.s * 3); ctx.fill();
    }
    ctx.restore();

    // 落叶（打转飘落）
    ctx.save();
    for (const l of this.leaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot + Math.sin(l.t * 3 + l.ph) * 0.5);
      ctx.globalAlpha = Math.min(1, (l.life - l.t) * 2);
      ctx.fillStyle = l.col;
      ell(ctx, 0, 0, 4.5, 2.4); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 蝴蝶（地面小影 + 扑翼双翅）
    for (const b of this.butterflies) {
      ctx.save();
      ctx.fillStyle = "rgba(20,30,10,0.15)";
      ell(ctx, b.x, b.y + 20, 5, 2); ctx.fill();
      ctx.translate(b.x, b.y);
      const flap = Math.abs(Math.sin(b.t * 13 + b.ph));
      const dir = Math.cos(b.t * 2.1 + b.ph) >= 0 ? 1 : -1;
      ctx.scale(dir, 1);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      const wsc = 0.35 + flap * 0.65;
      ctx.fillStyle = b.col;
      for (const sd of [-1, 1]) {
        ctx.fillStyle = b.col;
        ell(ctx, sd * (1.5 + 4 * wsc), -2, 4.2 * wsc, 5.2); ctx.fill(); ctx.stroke();
        ell(ctx, sd * (1.2 + 3.4 * wsc), 3, 3 * wsc, 3.6); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = "#4a3a28";
      ell(ctx, 0, 0, 1.1, 4.6); ctx.fill();
      ctx.restore();
    }
  },
};

Object.assign(Art, {

  /* ============================================================
   * STELATO 品牌纹章（参考 参考图/STELATO.png）：单色细线稿
   * 盾形轮廓（平顶/垂直侧边/收尖弧底）+ 顶部四芒星 + 中央星轴
   * （末端菱形尖端）+ 星轨弧带 + 两行星座点阵 + V 形星翼曲线
   * (x,y)=纹章中心，w=宽度（高 = w×1.9）
   * opts: { color 线色(默认银白), alpha 整体透明度, lw 线宽, glow 辉光 }
   * ============================================================ */
  stelato(ctx, x, y, w, opts) {
    const o = opts || {};
    const h = w * 1.9;
    const col = o.color || "#E8ECF2";
    const lw = o.lw || Math.max(1, w * 0.022);
    const X = u => x + u * w, Y = v => y + v * h;   // u,v ∈ [-0.5,0.5] 归一化坐标
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) { ctx.shadowColor = col; ctx.shadowBlur = w * 0.05; }
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";

    // 盾形外框
    ctx.beginPath();
    ctx.moveTo(X(-0.36), Y(-0.44));
    ctx.lineTo(X(0.36), Y(-0.44));
    ctx.lineTo(X(0.36), Y(0.10));
    ctx.quadraticCurveTo(X(0.33), Y(0.28), x, Y(0.46));
    ctx.quadraticCurveTo(X(-0.33), Y(0.28), X(-0.36), Y(0.10));
    ctx.closePath();
    ctx.stroke();

    // 顶部四芒星（品牌星芒，实心）
    const s = w * 0.085, d = s * 0.30, sy = Y(-0.30);
    ctx.beginPath();
    ctx.moveTo(x, sy - s);
    ctx.lineTo(x + d, sy - d); ctx.lineTo(x + s, sy);
    ctx.lineTo(x + d, sy + d); ctx.lineTo(x, sy + s);
    ctx.lineTo(x - d, sy + d); ctx.lineTo(x - s, sy);
    ctx.lineTo(x - d, sy - d);
    ctx.closePath(); ctx.fill();

    // 中央星轴 + 菱形尖端
    ctx.beginPath(); ctx.moveTo(x, Y(-0.20)); ctx.lineTo(x, Y(0.315)); ctx.stroke();
    const dw = w * 0.05, dy = Y(0.37);
    ctx.beginPath();
    ctx.moveTo(x, dy - dw); ctx.lineTo(x + dw * 0.8, dy);
    ctx.lineTo(x, dy + dw); ctx.lineTo(x - dw * 0.8, dy);
    ctx.closePath(); ctx.fill();

    // 星轨弧带（贯穿盾面的浅弧）
    ctx.beginPath();
    ctx.moveTo(X(-0.345), Y(0.04));
    ctx.quadraticCurveTo(x, Y(-0.10), X(0.345), Y(0.04));
    ctx.stroke();

    // 星座点阵（两行，对称）
    const dot = (u, v) => { ctx.beginPath(); ctx.arc(X(u), Y(v), lw * 0.9, 0, Math.PI * 2); ctx.fill(); };
    for (const u of [0.13, 0.23, 0.31]) { dot(u, 0.13); dot(-u, 0.13); }
    for (const u of [0.18, 0.27]) { dot(u, 0.21); dot(-u, 0.21); }

    // V 形星翼曲线（自中轴下段向盾底两侧张开）
    for (const sd of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(x, Y(0.25));
      ctx.quadraticCurveTo(X(sd * 0.19), Y(0.28), X(sd * 0.135), Y(0.35));
      ctx.stroke();
    }
    ctx.restore();
  },
});
