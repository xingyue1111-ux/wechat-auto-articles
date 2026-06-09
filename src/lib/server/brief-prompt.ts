export const BRIEF_SYSTEM_PROMPT = `你是一个中文公众号编辑，定位是“AI 应用与产业信号”。
你的任务不是堆砌新闻，也不是强行只写企业落地，而是把公开 AI 信号转化为一篇有主线、有判断、能帮助读者理解趋势的文章。
优先关注产品进展、模型能力、开源生态、开发者工具、多模态应用、产业动态、商业化变化，以及这些变化对真实应用意味着什么。
只输出合法 JSON，不要输出 Markdown，不要解释，不要添加 JSON 以外的文字。
文字要口语化但克制。输出必须是一篇完整文章的连续叙事。`;

const MAX_BRIEF_SIGNAL_ITEMS = 30;
const MAX_BRIEF_SIGNAL_SUMMARY_LENGTH = 120;

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
  const news = items.slice(0, MAX_BRIEF_SIGNAL_ITEMS).map((item, index) => ({
    index: index + 1,
    title: item.title,
    source: item.source,
    category: item.category,
    publishedAt: item.publishedAt,
    summary: item.summary.slice(0, MAX_BRIEF_SIGNAL_SUMMARY_LENGTH),
    url: item.url
  }));

  return `请基于下方公开信号，生成一篇面向中文读者的 AI 应用与产业观察文章。
日期：${date}
素材窗口：${sourceWindow}

## 输出硬约束
- 只输出一个 JSON 对象。
- 输出紧凑 JSON，不要为了排版添加多余空白、说明文字或重复字段。
- panels 必须恰好包含 10 项，不得增加、删除或调换顺序。
- 每一屏的 kind 必须严格匹配下方结构。
- 10 个 panels 是一篇完整文章的内部排版块，不是 10 条并列新闻。
- 每屏 body 1-2 段即可，避免把同一观点反复展开。
- panels 的 body 合计必须达到 1400-1600 个中文字符。
- 正文必须围绕一个核心判断连续叙事，前后自然衔接，不得写成互不相关的信号列表。
- 素材允许时，核心主线必须综合至少 2 个独立来源，不得只改写单条新闻。
- 不强行只写企业落地，但每篇最后必须说清楚这件事对真实应用意味着什么。
- 标题、摘要和正文必须全部使用简体中文。即使输入素材是英文，也必须先翻译为简体中文。
- 标题必须具体点出本期主线，不得使用“企业 AI 落地信号图”“企业 AI 日报”“AI 应用日报”“AI 产业观察”“本期总标题”这类占位标题。
- 特别注意：不得使用“AI 应用日报”作为标题，必须写出当天具体发生了什么变化。
- kicker 可以保留少量固定英文栏目名，但任何面向读者的信息不得直接照搬英文新闻标题或英文摘要。
- imagePrompt 必须是英文 Seedream 构图描述，不包含可读文字。系统会统一追加复古未来主义杂志风格。
- sourceUrls 只能使用输入素材中的 URL。
- 不复制任何公众号 IP、人物角色或既有文章版式细节。

## 编辑流程
- 先把全部素材按主题、分类标签和语义相似度分类。
- 再从新颖度、应用影响、产业变化、读者可理解性四个维度筛选候选簇。
- 选择最值得写的一条主线。主线可以是模型能力、产品更新、开源项目、开发者工具、研究趋势或商业化变化。
- 素材允许时，主线必须综合至少 2 个独立来源；如果当天只有单一强信号，也要补充它所在的产业背景和应用含义。
- 不再输出雷达信号列表，而是把素材融合进连续文章。

## 完整文章结构
01-cover：kind 为 "cover"，文章标题和一句摘要。
02-context：kind 为 "context"，导语，解释为什么今天值得关注。
03-news：kind 为 "news"，第一部分“发生了什么”。
04-news：kind 为 "news"，延续第一部分，补充关键事实。
05-news：kind 为 "news"，第二部分“为什么重要”。
06-news：kind 为 "news"，延续第二部分，解释应用或产业影响。
07-news：kind 为 "news"，第三部分“接下来应该怎么看”。
08-news：kind 为 "news"，延续第三部分，给出判断框架。
09-takeaway：kind 为 "takeaway"，总结判断与行动建议。
10-footer：kind 为 "footer"，简短校对提醒和来源说明。

## JSON 结构示例
{
  "title": "多模态应用正在从演示走向日常工具",
  "subtitle": "把公开信号变成可理解的应用判断",
  "panels": [
    {
      "kind": "cover",
      "kicker": "AI SIGNAL",
      "title": "多模态应用正在从演示走向日常工具",
      "body": ["一句价值说明"],
      "imagePrompt": "retrofuturistic vector illustration, AI application signal map, Beige Teal Amber, no readable text",
      "sourceUrls": ["https://example.com/source"]
    }
  ]
}

## 公开信号素材
${JSON.stringify(news, null, 2)}`;
}
