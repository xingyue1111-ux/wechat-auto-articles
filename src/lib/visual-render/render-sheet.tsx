import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import type { VisualBriefSheetPlan } from "@/lib/visual-render/sheet-plan";

let fontCache: ArrayBuffer | null = null;

export async function renderSheetPng(plan: VisualBriefSheetPlan): Promise<Uint8Array> {
  const svg = await satori(sheetNode(plan), {
    width: plan.width,
    height: plan.height,
    fonts: [
      {
        name: "Noto Sans SC",
        data: await loadFont(),
        weight: 400,
        style: "normal"
      }
    ]
  });
  return new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: plan.width
    }
  })
    .render()
    .asPng();
}

function sheetNode(plan: VisualBriefSheetPlan): ReactNode {
  return (
    <div
      style={{
        width: plan.width,
        height: plan.height,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: plan.theme.background,
        color: plan.theme.ink,
        fontFamily: "Noto Sans SC",
        padding: "68px 64px 56px"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "3px solid rgba(23,33,31,0.18)",
          paddingBottom: 26,
          marginBottom: 34
        }}
      >
        <span style={{ display: "flex", color: "#0F766E", fontSize: 28, fontWeight: 700 }}>
          ENTERPRISE AI VISUAL BRIEF
        </span>
        <span style={{ display: "flex", color: "rgba(23,33,31,0.58)", fontSize: 24 }}>
          {String(plan.index).padStart(2, "0")} / 04
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginBottom: 34
        }}
      >
        <span style={{ display: "flex", color: "#D89A2B", fontSize: 28, fontWeight: 700 }}>
          {plan.title}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          height: plan.index === 1 ? 610 : 460,
          border: "3px solid rgba(23,33,31,0.78)",
          borderRadius: 24,
          padding: 16,
          marginBottom: 44,
          background: "rgba(255,253,248,0.72)"
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plan.seedreamImageUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 14
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {plan.panels.map((panel, index) => (
          <div
            key={`${panel.kind}-${index}`}
            style={{
              display: "flex",
              flexDirection: "column",
              borderTop: index === 0 ? "0 solid transparent" : "2px solid rgba(23,33,31,0.16)",
              paddingTop: index === 0 ? 0 : 34
            }}
          >
            <span
              style={{
                display: "flex",
                marginBottom: 14,
                color: "#0F766E",
                fontSize: 25,
                fontWeight: 700
              }}
            >
              {panel.kicker}
            </span>
            <h1
              style={{
                margin: 0,
                fontSize: plan.index === 1 && index === 0 ? 68 : 49,
                lineHeight: 1.14,
                letterSpacing: 0,
                fontWeight: 700
              }}
            >
              {panel.title}
            </h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              {panel.body.map((line, bodyIndex) => (
                <p
                  key={bodyIndex}
                  style={{
                    margin: 0,
                    color: "rgba(23,33,31,0.84)",
                    fontSize: 30,
                    lineHeight: 1.48
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
          paddingTop: 26,
          borderTop: "2px solid rgba(23,33,31,0.18)",
          color: "rgba(23,33,31,0.58)",
          fontSize: 20
        }}
      >
        <span>BEIGE / TEAL / AMBER</span>
        <span>AI HOT + PUBLIC SIGNALS</span>
      </div>
    </div>
  );
}

async function loadFont(): Promise<ArrayBuffer> {
  if (!fontCache) {
    const fontPath = path.join(
      process.cwd(),
      "node_modules",
      "@fontsource",
      "noto-sans-sc",
      "files",
      "noto-sans-sc-113-400-normal.woff"
    );
    const data = await readFile(fontPath);
    fontCache = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  return fontCache;
}
