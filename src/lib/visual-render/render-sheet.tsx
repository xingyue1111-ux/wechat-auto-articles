import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import { loadVisualFonts } from "@/lib/visual-render/fonts";
import type { VisualBriefPanelDraft } from "@/lib/domain/types";
import type { VisualBriefSheetPlan } from "@/lib/visual-render/sheet-plan";

const TEAL = "#0F766E";
const AMBER = "#D89A2B";
const INK = "#17211F";
const BEIGE = "#F4E8CF";
const PAPER = "#FFFDF8";

export async function renderSheetPng(plan: VisualBriefSheetPlan): Promise<Uint8Array> {
  const svg = await satori(sheetNode(plan), {
    width: plan.width,
    height: plan.height,
    fonts: await loadVisualFonts()
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
        position: "relative",
        overflow: "hidden",
        background: BEIGE,
        color: INK,
        fontFamily: "Noto Sans SC"
      }}
    >
      {plan.variant === "cover" ? <CoverSheet plan={plan} /> : null}
      {plan.variant === "analysis" ? <AnalysisSheet plan={plan} /> : null}
      {plan.variant === "radar" ? <RadarSheet plan={plan} /> : null}
      {plan.variant === "takeaway" ? <TakeawaySheet plan={plan} /> : null}
    </div>
  );
}

function CoverSheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  const [cover, context] = plan.panels;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", position: "relative", height: 950, overflow: "hidden" }}>
        <EditorialImage src={plan.seedreamImageUrl} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(23,33,31,0.14) 0%, rgba(23,33,31,0.1) 44%, rgba(244,232,207,0.98) 100%)"
          }}
        />
        <div style={{ display: "flex", position: "absolute", top: 52, left: 58, right: 58 }}>
          <Header index={plan.index} inverse />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 58,
            right: 58,
            bottom: 50
          }}
        >
          <Kicker>{cover.kicker}</Kicker>
          <h1 style={coverTitleStyle}>{cover.title}</h1>
          <div style={{ display: "flex", width: 160, height: 10, marginTop: 28, background: AMBER }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "34px 58px 48px" }}>
        <LeadText lines={cover.body} />
        <div
          style={{
            display: "flex",
            position: "relative",
            height: 300,
            marginTop: 38,
            overflow: "hidden",
            background: TEAL
          }}
        >
          <EditorialImage src={plan.accentSeedreamImageUrl ?? plan.seedreamImageUrl} position="center 56%" />
          <div
            style={{
              display: "flex",
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, rgba(15,118,110,0.88), rgba(15,118,110,0.14))"
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              left: 38,
              bottom: 32,
              width: 610,
              color: PAPER
            }}
          >
            <span style={{ display: "flex", color: "#F7C768", fontSize: 24, fontWeight: 700 }}>
              TODAY&apos;S CONTEXT
            </span>
            <span
              style={{
                display: "flex",
                marginTop: 12,
                fontFamily: "Noto Serif SC",
                fontSize: 46,
                lineHeight: 1.18,
                fontWeight: 700
              }}
            >
              {context.title}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 36 }}>
          <EditorialBlock panel={context} index={1} compact />
        </div>
        <Footer />
      </div>
    </div>
  );
}

function AnalysisSheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", padding: "56px 58px 28px" }}>
        <Header index={plan.index} />
      </div>
      <div style={{ display: "flex", position: "relative", height: 640, overflow: "hidden" }}>
        <EditorialImage src={plan.seedreamImageUrl} position="center 48%" />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 58,
            bottom: 0,
            width: 570,
            padding: "32px 34px 30px",
            flexDirection: "column",
            background: "rgba(244,232,207,0.95)"
          }}
        >
          <Kicker>FEATURE STORY</Kicker>
          <span style={sectionTitleStyle}>{plan.title}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "42px 58px 48px" }}>
        {plan.panels.map((panel, index) => (
          <EditorialBlock key={`${panel.kind}-${index}`} panel={panel} index={index + 1} />
        ))}
        <Footer />
      </div>
    </div>
  );
}

function RadarSheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", padding: "56px 58px 26px" }}>
        <Header index={plan.index} />
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 42 }}>
          <span style={{ ...sectionTitleStyle, fontSize: 76 }}>{plan.title}</span>
          <span style={{ display: "flex", marginLeft: "auto", color: AMBER, fontSize: 132, lineHeight: 0.82 }}>
            03
          </span>
        </div>
      </div>
      <div style={{ display: "flex", height: 390, overflow: "hidden", borderTop: `12px solid ${TEAL}` }}>
        <EditorialImage src={plan.seedreamImageUrl} position="center 58%" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "40px 58px 48px" }}>
        {plan.panels.map((panel, index) => (
          <EditorialBlock key={`${panel.kind}-${index}`} panel={panel} index={index + 1} radar />
        ))}
        <Footer />
      </div>
    </div>
  );
}

function TakeawaySheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  const [takeaway, footer] = plan.panels;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", padding: "56px 58px 30px" }}>
        <Header index={plan.index} />
      </div>
      <div style={{ display: "flex", position: "relative", height: 650, overflow: "hidden" }}>
        <EditorialImage src={plan.seedreamImageUrl} position="center 52%" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 58,
            right: 58,
            bottom: 0,
            padding: "28px 34px 34px",
            color: PAPER,
            background: "rgba(15,118,110,0.93)"
          }}
        >
          <span style={{ display: "flex", color: "#F7C768", fontSize: 24, fontWeight: 700 }}>
            EXECUTIVE TAKEAWAY
          </span>
          <span
            style={{
              display: "flex",
              marginTop: 10,
              fontFamily: "Noto Serif SC",
              fontSize: 58,
              lineHeight: 1.16,
              fontWeight: 700
            }}
          >
            {takeaway.title}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "40px 58px 48px" }}>
        <LeadText lines={takeaway.body} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            padding: "30px 34px",
            borderLeft: `12px solid ${AMBER}`,
            background: PAPER
          }}
        >
          <Kicker>{footer.kicker}</Kicker>
          <span style={{ ...sectionTitleStyle, marginTop: 12, fontSize: 44 }}>{footer.title}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
            {footer.body.map((line, index) => (
              <p key={index} style={bodyStyle}>
                {line}
              </p>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

function EditorialBlock({
  panel,
  index,
  compact = false,
  radar = false
}: {
  panel: VisualBriefPanelDraft;
  index: number;
  compact?: boolean;
  radar?: boolean;
}): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        padding: compact ? "0 0 8px" : "34px 0 38px",
        borderTop: compact ? "0 solid transparent" : "2px solid rgba(23,33,31,0.2)"
      }}
    >
      <div
        style={{
          display: "flex",
          width: radar ? 116 : 98,
          flexShrink: 0,
          color: AMBER,
          fontFamily: "Noto Serif SC",
          fontSize: radar ? 80 : 68,
          lineHeight: 0.92,
          fontWeight: 700
        }}
      >
        {String(index).padStart(2, "0")}
      </div>
      <div style={{ display: "flex", minWidth: 0, flexDirection: "column" }}>
        <Kicker>{panel.kicker}</Kicker>
        <span style={{ ...sectionTitleStyle, marginTop: 10, fontSize: compact ? 45 : 49 }}>
          {panel.title}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
          {panel.body.map((line, bodyIndex) => (
            <p key={bodyIndex} style={bodyStyle}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadText({ lines }: { lines: string[] }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingLeft: 26,
        borderLeft: `10px solid ${TEAL}`
      }}
    >
      {lines.map((line, index) => (
        <p key={index} style={{ ...bodyStyle, fontSize: 34, lineHeight: 1.52 }}>
          {line}
        </p>
      ))}
    </div>
  );
}

function EditorialImage({ src, position = "center center" }: { src: string; position?: string }): ReactNode {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position }} />
  );
}

function Header({ index, inverse = false }: { index: number; inverse?: boolean }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        paddingBottom: 16,
        borderBottom: `2px solid ${inverse ? "rgba(255,253,248,0.62)" : "rgba(23,33,31,0.22)"}`
      }}
    >
      <span style={{ display: "flex", color: inverse ? PAPER : TEAL, fontSize: 24, fontWeight: 700 }}>
        ENTERPRISE AI VISUAL BRIEF
      </span>
      <span style={{ display: "flex", marginLeft: "auto", color: inverse ? PAPER : "rgba(23,33,31,0.62)", fontSize: 22 }}>
        {String(index).padStart(2, "0")} / 04
      </span>
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }): ReactNode {
  return (
    <span style={{ display: "flex", color: TEAL, fontSize: 23, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function Footer(): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "auto",
        paddingTop: 22,
        borderTop: "2px solid rgba(23,33,31,0.2)",
        color: "rgba(23,33,31,0.56)",
        fontSize: 19
      }}
    >
      <span>BEIGE / TEAL / AMBER</span>
      <span>AI HOT + PUBLIC SIGNALS</span>
    </div>
  );
}

const coverTitleStyle = {
  margin: 0,
  maxWidth: 900,
  color: PAPER,
  fontFamily: "Noto Serif SC",
  fontSize: 86,
  lineHeight: 1.08,
  letterSpacing: 0,
  fontWeight: 700
};

const sectionTitleStyle = {
  display: "flex",
  color: INK,
  fontFamily: "Noto Serif SC",
  fontSize: 60,
  lineHeight: 1.18,
  letterSpacing: 0,
  fontWeight: 700
};

const bodyStyle = {
  margin: 0,
  color: "rgba(23,33,31,0.86)",
  fontSize: 29,
  lineHeight: 1.52
};
