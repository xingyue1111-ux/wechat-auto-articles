import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import { loadVisualFonts } from "@/lib/visual-render/fonts";
import type { PanelRenderPlan } from "@/lib/visual-render/render-plan";

export async function renderPanelPng(plan: PanelRenderPlan): Promise<Uint8Array> {
  const svg = await satori(panelNode(plan), {
    width: plan.width,
    height: plan.height,
    fonts: await loadVisualFonts()
  });
  const png = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: plan.width
    }
  })
    .render()
    .asPng();
  return png;
}

function panelNode(plan: PanelRenderPlan): ReactNode {
  const isCover = plan.kind === "cover";
  const isFooter = plan.kind === "footer";

  return (
    <div
      style={{
        width: plan.width,
        height: plan.height,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: plan.theme.background,
        color: plan.theme.ink,
        fontFamily: "Noto Sans SC"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(135deg, rgba(15,118,110,0.18), rgba(244,232,207,0.8) 42%, rgba(216,154,43,0.22))"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -180,
          top: -120,
          width: 520,
          height: 520,
          borderRadius: 260,
          border: "3px solid rgba(15,118,110,0.22)"
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -120,
          bottom: -150,
          width: 520,
          height: 520,
          borderRadius: 260,
          border: "3px solid rgba(216,154,43,0.25)"
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "82px 72px 62px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 42
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "#0F766E",
              fontSize: 30,
              fontWeight: 700
            }}
          >
            <span
              style={{
                display: "flex",
                width: 18,
                height: 18,
                borderRadius: 9,
                background: "#D89A2B"
              }}
            />
            {plan.kicker}
          </div>
          <div style={{ display: "flex", color: "rgba(23,33,31,0.58)", fontSize: 24 }}>
            {String(plan.index).padStart(2, "0")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isCover || isFooter ? "column" : "row",
            gap: 42,
            flex: 1,
            minHeight: 0
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: isCover || isFooter ? "0 0 auto" : "1 1 0",
              minWidth: 0
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: isCover ? 88 : 62,
                lineHeight: 1.08,
                letterSpacing: 0,
                fontWeight: 700
              }}
            >
              {plan.title}
            </h1>
            <div
              style={{
                display: "flex",
                width: 96,
                height: 8,
                background: "#0F766E",
                marginTop: 30,
                marginBottom: 32
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {plan.body.map((line, index) => (
                <p
                  key={index}
                  style={{
                    margin: 0,
                    fontSize: isCover ? 36 : 34,
                    lineHeight: 1.48,
                    color: "rgba(23,33,31,0.86)"
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: isCover || isFooter ? "100%" : 390,
              minHeight: isCover || isFooter ? 520 : 660,
              border: "3px solid rgba(23,33,31,0.78)",
              borderRadius: 28,
              padding: 18,
              background: "rgba(255,253,248,0.72)",
              boxShadow: "18px 18px 0 rgba(15,118,110,0.18)"
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
                borderRadius: 18
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 46,
            paddingTop: 28,
            borderTop: "2px solid rgba(23,33,31,0.18)",
            color: "rgba(23,33,31,0.58)",
            fontSize: 22
          }}
        >
          <span>AI HOT VISUAL BRIEF</span>
          <span>BEIGE / TEAL / AMBER</span>
        </div>
      </div>
    </div>
  );
}
