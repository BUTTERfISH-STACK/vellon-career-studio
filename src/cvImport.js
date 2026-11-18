import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PAGES = 15

export async function extractCvText(file) {
  if (!file || file.type !== 'application/pdf') throw new Error('Choose a PDF file.')
  if (!file.size) throw new Error('The selected PDF is empty.')
  if (file.size > MAX_FILE_BYTES) throw new Error('The PDF exceeds the 10 MB limit.')

  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    if (pdf.numPages > MAX_PAGES) throw new Error('This importer supports PDFs of up to 15 pages.')

    const pages = []
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const content = await page.getTextContent()
      const items = content.items.filter(item => typeof item.str === 'string' && item.str.trim())
      const lines = []
      let current = []
      let lastY = null

      for (const item of items) {
        const y = Array.isArray(item.transform) ? item.transform[5] : null
        if (y !== null && lastY !== null && Math.abs(y - lastY) > 2) {
          if (current.length) lines.push(current.join(' '))
          current = []
        }
        if (y !== null) lastY = y
        current.push(item.str.trim())
      }
      if (current.length) lines.push(current.join(' '))
      pages.push(lines.join('\n'))
    }

    const result = pages.join('\n').replace(/[ \t]+/g, ' ').trim()
    if (result.length < 30) throw new Error('No usable text was found. This may be a scanned PDF and require OCR.')
    return result
  } finally {
    await loadingTask.destroy()
  }
}

const headingAliases = [
  ['summary', 'professional summary|career summary|profile|professional profile|career objective|objective'],
  ['technicalIdentity', 'technical identity|technical profile'],
  ['technicalStack', 'core technical stack|technical stack|technology stack|technical skills|technical expertise'],
  ['competencies', 'engineering strengths|professional competencies|core competencies|key competencies|commercial & operational capability|commercial and operational capability'],
  ['environment', 'development environment|technical environment'],
  ['projects', 'technical project portfolio|project portfolio|selected projects|projects|portfolio'],
  ['experience', 'professional experience|work experience|employment history|work history|career history|experience'],
  ['education', 'education & qualifications|education and qualifications|academic background|education|qualifications'],
  ['certifications', 'certifications & professional development|certifications and professional development|certifications|certificates|professional development|training'],
  ['targetRoles', 'target technology roles|target roles|career interests']
]

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const aliases = headingAliases.flatMap(([key, values]) =>
  values.split('|').map(value => ({ key, value }))
).sort((a, b) => b.value.length - a.value.length)

const headingPattern = new RegExp(
  `(^|\\n|\\s)(${aliases.map(x => escapeRegex(x.value)).join('|')})\\s*:?(?=\\s|$)`,
  'gi'
)

function cleanText(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/\u2022/g, '•')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitSections(source) {
  const matches = []
  headingPattern.lastIndex = 0
  let match

  while ((match = headingPattern.exec(source))) {
    const heading = match[2].toLowerCase()
    const found = aliases.find(x => x.value === heading)
    if (!found) continue

    const start = match.index + match[0].length
    matches.push({ key: found.key, start, headingStart: match.index })
  }

  const sections = {}
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const value = cleanText(source.slice(current.start, next ? next.headingStart : undefined))
    if (value) sections[current.key] = [sections[current.key], value].filter(Boolean).join('\n\n')
  }
  return sections
}

