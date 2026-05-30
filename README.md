## 企业 AI 落地长图式公众号简报

这是一个部署到 Vercel 的轻量项目。

它每天抓取 AI HOT、Hacker News、Hugging Face Daily Papers、arXiv RSS 和 GitHub Releases，筛选与企业 AI 落地有关的信号。DeepSeek 生成一个主线和 3-4 条落地雷达，Seedream 生成配图，再把每一屏合成为真实 PNG 长图。

公众号面向企业 AI 落地负责人，重点关注 Agent 生产力、Harness Engineering、通用企业场景和可验证的落地方法。Coding Agent 和 Vibe Coding 是重要观察窗口，但不是唯一主题。

## 链路

1. Vercel Cron 每天北京时间 19:00 触发。
2. 并行抓取五路公开来源，单路失败时继续使用其他来源。
3. 合并去重并压缩为最多 30 条企业 AI 落地候选素材。
4. DeepSeek 生成封面、今日主线、主线深挖、落地雷达、判断和结尾页。
5. Seedream 为每一屏生成复古未来主义配图。
6. Satori + Resvg 合成 1080px 宽 PNG 长图。
7. Vercel Blob 保存长图和 manifest。
8. `/latest` 展示最新一期，`/article/YYYY-MM-DD` 展示历史日期页。

## 本地启动

```powershell
npm.cmd install
npm.cmd run test:run
npm.cmd run build
npm.cmd run dev
```

后台地址：

```text
http://localhost:3000/admin
```

如果没有配置 `ADMIN_PASSWORD`，本地默认密码是：

```text
admin
```

## 环境变量

复制 `.env.example` 到 `.env.local`，并填入：

```text
ADMIN_PASSWORD=
CRON_SECRET=
DEEPSEEK_API_KEY=
BLOB_READ_WRITE_TOKEN=
ARK_API_KEY=
ARK_SEEDREAM_MODEL=
PUBLIC_APP_URL=
```

本地没有 `BLOB_READ_WRITE_TOKEN` 时，会使用内存回退，方便先看效果。部署到 Vercel 后请配置 Vercel Blob，否则生成结果不会持久保存。

## Vercel Cron

`vercel.json` 已配置：

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-run",
      "schedule": "0 11 * * *"
    }
  ]
}
```

这对应北京时间每天 19:00。
