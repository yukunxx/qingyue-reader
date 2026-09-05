# 轻阅 · TXT 阅读器（MVP）

运行在浏览器中的轻量 TXT 电子书阅读器。纯前端、无后端，数据保存在本地 IndexedDB，刷新不丢、下次打开自动回到上次阅读位置。

## 功能

- **导入**：拖拽 / 文件选择导入 TXT，支持多文件；自动探测 UTF-8 / GBK / UTF-16 编码，避免中文乱码
- **书架**：书籍列表（封面、书名、作者、进度、最近阅读时间），按最近阅读排序，可删除
- **阅读**：固定字数分页（按需 `slice`，大文件不卡顿），字号 / 行距调节，日间 / 护眼 / 夜间三主题
- **进度记忆**：翻页 / 返回自动记录进度，刷新或下次打开自动恢复
- **字体**：全站使用阿里巴巴普惠体 3.0（Regular 55），本地打包离线可用

## 技术栈

Vite + React 18 + TypeScript + Zustand + IndexedDB（`idb`）+ Vitest + CSS Modules。

核心复杂度收敛在两个框架无关的纯 TS 模块：

- `src/lib/encoding.ts` — 编码探测（BOM 优先，UTF-8 fatal 严格解码，失败回退 GB18030）
- `src/lib/pagination.ts` — 固定字数分页（按需 `slice`，O(1) 随机访问）

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run test       # 运行单元测试
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览构建产物
```

## 目录结构

```
src/
  main.tsx / App.tsx
  types.ts
  lib/
    encoding.ts / pagination.ts / db.ts
  store/
    bookStore.ts
  components/
    Shelf/ Reader/ Settings/ Toast/
  styles/
    fonts.css / global.css / themes.css
  assets/
    fonts/          # 阿里巴巴普惠体 3.0 Regular TTF（本地打包）
```

`demo/index.html` 为交互参考原型；本实现按技术方案将其三处替换：`readAsText` → `ArrayBuffer` + 编码探测、`localStorage` → IndexedDB、预生成 `pages` 数组 → 存原文按需 `slice`。
