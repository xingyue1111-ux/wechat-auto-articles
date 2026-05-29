## AI HOT 长图式公众号简报

这是一个部署到 Vercel 的轻量项目。

它每天抓取 AI HOT 精选新闻，使用 DeepSeek 生成视觉简报结构，使用 Seedream 生成配图，再把每一屏合成为真实 PNG 长图。最终 HTML 页面只按顺序展示这些长图，适合做公众号长图式文章预览。

## 链路

1. Vercel Cron 每天北京时间 19:00 触发。
2. 抓取 AI HOT `items?mode=selected`，优先过去 24 小时，素材不足时扩展到最近 7 天。
3. DeepSeek 生成封面、今日脉络、重点新闻、落地判断、结尾页。
4. Seedream 为每一屏生成复古未来主义配图。
5. Satori + Resvg 合成 1080px 宽 PNG 长图。
6. Vercel Blob 保存长图和 manifest。
7. `/latest` 展示最新一期，`/article/YYYY-MM-DD` 展示历史日期页。

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
