import JSZip from 'jszip'

// A .docx file is a zip of XML parts, with the body text in word/document.xml.
// No AI provider accepts .docx directly, so the text is pulled out here and
// passed to the model as plain text instead.

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

// Text runs, tabs and line breaks are read in document order so a break inside
// a paragraph is not lost between the runs it separates.
function paragraphText(xml: string) {
  const runs = xml
    .replace(/<w:pPr\b[^>]*(\/>|>[\s\S]*?<\/w:pPr>)/g, '')
    .replace(/<w:rPr\b[^>]*(\/>|>[\s\S]*?<\/w:rPr>)/g, '')
  const token = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:br\b[^>]*\/?>/g
  let text = ''
  let match: RegExpExecArray | null
  while ((match = token.exec(runs))) {
    if (match[1] !== undefined) text += decodeXml(match[1])
    else text += match[0].startsWith('<w:tab') ? ' ' : '\n'
  }
  return text.replace(/[ \t]+/g, ' ').trim()
}

function paragraphLines(xml: string) {
  return Array.from(xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g))
    .map(match => paragraphText(match[1]))
    .filter(Boolean)
}

// Table rows become pipe-separated lines. Lab reports are almost always tables,
// and flattening each row to one line keeps the test, result and reference
// range on the same line where the model can relate them.
function tableLines(xml: string) {
  return Array.from(xml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g))
    .map(row => {
      const cells = Array.from(row[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g))
        .map(cell => paragraphLines(cell[1]).join(' ').replace(/\s*\n\s*/g, ' ').trim())
      return cells.some(Boolean) ? `| ${cells.join(' | ')} |` : ''
    })
    .filter(Boolean)
}

// Splits the body into top-level tables and the prose between them. Depth is
// tracked so a table nested in a cell stays part of its parent table.
function splitBlocks(xml: string) {
  const blocks: Array<{ table: boolean; xml: string }> = []
  const boundary = /<w:tbl\b[^>]*>|<\/w:tbl>/g
  let depth = 0
  let cursor = 0
  let tableStart = 0
  let match: RegExpExecArray | null

  while ((match = boundary.exec(xml))) {
    if (match[0].startsWith('</')) {
      depth--
      if (depth === 0) {
        blocks.push({ table: true, xml: xml.slice(tableStart, boundary.lastIndex) })
        cursor = boundary.lastIndex
      }
      continue
    }
    if (depth === 0) {
      if (match.index > cursor) blocks.push({ table: false, xml: xml.slice(cursor, match.index) })
      tableStart = match.index
    }
    depth++
  }

  if (cursor < xml.length) blocks.push({ table: false, xml: xml.slice(cursor) })
  return blocks
}

function partToLines(xml: string) {
  const lines: string[] = []
  for (const block of splitBlocks(xml)) {
    lines.push(...(block.table ? tableLines(block.xml) : paragraphLines(block.xml)))
  }
  return lines
}

export async function docxToText(bytes: Buffer | Uint8Array) {
  const zip = await JSZip.loadAsync(bytes)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) throw new Error('This does not look like a valid Word .docx file')

  const documentXml = await documentFile.async('string')
  const body = /<w:body\b[^>]*>([\s\S]*)<\/w:body>/.exec(documentXml)?.[1] || documentXml
  const lines = partToLines(body)

  // Some lab reports carry everything in the page header, leaving an empty
  // body. Fall back to headers and footers rather than reporting no text.
  if (!lines.length) {
    for (const part of zip.file(/^word\/(header|footer)\d*\.xml$/)) {
      lines.push(...partToLines(await part.async('string')))
    }
  }

  return lines.join('\n').trim()
}
