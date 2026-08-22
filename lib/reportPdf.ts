// The rasterising half of the report pipeline: HTML in, A4 PDF out.
//
// Every PDF report shares this renderer so that one captured pixel always
// covers the same amount of paper. That is what keeps type the same size from
// one document to the next — see lib/reportTheme.ts for the scale itself.

import { REPORT_FONT, REPORT_PAGE } from './reportTheme'

/** The offscreen sheet each report page is laid out in before capture. */
export function createReportContainer(innerHtml: string) {
  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'absolute',
    left: '-9999px',
    top: '0',
    width: `${REPORT_PAGE.contentWidthPx}px`,
    padding: `${REPORT_PAGE.marginPx}px`,
    backgroundColor: '#ffffff',
    fontFamily: REPORT_FONT,
  })
  container.innerHTML = innerHtml
  return container
}

export function waitForImages(root: HTMLElement) {
  return Promise.all(
    Array.from(root.querySelectorAll('img')).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
    )
  )
}

/** A horizontal band of the captured page, on its own white canvas. */
function sliceCanvas(source: HTMLCanvasElement, top: number, height: number) {
  const slice = document.createElement('canvas')
  slice.width = source.width
  slice.height = height
  const context = slice.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, slice.width, slice.height)
  context.drawImage(source, 0, top, source.width, height, 0, 0, source.width, height)
  return slice
}

// A page whose content stops just short of the sheet edge can still leave a
// sliver of trailing background, which would otherwise be emitted as a blank
// sheet. Sampling a sparse grid is enough to tell an empty band from one that
// carries so much as a rule or a footer line.
function isBlank(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) return false
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const step = 4 * 8 // every 8th pixel
  for (let i = 0; i < data.length; i += step) {
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return false
  }
  return true
}

/**
 * Renders one A4 PDF from pre-paginated page HTML. Content taller than the
 * sheet flows onto the next one rather than being scaled or squashed to fit,
 * so a crowded page prints at the same type size as a short one.
 */
export async function renderReportPdf(pageHtmls: string[]): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default
  const { default: jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  let pageAdded = false

  for (const html of pageHtmls) {
    const container = createReportContainer(html)
    document.body.appendChild(container)

    try {
      await waitForImages(container)

      const canvas = await html2canvas(container, {
        scale: REPORT_PAGE.renderScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      })

      const mmPerCapturedPx = REPORT_PAGE.a4WidthMm / canvas.width
      const sheetHeightPx = Math.floor(REPORT_PAGE.a4HeightMm / mmPerCapturedPx)

      for (let top = 0; top < canvas.height; top += sheetHeightPx) {
        const height = Math.min(sheetHeightPx, canvas.height - top)
        const slice = sliceCanvas(canvas, top, height)
        if (top > 0 && isBlank(slice)) continue

        if (pageAdded) pdf.addPage()
        pageAdded = true
        pdf.addImage(
          slice.toDataURL('image/jpeg', REPORT_PAGE.jpegQuality),
          'JPEG',
          0,
          0,
          REPORT_PAGE.a4WidthMm,
          height * mmPerCapturedPx
        )
      }
    } finally {
      container.remove()
    }
  }

  return pdf.output('blob')
}
