import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import type { VisualBriefPanelDraft } from "@/lib/domain/types";
import { loadVisualFonts } from "@/lib/visual-render/fonts";
import type { VisualBriefSheetPlan } from "@/lib/visual-render/sheet-plan";
import { wrapVisualText } from "@/lib/visual-render/typography";

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
    fitTo: { mode: "width", value: plan.width }
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
    <Sheet>
      <Masthead index={plan.index} />
      <div style={{ display: "flex", flexDirection: "column", padding: "30px 58px 0" }}>
        <Kicker>{cover.kicker}</Kicker>
        <h1 style={coverTitleStyle}>
          <WrappedLines text={cover.title} maxUnits={15} />
        </h1>
        <Ornament />
        <LeadText lines={cover.body} />
      </div>
      <EditorialImageFrame src={plan.seedreamImageUrl} height={620} />
      <div style={{ display: "flex", flexDirection: "column", padding: "38px 58px 0" }}>
        <EditorialBlock panel={context} index={1} compact />
      </div>
      <EditorialImageFrame src={plan.accentSeedreamImageUrl ?? plan.seedreamImageUrl} height={300} position="center 56%" />
      <SheetFooter />
    </Sheet>
  );
}

function AnalysisSheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  return (
    <Sheet>
      <Masthead index={plan.index} />
      <SectionIntro kicker="专题拆解" title={plan.title} number="02" />
      <EditorialImageFrame src={plan.seedreamImageUrl} height={540} position="center 48%" />
      <div style={{ display: "flex", flexDirection: "column", padding: "26px 58px 0" }}>
        {plan.panels.map((panel, index) => (
          <EditorialBlock key={`${panel.kind}-${index}`} panel={panel} index={index + 1} />
        ))}
      </div>
      <SheetFooter />
    </Sheet>
  );
}

function RadarSheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  return (
    <Sheet>
      <Masthead index={plan.index} />
      <SectionIntro kicker="信号雷达" title={plan.title} number="03" />
      <EditorialImageFrame src={plan.seedreamImageUrl} height={420} position="center 58%" />
      <div style={{ display: "flex", flexDirection: "column", padding: "26px 58px 0" }}>
        {plan.panels.map((panel, index) => (
          <EditorialBlock key={`${panel.kind}-${index}`} panel={panel} index={index + 1} radar />
        ))}
      </div>
      <SheetFooter />
    </Sheet>
  );
}

function TakeawaySheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  const [takeaway, footer] = plan.panels;
  return (
    <Sheet>
      <Masthead index={plan.index} />
      <SectionIntro kicker="落地判断" title={takeaway.title} number="04" />
      <EditorialImageFrame src={plan.seedreamImageUrl} height={540} position="center 52%" />
      <div style={{ display: "flex", flexDirection: "column", padding: "34px 58px 0" }}>
        <LeadText lines={takeaway.body} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            padding: "30px 34px",
            borderLeft: `12px solid ${AMBER}`,
            borderTop: `2px solid ${INK}`,
            background: PAPER
          }}
        >
          <Kicker>{footer.kicker}</Kicker>
          <span style={{ ...sectionTitleStyle, flexDirection: "column", marginTop: 12, fontSize: 44 }}>
            <WrappedLines text={footer.title} maxUnits={17} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20, paddingRight: 24 }}>
            {footer.body.map((line, index) => (
              <BodyCopy key={index} text={line} maxUnits={27} />
            ))}
          </div>
        </div>
      </div>
      <SheetFooter />
    </Sheet>
  );
}

function Sheet({ children }: { children: ReactNode }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {children}
    </div>
  );
}

function Masthead({ index }: { index: number }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "44px 58px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          paddingBottom: 14,
          borderBottom: `2px solid ${INK}`
        }}
      >
        <span style={{ display: "flex", color: TEAL, fontSize: 23, fontWeight: 700 }}>
          ENTERPRISE AI VISUAL BRIEF
        </span>
        <span style={{ display: "flex", marginLeft: "auto", color: "rgba(23,33,31,0.62)", fontSize: 21 }}>
          {String(index).padStart(2, "0")} / 04
        </span>
      </div>
      <Ornament compact />
    </div>
  );
}

function SectionIntro({ kicker, title, number }: { kicker: string; title: string; number: string }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "28px 58px 24px" }}>
      <Kicker>{kicker}</Kicker>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginTop: 8 }}>
        <span style={{ ...sectionTitleStyle, flexDirection: "column", width: 760, fontSize: 74 }}>
          <WrappedLines text={title} maxUnits={10} />
        </span>
        <span style={{ display: "flex", marginLeft: "auto", color: AMBER, fontFamily: "Noto Serif SC", fontSize: 130, lineHeight: 0.86 }}>
          {number}
        </span>
      </div>
    </div>
  );
}

