export const BRIEF_SYSTEM_PROMPT = `你是一个面向企业 AI 落地负责人的中文公众号视觉简报编辑。
你的任务不是堆砌新闻，而是把公开信号转化为可执行判断。
只输出合法 JSON，不要输出 Markdown，不要解释，不要添加 JSON 以外的文字。
优先关注 Agent 生产力、Harness Engineering、流程治理、权限、安全、成本和组织协作。
文字要口语化但克制。每屏只表达一个观点。`;

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
- 主线与雷达素材不得重复：03-05 围绕同一条最重要主线展开，06-08 使用不同的补充信号。
- 标题、摘要和正文必须全部使用简体中文。即使输入素材是英文，也必须先翻译为简体中文。
- kicker 可以保留少量固定英文栏目名，但任何面向读者的信息不得直接照搬英文新闻标题或英文摘要。
- body 每屏包含 1-3 句短文案，每句尽量少于 55 个汉字。
- imagePrompt 必须是英文 Seedream 构图描述，不包含可读文字。系统会统一追加复古未来主义杂志风格。
- sourceUrls 只能使用输入素材中的 URL。
- 不复制任何公众号 IP、人物角色或既有文章版式细节。

## 编辑流程
- 先把全部素材按主题、分类标签和语义相似度分类。
- 再从新颖度、企业影响、可执行性三个维度筛选候选簇。
- 选择最值得写的一条主线。素材允许时，主线必须综合至少 2 个独立来源，不得只改写单条新闻。
- 雷达信号优先选择不同来源、不同分类的补充信息，避免连续两期重复同一个角度。

## 固定 10 屏结构
01-cover：kind 为 "cover"，一句总标题和本期价值。
02-context：kind 为 "context"，提炼今天最重要的企业 AI 主线。
03-news：kind 为 "news"，解释为什么这条主线值得关注。
04-news：kind 为 "news"，解释它会怎样影响企业工作流。
05-news：kind 为 "news"，给出企业现在可以采取的动作。
06-news：kind 为 "news"，雷达信号 01。
07-news：kind 为 "news"，雷达信号 02。
08-news：kind 为 "news"，雷达信号 03。
09-takeaway：kind 为 "takeaway"，给企业 AI 落地人的判断。
10-footer：kind 为 "footer"，结尾与校对提醒。

## JSON 结构示例
{
  "title": "企业 AI 落地信号图",
  "subtitle": "把公开信号变成可执行判断",
  "panels": [
    {
      "kind": "cover",
      "kicker": "ENTERPRISE AI",
      "title": "本期总标题",
      "body": ["一句价值说明"],
      "imagePrompt": "retrofuturistic vector illustration, enterprise AI signal radar, Beige Teal Amber, no readable text",
      "sourceUrls": ["https://example.com/source"]
    }
  ]
}

## 公开信号素材
${JSON.stringify(news, null, 2)}`;
}
