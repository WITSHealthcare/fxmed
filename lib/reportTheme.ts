// Typography and page geometry for every generated FXMed document.
//
// Reports leave the app through two pipelines: html2canvas rasterisation for
// the PDF downloads, and the browser print dialog for documents opened in a
// new tab. The two resolve CSS lengths differently, so sharing a px scale is
// not enough on its own — the same 13px prints about 13% larger than it
// rasterises, and a document wider than the printable box is silently shrunk
// to fit on top of that, by an amount that varies with the content. The scale
// is therefore declared once here and converted per pipeline, so a token means
// the same physical size on paper whichever route the document takes.

export const REPORT_PAGE = {
  /** Content width of the offscreen render container, in CSS px. */
  contentWidthPx: 800,
  /** Padding on each edge of that container — the printed page margin. */
  marginPx: 48,
  a4WidthMm: 210,
  a4HeightMm: 297,
  /** html2canvas capture scale: 2 ≈ 192 DPI at A4, crisp for print. */
  renderScale: 2,
  // JPEG rather than PNG for full-page renders of text on coloured cards: a
  // fraction of the size with no perceptible loss, and jsPDF stores it
  // directly (DCTDecode) instead of re-deflating raw pixels.
  jpegQuality: 0.95,
} as const

/** Captured width — content plus both margins — mapped onto the A4 width. */
export const REPORT_CAPTURE_WIDTH_PX =
  REPORT_PAGE.contentWidthPx + REPORT_PAGE.marginPx * 2

/** How much of the A4 sheet one px of the render container covers. */
export const MM_PER_PX = REPORT_PAGE.a4WidthMm / REPORT_CAPTURE_WIDTH_PX

export const REPORT_INK = '#0f2419'
export const REPORT_ACCENT = '#cade68'
export const REPORT_FONT = "'DM Sans', Arial, Helvetica, sans-serif"

// The one type scale, in render-container px. Tokens name the role the text
// plays rather than a size, so every document agrees on how big a section
// heading or a field label is without anyone having to remember the number.
export const REPORT_TYPE = {
  title: 29, // document H1
  subtitle: 14, // the line beneath the H1
  section: 17, // H2 / section heading
  subsection: 14, // H3
  value: 15, // patient field value, test name
  body: 13, // paragraphs and list items
  fine: 12, // table cells and other dense small print
  label: 11, // uppercase field label
  footer: 11,
  badge: 11, // the "Confidential medical document" pill
  micro: 10, // remarks, flag pills, the generated-on line
  stamp: 19, // partner verification mark
  glyph: 44, // the ℞ symbol
} as const

export type ReportTypeToken = keyof typeof REPORT_TYPE

export const REPORT_LEADING = {
  body: 1.7,
  tight: 1.5,
  table: 1.45,
  footer: 1.6,
} as const

const mm = (px: number) => `${Number((px * MM_PER_PX).toFixed(3))}mm`

/** Size for documents captured by html2canvas at the container width. */
export const pdfType = (token: ReportTypeToken) => `${REPORT_TYPE[token]}px`

/**
 * Size for documents handed to the browser's print dialog. Physical units,
 * because a CSS px prints at 1/96in — larger than the same px captured into
 * the A4-wide render container.
 */
export const printType = (token: ReportTypeToken) => mm(REPORT_TYPE[token])

/**
 * Page rules for the print pipeline. The body is sized to the exact printable
 * width so the browser has no reason to shrink-to-fit, and the margin matches
 * the render container's padding so the two pipelines lay out on the same grid.
 */
export function reportPrintCss() {
  // Printed documents open from a blob URL and so inherit none of the app's
  // styles. Pulling the same Google Fonts stylesheet app/globals.css uses
  // (identical URL, so it comes from cache) gives them the same face — and
  // therefore the same metrics — as the rasterised PDFs.
  return `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');
    @page{size:A4;margin:${mm(REPORT_PAGE.marginPx)}}
    html,body{margin:0;padding:0}
    body{width:${mm(REPORT_PAGE.contentWidthPx)};margin:0 auto;font-family:${REPORT_FONT};color:${REPORT_INK};font-size:${printType('body')};line-height:${REPORT_LEADING.body};-webkit-print-color-adjust:exact;print-color-adjust:exact}`
}