function EditorialImageFrame({
  src,
  height,
  position = "center center"
}: {
  src: string;
  height: number;
  position?: string;
}): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        width: 964,
        height,
        margin: "18px 58px 0",
        padding: 10,
        border: `2px solid ${INK}`,
        background: PAPER
      }}
    >
      <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
        <EditorialImage src={src} position={position} />
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
  const contentWidth = radar ? 812 : compact ? 848 : 830;
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        padding: compact ? "0 0 14px" : "30px 0 34px",
        borderTop: compact ? "0 solid transparent" : "2px solid rgba(23,33,31,0.2)"
      }}
    >
      <div
        style={{
          display: "flex",
          width: radar ? 110 : 88,
          flexShrink: 0,
          color: AMBER,
          fontFamily: "Noto Serif SC",
          fontSize: radar ? 78 : 66,
          lineHeight: 0.92,
          fontWeight: 700
        }}
      >
        {String(index).padStart(2, "0")}
      </div>
      <div style={{ display: "flex", width: contentWidth, flexShrink: 0, flexDirection: "column", paddingRight: 24 }}>
        <Kicker>{panel.kicker}</Kicker>
        <span style={{ ...sectionTitleStyle, flexDirection: "column", marginTop: 9, fontSize: compact ? 43 : 47 }}>
          <WrappedLines text={panel.title} maxUnits={radar ? 14 : compact ? 16 : 15} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {panel.body.map((line, bodyIndex) => (
            <BodyCopy key={bodyIndex} text={line} maxUnits={radar ? 25 : 26} />
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
        gap: 12,
        paddingLeft: 24,
        paddingRight: 24,
        borderLeft: `10px solid ${TEAL}`
      }}
    >
      {lines.map((line, index) => (
        <BodyCopy key={index} text={line} maxUnits={26} large />
      ))}
    </div>
  );
}

function BodyCopy({ text, maxUnits, large = false }: { text: string; maxUnits: number; large?: boolean }): ReactNode {
  return (
    <p style={{ ...bodyStyle, display: "flex", flexDirection: "column", fontSize: large ? 33 : 28 }}>
      <WrappedLines text={text} maxUnits={maxUnits} />
    </p>
  );
}

function WrappedLines({ text, maxUnits }: { text: string; maxUnits: number }): ReactNode {
  return (
    <span style={{ display: "flex", flexDirection: "column" }}>
      {wrapVisualText(text, maxUnits).map((line, index) => (
        <span key={`${line}-${index}`} style={{ display: "flex" }}>
          {line}
        </span>
      ))}
    </span>
  );
}

function EditorialImage({ src, position }: { src: string; position: string }): ReactNode {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position }} />
  );
}

function Ornament({ compact = false }: { compact?: boolean }): ReactNode {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: compact ? 10 : 20, marginBottom: compact ? 0 : 24 }}>
      <span style={{ display: "flex", width: compact ? 82 : 132, height: 8, background: AMBER }} />
      <span style={{ display: "flex", width: 18, height: 18, border: `3px solid ${TEAL}` }} />
      <span style={{ display: "flex", width: compact ? 210 : 330, height: 3, background: TEAL }} />
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }): ReactNode {
  return (
    <span style={{ display: "flex", color: TEAL, fontSize: 22, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function SheetFooter(): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        margin: "auto 58px 42px",
        paddingTop: 18,
        borderTop: "2px solid rgba(23,33,31,0.2)",
        color: "rgba(23,33,31,0.56)",
        fontSize: 18
      }}
    >
      <span>BEIGE / TEAL / AMBER</span>
      <span>AI HOT + PUBLIC SIGNALS</span>
    </div>
  );
}

const coverTitleStyle = {
  display: "flex",
  flexDirection: "column",
  margin: "8px 0 0",
  maxWidth: 900,
  color: INK,
  fontFamily: "Noto Serif SC",
  fontSize: 84,
  lineHeight: 1.08,
  letterSpacing: 0,
  fontWeight: 700
} as const;

const sectionTitleStyle = {
  display: "flex",
  color: INK,
  fontFamily: "Noto Serif SC",
  fontSize: 58,
  lineHeight: 1.18,
  letterSpacing: 0,
  fontWeight: 700
};

const bodyStyle = {
  margin: 0,
  color: "rgba(23,33,31,0.86)",
  lineHeight: 1.56
};
