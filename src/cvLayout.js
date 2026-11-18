import { jsPDF } from 'jspdf'

const GOLD = [190, 151, 83]
const INK = [29, 29, 27]
const MUTED = [111, 108, 101]
const PAPER = [250, 249, 246]
const PAGE_BOTTOM = 270

const clean = value => String(value || '').trim()

const getSkills = value =>
  clean(value)
    .split(/[,\n;•]+/)
    .map(item => item.trim())
    .filter(Boolean)

export function generateCvPdf(form) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const railWidth = 66
  const railPad = 9
  const contentX = 77
  const contentWidth = pageWidth - contentX - 13
  const contentRight = contentX + contentWidth

  let page = 1
  let y = 24

  const setText = (color = INK) => doc.setTextColor(...color)

  function drawSidebar() {
    doc.setFillColor(22, 22, 20)
    doc.rect(0, 0, railWidth, pageHeight, 'F')

    doc.setFillColor(...GOLD)
    doc.rect(railWidth - 1, 0, 1, pageHeight, 'F')

    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.35)
    doc.rect(railPad, 13, 12, 12, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setText(GOLD)
    doc.text('V.', railPad + 3.2, 21)

    doc.setFontSize(6.5)
    doc.setCharSpace(1.5)
    doc.text('VÉLLON  /  CAREER STUDIO', railPad, 32)
    doc.setCharSpace(0)

    if (page === 1) {
      const name = clean(form.name) || 'Your Name'
      const nameSize = name.length > 27 ? 17 : name.length > 19 ? 19 : 22

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(nameSize)
      setText([248, 246, 239])

      const nameLines = doc.splitTextToSize(name, railWidth - railPad * 2)
      let nameY = 49

      nameLines.slice(0, 3).forEach(line => {
        doc.text(line, railPad, nameY)
        nameY += nameSize * 0.42
      })

      let headlineY = nameY + 3
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      setText(GOLD)

      const headline = doc.splitTextToSize(
        clean(form.title) || 'PROFESSIONAL PROFILE',
        railWidth - railPad * 2
      )

      headline.slice(0, 3).forEach(line => {
        doc.text(line, railPad, headlineY)
        headlineY += 4
      })

      let contactY = headlineY + 10
      doc.setDrawColor(91, 78, 55)
      doc.line(railPad, contactY - 5, railWidth - railPad, contactY - 5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      setText(GOLD)
      doc.setCharSpace(1.2)
      doc.text('CONTACT', railPad, contactY)
      doc.setCharSpace(0)
      contactY += 7

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      setText([225, 222, 213])

      const contacts = [
        clean(form.email),
        clean(form.phone),
        clean(form.location)
      ].filter(Boolean)

      contacts.forEach(value => {
        const lines = doc.splitTextToSize(value, railWidth - railPad * 2)
        lines.forEach(line => {
          if (contactY < 150) {
            doc.text(line, railPad, contactY)
            contactY += 4
          }
        })
        contactY += 1.5
      })

      const skills = getSkills(form.skills)
      if (skills.length) {
        const skillsY = Math.max(contactY + 8, 169)

        doc.setDrawColor(91, 78, 55)
        doc.line(railPad, skillsY - 5, railWidth - railPad, skillsY - 5)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        setText(GOLD)
        doc.setCharSpace(1.2)
        doc.text('CORE SKILLS', railPad, skillsY)
        doc.setCharSpace(0)

        let skillY = skillsY + 8
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        setText([225, 222, 213])

        skills.slice(0, 16).forEach(skill => {
          const lines = doc.splitTextToSize(skill, railWidth - railPad * 2 - 3)
          lines.forEach(line => {
            if (skillY < 265) {
              doc.setFillColor(...GOLD)
              doc.circle(railPad + 1, skillY - 1, 0.45, 'F')
              doc.text(line, railPad + 4, skillY)
              skillY += 4
            }
          })
          skillY += 1
        })
      }
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      setText([248, 246, 239])
      const continuationName = doc.splitTextToSize(
        clean(form.name),
        railWidth - railPad * 2
      )
      doc.text(continuationName.slice(0, 2), railPad, 51)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      setText(GOLD)
      doc.text('CONTINUED', railPad, 65)

      const contacts = [
        clean(form.email),
        clean(form.phone),
        clean(form.location)
      ].filter(Boolean)

      let contactY = 88
      doc.setFontSize(7)
      setText([225, 222, 213])
      contacts.forEach(value => {
        doc.splitTextToSize(value, railWidth - railPad * 2).forEach(line => {
          doc.text(line, railPad, contactY)
          contactY += 4
        })
        contactY += 1
      })
    }

    doc.setDrawColor(91, 78, 55)
    doc.line(railPad, pageHeight - 19, railWidth - railPad, pageHeight - 19)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    setText(GOLD)
    doc.text('VÉLLON', railPad, pageHeight - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    setText([160, 153, 139])
    doc.text('CAREER STUDIO', railPad + 19, pageHeight - 12)
  }

  function drawPage() {
    drawSidebar()

    doc.setFillColor(...PAPER)
    doc.rect(railWidth, 0, pageWidth - railWidth, pageHeight, 'F')

    doc.setFillColor(...GOLD)
    doc.rect(contentX, 15, 9, 0.8, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setCharSpace(1.5)
    setText(MUTED)
    doc.text(page === 1 ? 'PROFESSIONAL CURRICULUM VITAE' : 'CURRICULUM VITAE  /  CONTINUED', contentX + 13, 16)
    doc.setCharSpace(0)

    y = 29
  }

  function newPage() {
    page += 1
    doc.addPage()
    drawPage()
  }

  function ensureSpace(height = 10) {
    if (y + height > PAGE_BOTTOM) newPage()
  }

  function sectionHeading(title) {
    ensureSpace(15)

    y += 3
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setCharSpace(1.25)
    setText(INK)
    doc.text(title.toUpperCase(), contentX, y)
    doc.setCharSpace(0)

    y += 3
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.45)
    doc.line(contentX, y, contentRight, y)
    y += 7
  }

  function writeParagraph(value, options = {}) {
    const fontSize = options.fontSize || 9
    const lineHeight = options.lineHeight || 4.8
    const color = options.color || INK

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    setText(color)

    const paragraphs = clean(value).split(/\n+/).filter(Boolean)

    paragraphs.forEach(paragraph => {
      const lines = doc.splitTextToSize(paragraph, contentWidth)

      lines.forEach(line => {
        ensureSpace(lineHeight + 1)
        doc.text(line, contentX, y)
        y += lineHeight
      })

      y += 2
    })
  }

  function writeExperience(job) {
    const role = clean(job.role) || 'Position'
    const company = clean(job.company)
    const dates = clean(job.dates)
    const details = clean(job.details)

    if (!role && !company && !dates && !details) return

    const heading = [role, company].filter(Boolean).join('  /  ')
    const headingLines = doc.splitTextToSize(heading, contentWidth)

    ensureSpace(headingLines.length * 5 + 10)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    setText(INK)

    headingLines.forEach(line => {
      doc.text(line, contentX, y)
      y += 4.7
    })

    if (dates) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      setText(MUTED)

      const dateLines = doc.splitTextToSize(dates, contentWidth)
      dateLines.forEach(line => {
        ensureSpace(5)
        doc.text(line, contentX, y)
        y += 4
      })
    }

    if (details) {
      y += 1
      writeParagraph(details, { fontSize: 8.5, lineHeight: 4.4, color: [75, 74, 69] })
    }

    y += 5
  }

  drawPage()

  if (clean(form.summary)) {
    sectionHeading('Professional Summary')
    writeParagraph(form.summary, { fontSize: 9, lineHeight: 5 })
  }

  const jobs = (form.experience || []).filter(job =>
    clean(job.role) || clean(job.company) || clean(job.details) || clean(job.dates)
  )

  if (jobs.length) {
    sectionHeading('Professional Experience')
    jobs.forEach(writeExperience)
  }

  if (clean(form.education)) {
    sectionHeading('Education & Qualifications')
    writeParagraph(form.education, { fontSize: 8.8, lineHeight: 4.8 })
  }

  if (clean(form.projects)) {
    sectionHeading('Projects & Portfolio')
    writeParagraph(form.projects, { fontSize: 8.5, lineHeight: 4.6 })
  }

  if (clean(form.certifications)) {
    sectionHeading('Certifications & Professional Development')
    writeParagraph(form.certifications, { fontSize: 8.5, lineHeight: 4.6 })
  }

  if (clean(form.competencies)) {
    sectionHeading('Professional Competencies')
    writeParagraph(form.competencies, { fontSize: 8.5, lineHeight: 4.6 })
  }

  const pageCount = doc.internal.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    doc.setDrawColor(218, 214, 205)
    doc.setLineWidth(0.25)
    doc.line(contentX, pageHeight - 17, contentRight, pageHeight - 17)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    setText(MUTED)
    doc.text('VÉLLON FREE EDITION', contentX, pageHeight - 11)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    setText(INK)
    doc.text(`${i} / ${pageCount}`, contentRight, pageHeight - 11, { align: 'right' })
  }

  const filename = clean(form.name)
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'CV'

  doc.save(`${filename}-Vellon.pdf`)
}
