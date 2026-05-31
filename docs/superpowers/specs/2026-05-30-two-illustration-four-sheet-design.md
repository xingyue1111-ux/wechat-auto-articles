# Two-Illustration Four-Sheet Visual Brief Design

## Goal

Reduce Seedream cost and Vercel execution time while preserving the fixed ten-panel editorial structure.

## Output Model

DeepSeek still produces exactly ten editorial panels:

1. Cover
2. Context
3. Why the main thread matters
4. Workflow impact
5. Recommended action
6. Radar signal 01
7. Radar signal 02
8. Radar signal 03
9. Enterprise AI takeaway
10. Footer

The rendering layer groups them into four WeChat-ready long images:

| Sheet | Included panels | Purpose |
| --- | --- | --- |
| 1 | 1-2 | Cover and context |
| 2 | 3-5 | Main-thread analysis |
| 3 | 6-8 | Radar signals |
| 4 | 9-10 | Takeaway and footer |

Each output image is 1080 pixels wide. The height is derived from its grouped content and remains suitable for vertical mobile reading.

## Seedream Budget

Seedream generates only two text-free illustrations:

1. Cover visual
2. Body visual

The cover visual is used on sheet 1. The body visual is reused on sheets 2-4 with layout variation. Text, headings, hierarchy, and spacing are rendered by the application with Satori and Resvg.

## Render Data Flow

1. Generate two Seedream illustrations.
2. Download each illustration once.
3. Upload the original illustration to Vercel Blob.
4. Keep an in-memory data URL for rendering.
5. Render four long-image sheets without downloading Blob images again.
6. Upload the four PNG sheets and write the article manifest.

If one illustration cannot be downloaded, rendering uses a local SVG placeholder. The article still completes.

## Manifest

The public manifest contains four rendered sheet images, not the ten internal editorial panels. The page continues to render only the ordered image list.

## Verification

- Seedream prompt selection returns exactly two prompts.
- Ten editorial panels always map to four ordered sheets.
- Downloaded illustration bytes are used directly during rendering.
- Failed illustration download falls back to a local data URL.
- Manifest validates four output sheets.
- Local end-to-end generation finishes with four rendered PNG images.