function extractExperience(value) {
  const lines = cleanText(value).split(/\n+/).map(x => x.trim()).filter(Boolean)
  const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s*\d{4}\s*(?:–|-|to)\s*(?:Present|Current|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s*\d{0,4}/i

  const jobs = []
  let current = null
  let pendingRole = ''

  for (const line of lines) {
    const dateMatch = line.match(datePattern)
    if (dateMatch) {
      const before = line.slice(0, dateMatch.index).trim()
      const after = line.slice(dateMatch.index + dateMatch[0].length).trim()
      const pieces = before.split(/\s+[—–-]\s+|\s+\|\s+/).map(x => x.trim()).filter(Boolean)

      if (current) jobs.push(current)

      current = {
        id: `import-${jobs.length + 1}`,
        role: pendingRole || (pieces.length > 1 ? pieces[0] : ''),
        company: pieces.length > 1 ? pieces.slice(1).join(' — ') : (pieces[0] || ''),
        dates: dateMatch[0].trim(),
        details: after.replace(/^[•·\s]+/, '').trim()
      }
      pendingRole = ''
      continue
    }

    if (/^[•·-]\s*/.test(line)) {
      if (current) current.details = [current.details, line.replace(/^[•·-]\s*/, '')].filter(Boolean).join('\n')
      continue
    }

    if (!current && line.length < 110 && !/^(professional experience|work experience)$/i.test(line)) {
      pendingRole = line
    } else if (current && !current.company) {
      current.company = line
    } else if (current) {
      current.details = [current.details, line].filter(Boolean).join('\n')
    }
  }

  if (current) jobs.push(current)
  return jobs.filter(job => job.role || job.company || job.details || job.dates)
}

function findContact(source, lines) {
  const email = (source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || ''
  const phone = (source.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d[\d\s()-]{6,}\d/) || [])[0] || ''
  const locationLine = lines.find(line => /^(?:location|address|based in)\s*[:|-]/i.test(line)) || ''
  return {
    email,
    phone: phone.trim(),
    location: locationLine.replace(/^(?:location|address|based in)\s*[:|-]\s*/i, '').trim()
  }
}

export function parseCvText(text) {
  const source = cleanText(String(text || '').replace(/\r/g, '\n'))
  const lines = source.split('\n').map(x => x.trim()).filter(Boolean)
  const sections = splitSections(source)
  const contact = findContact(source, lines)

  const name = lines.find(line =>
    line.length >= 3 && line.length <= 65 &&
    !/@|https?:|www\.|linkedin/i.test(line) &&
    !/^\+?[\d\s().-]+$/.test(line) &&
    !/^(curriculum vitae|resume|résumé|cv|professional summary|summary|profile)$/i.test(line) &&
    !/^[A-Z0-9 /&-]{35,}$/.test(line)
  ) || ''

  const title = lines.find(line =>
    /^(?:IT|ICT|Senior|Junior|Full[- ]Stack|Software|Web|Technical|Information Technology|Customer|Sales|Project|Operations).{2,65}$/i.test(line) &&
    line !== name
  ) || ''

  const summary = sections.summary || ''
  const technical = [
    sections.technicalIdentity,
    sections.technicalStack,
    sections.environment
  ].filter(Boolean).join('\n\n')

  const skills = technical
  const competencies = sections.competencies || ''
  const projects = sections.projects || ''
  const certifications = sections.certifications || ''
  const education = sections.education || ''
  const experienceText = sections.experience || ''
  const experience = extractExperience(experienceText)

  const recognised = new Set([
    'summary', 'technicalIdentity', 'technicalStack', 'competencies',
    'environment', 'projects', 'experience', 'education',
    'certifications', 'targetRoles'
  ])

  const unknownHeadings = []
  const unclassified = []

  if (sections.targetRoles) unclassified.push(`TARGET ROLES\n${sections.targetRoles}`)

  const allKnownContent = [
    summary, technical, competencies, projects, certifications,
    education, experienceText, sections.targetRoles
  ].filter(Boolean).join('\n')

  if (!summary && !technical && !competencies && !projects && !certifications && !education && !experienceText) {
    unclassified.push(source)
  }

  const sourceWithoutKnown = source
    .replace(headingPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const hasUnknownMaterial = sourceWithoutKnown.length > 250 &&
    !allKnownContent.includes(sourceWithoutKnown.slice(0, 120))

  if (hasUnknownMaterial && unclassified.length === 0) {
    unclassified.push('Some extracted text could not be confidently assigned. Review the extracted text before applying.')
  }

  return {
    name,
    title,
    ...contact,
    summary,
    skills,
    competencies,
    projects,
    certifications,
    education,
    experience,
    experienceText,
    unclassified: unclassified.join('\n\n'),
    sourceText: source,
    detectedLines: lines.length
  }
}
