"use client";

import { useRef, useState } from "react";
import type { VisualBriefManifest } from "@/lib/domain/types";

export function WechatPublishingWorkbench({
  manifest,
  html
}: {
  manifest: VisualBriefManifest;
  html: string;
}) {
  const previewRef = useRef<HTMLElement>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  async function copyWechatArticle() {
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([previewRef.current?.innerText ?? ""], { type: "text/plain" })
          })
        ]);
      } else {
        copyRenderedPreview(previewRef.current);
      }
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <main className="publishing-page">
      <header className="publishing-header">
        <div>
          <p className="eyebrow">WeChat Publishing Workbench</p>
          <h1>{manifest.title}</h1>
          <p className="muted">复制正文后粘贴到公众号编辑器，再手动上传 4 张配图，避免公众号发布后外链图片消失。</p>
        </div>
        <a className="button secondary" href="/admin">返回生成台</a>
      </header>

      <section className="publishing-actions">
        <button type="button" onClick={copyWechatArticle}>一键复制公众号正文</button>
        <a className="button secondary" href={`/article/${manifest.date}`}>查看备用长图</a>
        {copyStatus === "success" ? <p className="form-note">已复制。请粘贴到公众号编辑器，并按正文中的占位提示手动上传 4 张配图。</p> : null}
        {copyStatus === "error" ? <p className="form-error">复制失败。请手动选择下方预览内容复制。</p> : null}
      </section>

      <section className="publishing-layout">
        <article
          className="wechat-article-preview"
          ref={previewRef}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <aside className="publishing-assets">
          <h2>Seedream 配图</h2>
          {(manifest.illustrations ?? []).map((image) => (
            <a
              className="button secondary compact"
              href={image.imageUrl}
              download={`wechat-${manifest.date}-image-${String(image.index).padStart(2, "0")}.png`}
              target="_blank"
              rel="noreferrer"
              key={image.index}
            >
              下载图 {image.index}
            </a>
          ))}
          <h2>备用长图</h2>
          {manifest.panels.map((panel) => (
            <a className="button secondary compact" href={panel.imageUrl} target="_blank" rel="noreferrer" key={panel.index}>
              打开长图 {panel.index}
            </a>
          ))}
        </aside>
      </section>
    </main>
  );
}

function copyRenderedPreview(preview: HTMLElement | null) {
  if (!preview) throw new Error("文章预览不存在");
  const range = document.createRange();
  range.selectNodeContents(preview);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  if (!copied) throw new Error("浏览器拒绝复制");
}
