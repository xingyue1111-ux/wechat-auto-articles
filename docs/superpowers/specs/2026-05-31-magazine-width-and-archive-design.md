# 杂志长图宽度与历史归档设计

## 目标

调整公众号长图排版，并增加可浏览的历史归档页。

- 封面标题优先排成两行，避免过早换行。
- 主线与雷达正文扩展至插画右边缘附近，减少无效留白。
- 继续保持图文彻底分区，不允许文字覆盖插画。
- 网站展示历史简报。同一天重复生成时，只展示最后一次结果。

## 排版方案

采用方案 B：放宽文字宽度，同时保留杂志节奏。

```text
┌────────────────────────────┐
│ 成本悬崖已至：AI 配给时代的 │
│ 企业生存指南               │
├────────────────────────────┤
│          大幅插画          │
├────────────────────────────┤
│ 01  本日主线               │
│     标题延伸至图片右边缘     │
│     正文延伸至图片右边缘     │
│                            │
│ 02  雷达信号               │
│     标题和正文自然换行       │
└────────────────────────────┘
```

### 具体规则

- 封面标题的换行宽度从保守值放宽，使常见标题优先落在两行内。
- 主线与雷达卡片保持左侧编号，但缩小编号和正文之间的间距。
- 正文列宽扩展到接近插画右边缘，同时保留固定右侧安全边距。
- 长英文词仍然强制断行，防止右侧裁切。
- 图片框内只显示图片。所有标题、正文和栏目标签都位于图片框外。

## 历史归档

新增 `/archive` 页面，用于浏览每天最后一次生成的简报。

每个日期展示一条记录：

- 日期与生成时间
- 文章标题、副标题
- 完整推文正文
- 5 张 Seedream 原始配图
- 4 张最终公众号长图
- 原始信号来源链接

后台增加“历史归档”入口。`/latest` 继续保持纯长图展示，方便直接浏览最新一期。

## 数据结构

扩展 `VisualBriefManifest`：

```ts
type VisualBriefManifest = {
  date: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  sourceWindow: "24h" | "7d";
  article: {
    panels: Array<{
      kind: VisualPanelKind;
      kicker: string;
      title: string;
      body: string[];
      sourceUrls: string[];
    }>;
  };
  illustrations: Array<{
    index: number;
    imageUrl: string;
  }>;
  panels: Array<{
    index: number;
    kind: VisualPanelKind;
    title: string;
    imageUrl: string;
    width: 1080;
    height: number;
    sourceUrls: string[];
  }>;
};
```

每天仍然写入两类 Manifest：

- `articles/YYYY-MM-DD/runs/<revision>/manifest.json`：保留每次运行结果。
- `articles/YYYY-MM-DD/manifest.json`：稳定指针内容，覆盖为当天最后一次结果。

归档列表只扫描稳定 Manifest。因此同一天只展示最后一次生成结果，不删除底层文件。

## 页面结构

### `/archive`

显示按生成时间倒序排列的日期卡片。每条卡片提供：

- “查看推文内容”：展开完整文章正文和原始信号链接。
- “查看长图”：打开 `/article/YYYY-MM-DD`。
- Seedream 原图缩略图。
- 最终长图缩略图。

### `/article/YYYY-MM-DD`

保留现有纯长图页面，继续适合公众号长图检查。

### `/admin`

保留生成控制台，并增加“历史归档”按钮。

## 兼容处理

旧 Manifest 没有 `article` 和 `illustrations` 字段。读取旧历史记录时：

- 仍然展示日期、标题和最终长图。
- 推文正文区域显示“该历史版本未保存正文”。
- Seedream 原图区域显示“该历史版本未保存原始配图”。

## 检查方式

- 单元测试确认封面标题换行宽度已放宽。
- 单元测试确认正文列宽扩展，但仍保留右侧安全边距。
- 单元测试确认 Manifest 保存正文和 5 张 Seedream 原图。
- 单元测试确认归档列表按日期稳定 Manifest 去重。
- 本地渲染四张 PNG，检查标题换行、正文右侧宽度和图文分区。
- 运行 `npm.cmd run test:run`、`npm.cmd run lint`、`npm.cmd run build`。
- 推送 GitHub 后确认 Vercel 部署状态为 `READY`。
