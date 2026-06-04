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
const BODY_COPY_FONT_SIZE = 40;
const BODY_COPY_LARGE_FONT_SIZE = 44;
type SheetTheme = VisualBriefSheetPlan["theme"];

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
        background: plan.theme.background ?? BEIGE,
        color: plan.theme.ink ?? INK,
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
      <Masthead index={plan.index} theme={plan.theme} />
      <div style={{ display: "flex", flexDirection: "column", padding: "30px 58px 0" }}>
        <Kicker theme={plan.theme}>{cover.kicker}</Kicker>
        <h1 style={coverTitleStyle(plan.theme)}>
          <WrappedLines text={cover.title} maxUnits={20} />
        </h1>
        <Ornament theme={plan.theme} />
        <LeadText lines={cover.body} theme={plan.theme} />
      </div>
      <EditorialImageFrame src={plan.seedreamImageUrl} height={424} theme={plan.theme} />
      <div style={{ display: "flex", flexDirection: "column", padding: "38px 58px 0" }}>
        <EditorialBlock panel={context} index={plan.panelNumbers[1] + 1} theme={plan.theme} compact />
      </div>
      <SheetFooter theme={plan.theme} />
    </Sheet>
  );
}

function AnalysisSheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  return (
    <Sheet>
      <Masthead index={plan.index} theme={plan.theme} />
      <SectionIntro kicker="专题拆解" title={plan.title} number="02" theme={plan.theme} />
      <EditorialImageFrame src={plan.seedreamImageUrl} height={424} position="center 48%" theme={plan.theme} />
      <div style={{ display: "flex", flexDirection: "column", padding: "26px 58px 0" }}>
        {plan.panels.map((panel, index) => (
          <EditorialBlock key={`${panel.kind}-${index}`} panel={panel} index={plan.panelNumbers[index] + 1} theme={plan.theme} />
        ))}
      </div>
      <SheetFooter theme={plan.theme} />
    </Sheet>
  );
}

function RadarSheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  return (
    <Sheet>
      <Masthead index={plan.index} theme={plan.theme} />
      <SectionIntro kicker="信号雷达" title={plan.title} number="03" theme={plan.theme} />
      <EditorialImageFrame src={plan.seedreamImageUrl} height={424} position="center 58%" theme={plan.theme} />
      <div style={{ display: "flex", flexDirection: "column", padding: "26px 58px 0" }}>
        {plan.panels.map((panel, index) => (
          <EditorialBlock key={`${panel.kind}-${index}`} panel={panel} index={plan.panelNumbers[index] + 1} theme={plan.theme} radar />
        ))}
      </div>
      <SheetFooter theme={plan.theme} />
    </Sheet>
  );
}

function TakeawaySheet({ plan }: { plan: VisualBriefSheetPlan }): ReactNode {
  const [takeaway, footer] = plan.panels;
  return (
    <Sheet>
      <Masthead index={plan.index} theme={plan.theme} />
      <SectionIntro kicker="落地判断" title={takeaway.title} number="04" theme={plan.theme} />
      <EditorialImageFrame src={plan.seedreamImageUrl} height={424} position="center 52%" theme={plan.theme} />
      <div style={{ display: "flex", flexDirection: "column", padding: "34px 58px 0" }}>
        <LeadText lines={takeaway.body} theme={plan.theme} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            padding: "30px 34px",
            borderLeft: `12px solid ${plan.theme.amber ?? AMBER}`,
            borderTop: `2px solid ${plan.theme.ink ?? INK}`,
            background: plan.theme.paper ?? PAPER
          }}
        >
          <Kicker theme={plan.theme}>{footer.kicker}</Kicker>
          <span style={{ ...sectionTitleStyle(plan.theme), flexDirection: "column", marginTop: 12, fontSize: 44 }}>
            <WrappedLines text={footer.title} maxUnits={17} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20, paddingRight: 24 }}>
            {footer.body.map((line, index) => (
              <BodyCopy key={index} text={line} maxUnits={20} theme={plan.theme} />
            ))}
          </div>
        </div>
      </div>
      <SheetFooter theme={plan.theme} />
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

function Masthead({ index, theme }: { index: number; theme: SheetTheme }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "44px 58px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          paddingBottom: 14,
          borderBottom: `2px solid ${theme.ink ?? INK}`
        }}
      >
        <span style={{ display: "flex", color: theme.teal ?? TEAL, fontSize: 23, fontWeight: 700 }}>
          ENTERPRISE AI VISUAL BRIEF
        </span>
        <span style={{ display: "flex", marginLeft: "auto", color: colorWithAlpha(theme.ink ?? INK, 0.62), fontSize: 21 }}>
          {String(index).padStart(2, "0")} / 04
        </span>
      </div>
      <Ornament theme={theme} compact />
    </div>
  );
}

