import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PAGES = 15

export async function extractCvText(file) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('Choose a PDF file.')
  }

  if (file.size === 0) {
    throw new Error('The selected PDF is empty.')
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('The PDF exceeds the 10 MB limit.')
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise

    if (pdf.numPages > MAX_PAGES) {
      throw new Error('This importer supports PDFs of up to 15 pages.')
    }

    const pages = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = content.items.filter(
        item => typeof item.str === 'string' && item.str.length > 0
      )

      const lines = []
      let currentLine = []
      let currentY = null

      for (const item of items) {
        const y = Array.isArray(item.transform)
          ? item.transform[5]
          : null

        if (
          y !== null &&
          currentY !== null &&
          Math.abs(y - currentY) > 2
        ) {
          if (currentLine.length) lines.push(currentLine.join(' '))
          currentLine = []
        }

        if (y !== null) currentY = y
        currentLine.push(item.str)
      }

      if (currentLine.length) lines.push(currentLine.join(' '))
      pages.push(lines.join('\n'))
    }

    const result = pages.join('\n').replace(/[ \t]+/g, ' ').trim()

    if (result.length < 30) {
      throw new Error(
        'No usable text was found. This may be a scanned PDF and require OCR.'
      )
    }

    return result
  } finally {
    await loadingTask.destroy()
  }
}

export function parseCvText(text) {
  const source = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

  const lines = source
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const first = (...patterns) => {
    for (const pattern of patterns) {
      const match = source.match(pattern)
      if (match) return (match[1] || match[0]).trim()
    }
    return ''
  }

  const email = first(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  )

  const phone = first(
    /(?:\+?\d[\d ()-]{7,}\d)/
  )

  const section = (names) => {
    const heading = new RegExp(
      `(?:^|\\n)\\s*(?:${names.join('|')})\\s*:?\\s*(?:\\n|$)`,
      'i'
    )

    const match = heading.exec(source)
    if (!match) return ''

    const start = match.index + match[0].length
    const remaining = source.slice(start)
    const next = /\n\s*(?:professional summary|summary|profile|skills|core competencies|work experience|professional experience|employment history|experience|education|qualifications|certifications|references)\s*:?\s*(?:\n|$)/i.exec(remaining)

    return remaining.slice(0, next ? next.index : undefined).trim()
  }

  const summary = section([
    'professional summary', 'summary', 'profile',
    'professional profile', 'career objective', 'objective'
  ])

  const skills = section([
    'skills', 'core skills', 'technical skills',
    'key skills', 'core competencies', 'competencies'
  ])

  const education = section([
    'education', 'qualifications', 'academic background',
    'education and qualifications'
  ])

  const experienceText = section([
    'work experience', 'professional experience',
    'employment history', 'experience', 'work history'
  ])

  const excluded = /^(curriculum vitae|resume|résumé|cv)$/i
  const contactLine = line => /@|https?:\/\/|www\.|linkedin|phone|mobile/i.test(line)

  const name = lines.find(line =>
    line.length >= 3 &&
    line.length <= 65 &&
    !excluded.test(line) &&
    !contactLine(line) &&
    !/^\+?[\d\s().-]+$/.test(line) &&
    !/^(professional summary|summary|profile|skills|experience|education|qualifications)$/i.test(line)
  ) || ''

  const location = first(
    /(?:location|address|based in)\s*[:|-]\s*([^,\n]+(?:,\s*[^,\n]+)?)/i
  )

  return {
    name,
    title: '',
    email,
    phone,
    location,
    summary,
    skills,
    education,
    experienceText,
    sourceText: source,
    detectedLines: lines.length
  }
}
