# 星寰骑士 STELATO Knight

> 中世纪 Q 版肉鸽生存动作游戏 —— 纯前端实现，浏览器即点即玩，无需安装。

**🎮 在线游玩：<https://450986108.github.io/RogueKnight/>**

![license](https://img.shields.io/badge/license-MIT-green) ![deps](https://img.shields.io/badge/dependencies-0-blue) ![size](https://img.shields.io/badge/payload-%3C300KB-orange)

## 玩法

王国沦陷，怪物横行。挑选一位骑士，在 20 关的连续挑战中存活下来——每关击杀足够多的怪物即可过关（过关回满血），撑到最后即可拯救王国。

- **7 位骑士**：各有独特初始武器与属性倾向
- **16 种武器**：近战劈砍 / 远程法杖自动索敌，可同时携带多把
- **升级四选一**：击杀攒经验，升级时随机刷新强化或新武器
- **20 关挑战**：怪物种类与强度逐关递增，第 10 关额外奖励

## 操作

开始时自选操作方式（会记住上次的选择）：

| | 桌面端 🖥 | 移动端 📱 |
|---|---|---|
| 移动 | WASD / 方向键 | 左半屏摇杆 |
| 攻击 | 鼠标控制方向，自动攻击 | 右半屏摇杆，推出死区即攻击 |
| 暂停 | ESC / P | 屏幕按钮 |
| 静音 | M | 屏幕按钮 |

## 本地运行

零依赖、零构建，任选其一：

```bash
# 方式一：直接双击 index.html
# 方式二：起个本地服务器（推荐，避免任何浏览器本地限制）
python -m http.server 8000
# 然后访问 http://localhost:8000
```

无头冒烟测试：`node test/sim.js`（需要 Node.js，仓库不含此目录）。

## 技术

- **Canvas 2D 程序化绘制**：骑士、怪物、场景、特效全部由代码绘制；仅 STELATO 品牌纹章使用贴图（深色原版 + 反色浅色版）
- **WebAudio 合成音效**：攻击、受击、升级等音效实时合成，无音频文件
- **总量 < 300KB**：9 个 JS + 1 个 CSS + 2 个 HTML + 2 张纹章贴图，纯静态托管即可

```
index.html        游戏入口
editor.html       外观调参工具（开发用）
img/              STELATO 品牌纹章贴图（stelato.png 深色 / stelato-light.png 浅色反色版）
css/style.css     界面样式
js/
  config.js       数值配置：武器/怪物/英雄/关卡
  art.js          程序化绘制：调色板/场景/武器图标
  art2.js         程序化绘制（续）：骑士/怪物/环境动效
  effects.js      特效与音效合成
  entities.js     怪物 AI 与实体逻辑
  weapons.js      武器行为
  ui.js           界面：菜单/选人/HUD/升级卡
  game.js         对局状态机
  main.js         启动：画布/输入/缩放/主循环
```

## License

MIT