function SectionIntro({ kicker, title, number, theme }: { kicker: string; title: string; number: string; theme: SheetTheme }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "28px 58px 24px" }}>
      <Kicker theme={theme}>{kicker}</Kicker>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginTop: 8 }}>
        <span style={{ ...sectionTitleStyle(theme), flexDirection: "column", width: 760, fontSize: 74 }}>
          <WrappedLines text={title} maxUnits={10} />
        </span>
        <span style={{ display: "flex", marginLeft: "auto", color: theme.amber ?? AMBER, fontFamily: "Noto Serif SC", fontSize: 130, lineHeight: 0.86 }}>
          {number}
        </span>
      </div>
    </div>
  );
}

function EditorialImageFrame({
  src,
  height,
  theme,
  position = "center center"
}: {
  src: string;
  height: number;
  theme: SheetTheme;
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
        border: `2px solid ${theme.ink ?? INK}`,
        background: theme.paper ?? PAPER
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
  theme,
  compact = false,
  radar = false
}: {
  panel: VisualBriefPanelDraft;
  index: number;
  theme: SheetTheme;
  compact?: boolean;
  radar?: boolean;
}): ReactNode {
  const contentWidth = radar ? 842 : 864;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: compact ? "0 0 14px" : "30px 0 34px",
        borderTop: compact ? "0 solid transparent" : `2px solid ${colorWithAlpha(theme.ink ?? INK, 0.2)}`
      }}
    >
      <div
        style={{
          display: "flex",
          width: radar ? 110 : 88,
          flexShrink: 0,
          color: theme.amber ?? AMBER,
          fontFamily: "Noto Serif SC",
          fontSize: radar ? 78 : 66,
          lineHeight: 0.92,
          fontWeight: 700
        }}
      >
        {String(index).padStart(2, "0")}
      </div>
      <div style={{ display: "flex", width: contentWidth, flexShrink: 0, flexDirection: "column", paddingRight: 12 }}>
        <Kicker theme={theme}>{panel.kicker}</Kicker>
        <span style={{ ...sectionTitleStyle(theme), flexDirection: "column", marginTop: 9, fontSize: compact ? 43 : 47 }}>
          <WrappedLines text={panel.title} maxUnits={radar ? 15 : compact ? 17 : 16} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {panel.body.map((line, bodyIndex) => (
            <BodyCopy key={bodyIndex} text={line} maxUnits={radar ? 20 : 21} theme={theme} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadText({ lines, theme }: { lines: string[]; theme: SheetTheme }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingLeft: 24,
        paddingRight: 24,
        borderLeft: `10px solid ${theme.teal ?? TEAL}`
      }}
    >
      {lines.map((line, index) => (
        <BodyCopy key={index} text={line} maxUnits={20} theme={theme} large />
      ))}
    </div>
  );
}

function BodyCopy({ text, maxUnits, theme, large = false }: { text: string; maxUnits: number; theme: SheetTheme; large?: boolean }): ReactNode {
  return (
    <p style={{ ...bodyStyle(theme), display: "flex", flexDirection: "column", fontSize: large ? BODY_COPY_LARGE_FONT_SIZE : BODY_COPY_FONT_SIZE }}>
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
    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: position }} />
  );
}

function Ornament({ theme, compact = false }: { theme: SheetTheme; compact?: boolean }): ReactNode {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: compact ? 10 : 20, marginBottom: compact ? 0 : 24 }}>
      <span style={{ display: "flex", width: compact ? 82 : 132, height: 8, background: theme.amber ?? AMBER }} />
      <span style={{ display: "flex", width: 18, height: 18, border: `3px solid ${theme.teal ?? TEAL}` }} />
      <span style={{ display: "flex", width: compact ? 210 : 330, height: 3, background: theme.teal ?? TEAL }} />
    </div>
  );
}

function Kicker({ children, theme }: { children: ReactNode; theme: SheetTheme }): ReactNode {
  return (
    <span style={{ display: "flex", color: theme.teal ?? TEAL, fontSize: 22, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function SheetFooter({ theme }: { theme: SheetTheme }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        margin: "auto 58px 42px",
        paddingTop: 18,
        borderTop: `2px solid ${colorWithAlpha(theme.ink ?? INK, 0.2)}`,
        color: colorWithAlpha(theme.ink ?? INK, 0.56),
        fontSize: 18
      }}
    >
      <span>BEIGE / TEAL / AMBER</span>
      <span>AI HOT + PUBLIC SIGNALS</span>
    </div>
  );
}

function coverTitleStyle(theme: SheetTheme) {
  return {
    display: "flex",
    flexDirection: "column",
    margin: "8px 0 0",
    maxWidth: 900,
    color: theme.ink ?? INK,
    fontFamily: "Noto Serif SC",
    fontSize: 84,
    lineHeight: 1.08,
    letterSpacing: 0,
    fontWeight: 700
  } as const;
}

function sectionTitleStyle(theme: SheetTheme) {
  return {
    display: "flex",
    color: theme.ink ?? INK,
    fontFamily: "Noto Serif SC",
    fontSize: 58,
    lineHeight: 1.18,
    letterSpacing: 0,
    fontWeight: 700
  };
}

function bodyStyle(theme: SheetTheme) {
  return {
    margin: 0,
    color: colorWithAlpha(theme.ink ?? INK, 0.86),
    lineHeight: 1.48
  };
}

function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}
