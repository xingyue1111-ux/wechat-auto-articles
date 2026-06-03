export type NormalizedContentItem = {
  id?: string;
  externalId?: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  category: string;
  tags: string[];
  publishedAt: string;
  contentHash: string;
};

export type SourceWindow = "24h" | "7d";

export type VisualPanelKind = "cover" | "context" | "news" | "takeaway" | "footer";

export type VisualBriefPanelDraft = {
  kind: VisualPanelKind;
  title: string;
  kicker: string;
  body: string[];
  imagePrompt: string;
  sourceUrls: string[];
};

export type VisualBriefDraft = {
  date: string;
  title: string;
  subtitle: string;
  sourceWindow: SourceWindow;
  panels: VisualBriefPanelDraft[];
};

export type ArchivedVisualBriefPanel = Pick<
  VisualBriefPanelDraft,
  "kind" | "kicker" | "title" | "body" | "sourceUrls"
>;

export type VisualBriefManifest = {
  date: string;
  revision?: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  sourceWindow: SourceWindow;
  coverImageUrl?: string;
  generation?: {
    contentMode: "deepseek" | "fallback";
    deepseekAttempts: number;
    degradationReason?: string;
    candidateCount: number;
    sourceStats: Array<{
      id: string;
      label: string;
      count: number;
    }>;
    excludedPreviousUrls: string[];
    selectedSourceUrls: string[];
    candidatePool: Array<Pick<
      NormalizedContentItem,
      "title" | "url" | "source" | "category" | "publishedAt"
    >>;
  };
  article?: {
    panels: ArchivedVisualBriefPanel[];
  };
  illustrations?: Array<{
    index: number;
    imageUrl: string;
  }>;
  panels: Array<{
    index: number;
    kind: VisualPanelKind;
    title: string;
    imageUrl: string;
    width: 1080;
    height: number;
    sourceUrls: string[];
  }>;
};

export type LatestManifestPointer = {
  date: string;
  manifestUrl?: string;
  updatedAt: string;
};
