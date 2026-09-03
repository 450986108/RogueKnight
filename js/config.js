/* ============================================================
 * 星寰骑士 STELATO Knight — 平衡数值总表
 * 所有调参都在这里改，代码中只读不写
 * ============================================================ */
"use strict";

const CONFIG = {

  W: 1280,                       // 逻辑分辨率
  H: 720,
  ARENA: { x: 56, y: 60, w: 1168, h: 606 },   // 可行走内圈（树篱边界以内）

  AUTO_ATTACK: true,             // 自动攻击：武器自动朝瞄准方向出手，无需按攻击键（鼠标/右摇杆只管瞄准）

  PLAYER: {
    hp: 100,                     // 基准生命（=流浪骑士；各英雄在 HEROES 里覆盖）
    speed: 220,                  // 基准移速 px/s
    radius: 20,
    pickup: 80,                  // 经验宝石吸附半径
    slotsBase: 2,                // 基准初始武器槽（各英雄可覆盖）
    slotsMax: 6,
    iframes: 0.5,                // 受击无敌
  },

  /* ---------- 骑士（可选角色）----------
   * 全部以流浪骑士（=旧版单一角色）为基准换算，总体均衡：
   * hp/speed/slots    初始生命 / 移速 / 武器槽
   * as                攻击速度倍率（乘入 mult.as，与升级卡叠乘）
   * healPerKill       每次击杀回复生命（血怒）
   * armor / regen     初始护甲（受击固定减免）/ 每秒回血（铁壁）
   * shieldDelay       脱战该秒数后生成圣盾：完全格挡一次伤害（圣辉）
   * startWeapons      初始武器（默认阔剑；秘法自带双法杖且占满初始槽）
   * xp / pickup       经验倍率 / 拾取半径倍率 */
  HEROES: {
/* lore: 模糊人物设定（卡片按行显示，每行 ≤12 字、最多 3 行，避免溢出；连读见详情栏） */
    wanderer: {
      name: "流浪骑士", role: "均衡",
      hp: 100, speed: 220, slots: 2,
      as: 1, healPerKill: 0, armor: 0, regen: 0, shieldDelay: 0,
      startWeapons: null, xp: 1, pickup: 1,
      lore: ["在荒野中流浪的骑士", "以一把旧剑走遍大陆", "各方面能力均衡"],
    },
    astro: {
      name: "享界骑士", role: "重装",   // STELATO 原味太空甲（与游戏名"星寰骑士"区分）
      hp: 130, speed: 187, slots: 3,
      as: 1, healPerKill: 0, armor: 0, regen: 0, shieldDelay: 0,
      startWeapons: null, xp: 1, pickup: 1,
      lore: ["征战星际的享界骑士", "装备机械重铠和智能系统", "血量更高，多一个武器槽"],
    },
    holy: {
      name: "圣辉骑士", role: "守护",
      hp: 85, speed: 220, slots: 2,
      as: 1, healPerKill: 0, armor: 0, regen: 0, shieldDelay: 4.5,
      startWeapons: null, xp: 1, pickup: 1,
      lore: ["恪守圣誓的守护骑士", "血量略低，脱战片刻", "圣盾可完全挡下一击"],
    },
    gale: {
      name: "疾风骑士", role: "迅捷",
      hp: 80, speed: 231, slots: 2,
      as: 1.25, healPerKill: 0, armor: 0, regen: 0, shieldDelay: 0,
      startWeapons: null, xp: 1, pickup: 1,
      lore: ["来去如风的迅捷剑客", "出手与脚步都极快", "血量偏低"],
    },
    blood: {
      name: "血怒骑士", role: "续航",
      hp: 85, speed: 220, slots: 2,
      as: 1, healPerKill: 1, armor: 0, regen: 0, shieldDelay: 0,
      startWeapons: null, xp: 1, pickup: 1,
      lore: ["大杀四方的血怒骑士", "能从鲜血中恢复自身", "血量略低，越战越勇"],
    },
    iron: {
      name: "铁壁骑士", role: "坦克",
      hp: 95, speed: 220, slots: 2,
      as: 1, healPerKill: 0, armor: 4, regen: 0.5, shieldDelay: 0,
      startWeapons: null, xp: 1, pickup: 1,
      lore: ["身披重甲的钢铁堡垒", "寻常刀剑难伤分毫", "伤势亦会缓缓自愈"],
    },
    arcana: {
      name: "秘法骑士", role: "炮台",
      hp: 50, speed: 220, slots: 2,          // 血量=流浪骑士一半；双法杖开局即占满 2 槽
      as: 1, healPerKill: 0, armor: 0, regen: 0, shieldDelay: 0,
      startWeapons: ["fire", "lightning"], xp: 1, pickup: 1,
      lore: ["钻研奥术的秘法骑士", "血量减半，开局双杖满槽", "火焰与闪电自动索敌"],
    },
  },
  HERO_ORDER: ["wanderer", "astro", "holy", "gale", "blood", "iron", "arcana"],
  HERO_DEFAULT: "wanderer",      // 选人界面默认选中 / startRun 兜底

  /* ---------- 武器 ----------
   * type: melee=近战扇形  fire=火焰锥  lightning=闪电链  proj=投射物  prism=引导激光
   * thrust: 直刺型动作（突刺/速刺/盾击，见 art2._meleePose 各武器专属曲线）
   * anim:   出手动作时长 s（蓄力→击发→收势的节奏，重武器更慢）
   * 全部武器都 designed 为可同时命中多个敌人 */
  WEAPONS: {
    sword: {
      name: "阔剑", type: "melee",
      dmg: 12, cd: 0.65, range: 143, arc: 110, anim: 0.28,
      knockback: 70,
      desc: "攻速、伤害、距离均衡的经典骑士剑，扇形横扫",
    },
    axe: {
      name: "双手战斧", type: "melee",
      dmg: 28, cd: 1.5, range: 158, arc: 140, anim: 0.55,
      knockback: 120,
      desc: "高伤害大范围横扫，但攻速很慢",
    },
    lance: {
      name: "骑士长枪", type: "melee",
      dmg: 18, cd: 1.1, range: 248, arc: 30, thrust: true, anim: 0.34,
      knockback: 140,
      desc: "超长距离窄范围突刺，先下手为强",
    },
    shield: {
      name: "盾牌", type: "melee",
      dmg: 6, cd: 1.2, range: 117, arc: 100, thrust: true, anim: 0.3,
      knockback: 240, block: true, blockArc: 120,
      desc: "攻击力低，但正面120°免受一切伤害，盾击可击退敌群",
    },
    fire: {
      name: "火焰法杖", type: "fire",
      dmg: 1.5, cd: 0.2, range: 230, arc: 35,
      burnDps: 0.5, burnTime: 2,   // 灼烧 = dmg*0.5/s，持续2s（重复刷新）
      desc: "朝准星持续喷出火锥，中距离持续灼烧成群敌人",
    },
    lightning: {
      name: "闪电法杖", type: "lightning",
      dmg: 20, cd: 1.4, range: 320, arc: 70,
      chains: 3, chainRange: 150, falloff: 0.75,
      desc: "闪电击中目标后跳跃至多3个敌人，每跳伤害递减",
    },
    wind: {
      name: "风刃法杖", type: "proj",
      dmg: 11, cd: 0.9, range: 460, width: 56, speed: 520,
      pierce: true,
      desc: "发射巨型风刃，远距离穿透沿线所有敌人",
    },
    water: {
      name: "水球法杖", type: "proj",
      dmg: 32, cd: 1.6, range: 380, aoe: 80, speed: 380,
      explode: true,
      desc: "水球命中后爆裂，远距离小范围高额伤害",
    },
    /* ---- 近战扩展 ---- */
    shadow: {
      name: "影刃", type: "melee",
      dmg: 7, cd: 0.28, range: 95, arc: 100, thrust: true, anim: 0.17,
      knockback: 30,
      desc: "双手匕首疯狂连刺，攻速极快但距离很短",
    },
    hammer: {
      name: "破甲战锤", type: "melee",
      dmg: 26, cd: 1.35, range: 112, arc: 90, anim: 0.5,
      knockback: 150, stun: 1,
      desc: "短距离高额重击，命中使敌人眩晕 1 秒（原地晃动绕星、无法移动与攻击）",
    },
    chain: {
      name: "链刃", type: "melee",
      dmg: 8, cd: 0.9, range: 285, arc: 12, thrust: true, anim: 0.36,
      knockback: 0, gather: 480,   // 命中者被垂直拉到突刺中线上（沿线聚成一列，便于穿透/范围收割）
      desc: "超长距离直线突刺：穿透路径上的敌人，低伤但把他们拉到突刺中线上排成一列",
    },
    scythe: {
      name: "血镰", type: "melee",
      dmg: 16, cd: 1.0, range: 168, arc: 135, anim: 0.46,
      knockback: 60, healPerKill: 1,
      desc: "中距离大弧度挥砍，每击杀一只怪物回复 1 点生命",
    },
    /* ---- 法杖扩展 ---- */
    ice: {
      name: "冰魄法杖", type: "proj",
      dmg: 9, cd: 0.8, range: 380, speed: 500,
      pierce: true,
      frostSlow: 0.14, frostMax: 3, frostTime: 2.5,
      shatterDmg: 0.8, shatterR: 80,
      desc: "冰晶穿透叠加霜冻减速，叠满 3 层碎冰造成溅射伤害",
    },
    plague: {
      name: "瘟疫法杖", type: "proj",
      dmg: 6, cd: 2.0, range: 340, speed: 360,
      poolR: 88, poolTicks: 5, poolTickDelay: 0.5, poolDmgMul: 1.0,
      desc: "投掷毒液形成毒液区域，随后造成 5 次持续毒伤",
    },
    prism: {
      name: "光棱法杖", type: "prism",
      dmg: 5, cd: 0.16, range: 430, width: 30,
      closeBonus: 1.0,           // 贴脸 ×2 → 射程端 ×1 线性递减
      desc: "持续引导的激光束，距离越近伤害越高",
    },
    gravity: {
      name: "引力法杖", type: "proj",
      dmg: 18, cd: 2.4, range: 300, speed: 300,
      pullR: 105, pull: 300, collapseTime: 0.45,
      blastR: 120, dmgPerPull: 8,
      desc: "发射黑洞吸附沿途敌人，压缩引爆——吸得越多炸得越痛",
    },
  },
  WEAPON_ORDER: [
    "sword", "axe", "lance", "shield", "fire", "lightning", "wind", "water",
    "shadow", "hammer", "chain", "scythe", "ice", "plague", "prism", "gravity",
  ],
  WEAPON_LVL: { dmgPerLvl: 0.20, asPerLvl: 0.05, max: 5 },   // 每级 +20%伤害 +5%攻速

  /* ---------- 怪物 ---------- */
  MONSTERS: {
    goblin: { name: "哥布林", tier: 1, hp: 20, speed: 85, dmg: 8, xp: 1, radius: 16, color: "#5da03f" },
    bat:    { name: "洞穴蝙蝠", tier: 2, hp: 14, speed: 140, dmg: 6, xp: 3, radius: 13, color: "#8a5fc9", fly: true },
    ogre:   { name: "巨魔", tier: 3, hp: 120, speed: 55, dmg: 20, xp: 8, radius: 30, color: "#6c9a3e" },
    demon:  { name: "深渊恶魔", tier: 4, hp: 260, speed: 72, dmg: 30, xp: 20, radius: 34, color: "#c14a3a" },
  },
  MONSTER_ATK_CD: 0.8,          // 接触伤害间隔

  /* ---------- 关卡（1..20） ---------- */
  LEVELS: {
    count: 20,
    bonusAfter: 10,                                     // 通过该关后额外奖励升 1 级
    quota:       L => 10 + 5 * L,                       // 过关击杀配额
    hpScale:     L => 1 + 0.30 * (L - 1),               // 怪物血量倍率
    dmgScale:    L => 1 + 0.12 * (L - 1),               // 怪物伤害倍率
    spdScale:    L => 1 + 0.02 * (L - 1),               // 怪物速度倍率
    spawnGap:    L => 1.4 - (L - 1) * (0.95 / 19),      // 生成间隔 1.4s → 0.45s（20 关线性）
    maxOnScreen: L => Math.min(8 + 2 * L, 28),          // 同屏上限
    // 各关 [哥布林, 蝙蝠, 巨魔, 恶魔] 生成权重；蝙蝠第2关、巨魔第4关、恶魔第10关登场
    weights: [
      [1.00, 0.00, 0.00, 0.00],
      [0.85, 0.15, 0.00, 0.00],
      [0.70, 0.30, 0.00, 0.00],
      [0.55, 0.30, 0.15, 0.00],
      [0.50, 0.30, 0.20, 0.00],
      [0.40, 0.35, 0.25, 0.00],
      [0.35, 0.35, 0.30, 0.00],
      [0.30, 0.38, 0.32, 0.00],
      [0.28, 0.40, 0.32, 0.00],
      [0.25, 0.38, 0.32, 0.05],
      [0.22, 0.36, 0.32, 0.10],
      [0.20, 0.35, 0.32, 0.13],
      [0.18, 0.34, 0.31, 0.17],
      [0.16, 0.33, 0.30, 0.21],
      [0.15, 0.32, 0.29, 0.24],
      [0.13, 0.31, 0.28, 0.28],
      [0.12, 0.30, 0.27, 0.31],
      [0.10, 0.28, 0.26, 0.36],
      [0.09, 0.26, 0.25, 0.40],
      [0.08, 0.25, 0.24, 0.43],
    ],
  },

  /* ---------- 经验曲线：升到 Lv.(n+1) 所需经验 ---------- */
  xpNeeded: n => 8 + 4 * (n - 1) + Math.floor(0.35 * (n - 1) * (n - 1)),

  /* ---------- 升级卡池 ----------
   * 强化幅度随强化等级递进：第 n 次获取同一强化时，幅度 = base + per ×(n-1)
   * 例如 力量精进：第1次 +10%，第2次 +12.5%，第3次 +15%…… */
  UPGRADES: [
    { id: "hp",     name: "强健体魄", base: 15,  per: 3,   weight: 10,
      fmt: v => `生命上限 +${v}%，并立刻回复等量生命` },
    { id: "dmg",    name: "力量精进", base: 10,  per: 2.5, weight: 10,
      fmt: v => `所有武器攻击力 +${v}%` },
    { id: "as",     name: "迅捷挥击", base: 8,   per: 2,   weight: 10,
      fmt: v => `所有武器攻击速度 +${v}%` },
    { id: "spd",    name: "轻捷铁靴", base: 7,   per: 1.5, weight: 10,
      fmt: v => `移动速度 +${v}%` },
    { id: "armor",  name: "加厚铠甲", base: 2,   per: 1,   weight: 10,
      fmt: v => `护甲 +${v}（受击伤害固定减免）` },
    { id: "regen",  name: "圣光庇护", base: 0.6, per: 0.2, weight: 9,
      fmt: v => `每秒回复 ${v} 点生命` },
    { id: "pickup", name: "磁力护符", base: 30,  per: 5,   weight: 7,
      fmt: v => `经验拾取范围 +${v}%` },
    { id: "xp",     name: "智慧宝典", base: 12,  per: 3,   weight: 8,
      fmt: v => `获得经验 +${v}%` },
    { id: "crit",   name: "致命一击", base: 6,   per: 1.5, weight: 9,
      fmt: v => `暴击率 +${v}%（暴击造成2倍伤害）` },
  ],
  SLOT_CARD:    { weight: 8 },   // 武器槽+1（有条件才进池）
  WEAPON_CARD:  { weight: 18 },  // 新武器（权重高，鼓励组多元流派；槽满时仍进池→替换旧武器）
  WUPGRADE_WEIGHT: 11,           // 武器升级卡

  CRIT_MULT: 2,
  BASE_CRIT: 0.05,
};
