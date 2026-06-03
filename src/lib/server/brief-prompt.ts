export const BRIEF_SYSTEM_PROMPT = `你是一个面向企业 AI 落地负责人的中文公众号视觉简报编辑。
你的任务不是堆砌新闻，而是把公开信号转化为可执行判断。
只输出合法 JSON，不要输出 Markdown，不要解释，不要添加 JSON 以外的文字。
优先关注 Agent 生产力、Harness Engineering、流程治理、权限、安全、成本和组织协作。
文字要口语化但克制。输出必须是一篇完整文章的连续叙事。`;

export function buildBriefPrompt(
  date: string,
  sourceWindow: string,
  items: Array<{
    title: string;
    summary: string;
    url: string;
    source: string;
    category?: string;
    publishedAt?: string;
  }>
): string {
  const news = items.slice(0, 100).map((item, index) => ({
    index: index + 1,
    title: item.title,
    source: item.source,
    category: item.category,
    publishedAt: item.publishedAt,
    summary: item.summary.slice(0, 360),
    url: item.url
  }));

  return `请基于下方公开信号，生成一篇面向企业 AI 落地负责人的视觉决策简报。

日期：${date}
素材窗口：${sourceWindow}

## 输出硬约束
- 只输出一个 JSON 对象。
- panels 必须恰好包含 10 项，不得增加、删除或调换顺序。
- 每一屏的 kind 必须严格匹配下方结构。
- 10 个 panels 是一篇完整文章的内部排版块，不是 10 条并列新闻。
- panels 的 body 合计必须达到 1400-1600 个中文字符。
- 正文必须围绕一个核心判断连续叙事，前后自然衔接，不得写成互不相关的信号列表。
- 素材允许时，核心主线必须综合至少 2 个独立来源，不得只改写单条新闻。
- 标题、摘要和正文必须全部使用简体中文。即使输入素材是英文，也必须先翻译为简体中文。
- 标题必须具体点出本期主线，不得使用“企业 AI 落地信号图”“企业 AI 日报”“本期总标题”这类占位标题。
- kicker 可以保留少量固定英文栏目名，但任何面向读者的信息不得直接照搬英文新闻标题或英文摘要。
- imagePrompt 必须是英文 Seedream 构图描述，不包含可读文字。系统会统一追加复古未来主义杂志风格。
- sourceUrls 只能使用输入素材中的 URL。
- 不复制任何公众号 IP、人物角色或既有文章版式细节。

## 编辑流程
- 先把全部素材按主题、分类标签和语义相似度分类。
- 再从新颖度、企业影响、可执行性三个维度筛选候选簇。
- 选择最值得写的一条主线。素材允许时，主线必须综合至少 2 个独立来源，不得只改写单条新闻。
- 沿用来源去重原则：主线与雷达素材不得重复；本版本不再输出雷达信号列表，而是把素材融合进连续文章。

## 完整文章结构
01-cover：kind 为 "cover"，文章标题和一句摘要。
02-context：kind 为 "context"，导语，解释为什么今天值得关注。
03-news：kind 为 "news"，第一部分“发生了什么”。
04-news：kind 为 "news"，延续第一部分，补充关键事实。
05-news：kind 为 "news"，第二部分“为什么重要”。
06-news：kind 为 "news"，延续第二部分，解释企业影响。
07-news：kind 为 "news"，第三部分“企业应该怎么判断和行动”。
08-news：kind 为 "news"，延续第三部分，给出执行建议。
09-takeaway：kind 为 "takeaway"，总结判断与行动建议。
10-footer：kind 为 "footer"，简短校对提醒和来源说明。

## JSON 结构示例
{
  "title": "智能体安全治理进入生产环境",
  "subtitle": "把公开信号变成可执行判断",
  "panels": [
    {
      "kind": "cover",
      "kicker": "ENTERPRISE AI",
      "title": "智能体安全治理进入生产环境",
      "body": ["一句价值说明"],
      "imagePrompt": "retrofuturistic vector illustration, enterprise AI signal radar, Beige Teal Amber, no readable text",
      "sourceUrls": ["https://example.com/source"]
    }
  ]
}

## 公开信号素材
${JSON.stringify(news, null, 2)}`;
}
