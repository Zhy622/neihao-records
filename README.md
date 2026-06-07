# 内耗记录本

一个本地优先的情绪与决策记录 App，用来发现高频纠结场景、情绪模式和决策习惯。

MVP 使用 Expo、React Native、TypeScript 和 SQLite。没有登录、后端或云同步，所有记录只保存在设备本地。

## 已实现

- 首页：今日记录次数、平均情绪强度、最常见分类
- 记录页：分类、情绪多选、强度、决策难度、耗时、想法、结果和事后判断
- 历史页：时间倒序、分类筛选、标题/想法搜索、删除
- 统计页：整体指标与最耗心力的前 5 条记录
- 习惯建议页：按分类展示本地静态规则
- SQLite schema、索引和本地 CRUD

## 环境要求

- Node.js 20 或更高版本
- npm
- 手机安装 Expo Go，或配置 Android Studio / Xcode 模拟器

## 安装与启动

```bash
npm install
npm start
```

启动后可以用 Expo Go 扫描二维码，也可以使用：

```bash
npm run android
npm run ios
npm run web
```

在 Windows 上构建 iOS 原生应用需要借助 macOS；使用 Expo Go 预览不受此限制。

## 验证

```bash
npm run typecheck
npx expo export --platform android
```

## 项目结构

```text
src/
  components/       通用 UI 组件
  constants/        本地静态建议规则
  database/         SQLite schema 与 CRUD
  hooks/            页面数据读取 hooks
  navigation/       页面导航
  screens/          五个 MVP 页面与记录表单
  types/            数据和导航类型
  utils/            统计计算逻辑
```

SQLite 数据库名为 `neihao-records.db`。首次启动时会自动创建 `records` 表和索引。

## 数据说明

- 数据仅写入当前设备上的 SQLite 数据库。
- 卸载 App 或清除应用数据会删除记录。
- 当前版本不包含同步和备份功能。

## 后续可优化

- 增加记录详情和编辑功能
- 支持导出/导入 JSON 或 CSV，方便本地备份
- 增加按周、月的趋势图和时间成本统计
- 允许用户维护自己的固定规则
- 增加数据库迁移版本和自动化测试
