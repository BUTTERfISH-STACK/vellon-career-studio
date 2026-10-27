import { useState } from 'react'
import { jsPDF } from 'jspdf'
import {
  Award, Download, FileText, Mail, ShieldCheck, Sparkles
} from 'lucide-react'

const gold = [216, 181, 107]
const ink = [8, 8, 8]
const paper = [242, 238, 228]

function safeName(name) {
  return String(name || 'Candidate')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .slice(0, 55) || 'Candidate'
}

function drawBackground(doc) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setFillColor(...ink)
  doc.rect(0, 0, w, h, 'F')
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.45)
  doc.rect(8, 8, w - 16, h - 16)
  doc.setLineWidth(0.2)
}

function drawSeal(doc, x, y, size = 23) {
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.55)
  doc.circle(x, y, size / 2)
  doc.circle(x, y, size / 2 - 2)
  doc.setTextColor(...gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('VÉLLON', x, y - 1, { align: 'center' })
  doc.setFontSize(4.6)
  doc.text('PASS', x, y + 3, { align: 'center' })
}

function addFooter(doc, page) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...gold)
  doc.line(16, h - 17, w - 16, h - 17)
  doc.setTextColor(...gold)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('VÉLLON PASS  /  CAREER STUDIO', 17, h - 11)
  doc.text(String(page), w - 17, h - 11, { align: 'right' })
}

function writeWrapped(doc, text, x, y, width, options = {}) {
  const fontSize = options.fontSize || 9
  const lineHeight = options.lineHeight || 5
  doc.setFontSize(fontSize)
  const lines = doc.splitTextToSize(String(text || ''), width)
  const pageHeight = doc.internal.pageSize.getHeight()
  let page = options.page || 1

  for (const line of lines) {
    if (y > pageHeight - 25) {
      addFooter(doc, page)
      doc.addPage()
      page += 1
      drawBackground(doc)
      y = 22
    }
    doc.text(line, x, y)
    y += lineHeight
  }
  return { y, page }
}

function drawHeading(doc, text, x, y, width) {
  doc.setTextColor(...gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(text.toUpperCase(), x, y)
  doc.setDrawColor(...gold)
  doc.line(x, y + 3, x + width, y + 3)
  return y + 10
}

function exportPremiumCV(form) {
  if (!form.name?.trim()) {
    window.alert('Add your name in the CV builder before exporting VÉLLON PASS.')
    return
  }

  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()
  const margin = 18
  const usable = w - margin * 2
  let y = 24
  let page = 1

  drawBackground(doc)
  drawSeal(doc, w - 29, 29, 25)

  doc.setTextColor(...gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  const nameLines = doc.splitTextToSize(form.name, usable - 27)
  doc.text(nameLines, margin, y)
  y += nameLines.length * 9 + 2

  doc.setTextColor(...paper)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const headline = form.title || 'Professional Profile'
  doc.text(doc.splitTextToSize(headline, usable - 8), margin, y)
  y += 9

  doc.setTextColor(190, 185, 173)
  doc.setFontSize(8)
  const contact = [form.email, form.phone, form.location].filter(Boolean).join('  |  ')
  const contactLines = doc.splitTextToSize(contact, usable)
  if (contactLines.length) {
    doc.text(contactLines, margin, y)
    y += contactLines.length * 4 + 4
  }

  doc.setDrawColor(...gold)
  doc.line(margin, y, w - margin, y)
  y += 10

  const section = (heading, body) => {
    if (!String(body || '').trim()) return
    if (y > doc.internal.pageSize.getHeight() - 32) {
      addFooter(doc, page)
      doc.addPage()
      page += 1
      drawBackground(doc)
      y = 23
    }
    y = drawHeading(doc, heading, margin, y, usable)
    doc.setTextColor(...paper)
    doc.setFont('helvetica', 'normal')
    const result = writeWrapped(doc, body, margin, y, usable, {
      fontSize: 9,
      lineHeight: 5,
      page
    })
    y = result.y + 5
    page = result.page
  }

  section('Professional Profile', form.summary)
  section('Core Skills', form.skills)

  const jobs = (form.experience || []).filter(job =>
    [job.role, job.company, job.dates, job.details].some(value => String(value || '').trim())
  )
  if (jobs.length) {
    for (const job of jobs) {
      const heading = [job.role, job.company].filter(Boolean).join(' — ') || 'Experience'
      section('Professional Experience', [
        heading,
        job.dates,
        job.details
      ].filter(Boolean).join('\n'))
    }
  }

  section('Education & Qualifications', form.education)
  addFooter(doc, page)
  doc.save(`${safeName(form.name)}-Vellon-PASS-CV.pdf`)
}

function buildLetter(form, letter) {
  if (letter.body.trim()) return letter.body.trim()

  const greeting = letter.recipient.trim()
    ? `Dear ${letter.recipient.trim()},`
    : 'Dear Hiring Manager,'

  return [
    greeting,
    '',
    `I am writing to apply for the ${letter.role.trim() || form.title.trim() || 'available position'}${letter.company.trim() ? ` at ${letter.company.trim()}` : ''}.`,
    '',
    form.summary.trim() || 'I am a motivated professional who values reliability, continuous learning, and contributing positively to a team.',
    '',
    form.skills.trim() ? `My relevant skills include ${form.skills.trim()}.` : 'I would welcome the opportunity to discuss how my experience and strengths could contribute to your organization.',
    '',
    'Thank you for considering my application. I would appreciate the opportunity to discuss my suitability for the role.',
    '',
    'Kind regards,',
    form.name.trim() || '[Your name]'
  ].join('\n')
}

function exportCoverLetter(form, letter) {
  if (!form.name?.trim()) {
    window.alert('Add your name in the CV builder before exporting your cover letter.')
    return
  }

  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()
  const margin = 20
  const usable = w - margin * 2

  drawBackground(doc)
  drawSeal(doc, w - 30, 29, 25)

  doc.setTextColor(...gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('VÉLLON PASS', margin, 25)

  doc.setTextColor(...paper)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('PROFESSIONAL COVER LETTER', margin, 33)

  doc.setDrawColor(...gold)
  doc.line(margin, 43, w - margin, 43)

  let y = 56
  const date = letter.date.trim()
  doc.setTextColor(190, 185, 173)
  doc.setFontSize(9)
  if (date) {
    doc.text(date, margin, y)
    y += 10
  }

  doc.setTextColor(...paper)
  const recipientBlock = [
    letter.recipient,
    letter.company,
    letter.role ? `Re: ${letter.role}` : ''
  ].filter(Boolean).join('\n')

  if (recipientBlock) {
    const recipientLines = doc.splitTextToSize(recipientBlock, usable)
    doc.text(recipientLines, margin, y)
    y += recipientLines.length * 5 + 8
  }

  doc.setTextColor(...paper)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const body = buildLetter(form, letter)
  const lines = doc.splitTextToSize(body, usable)
  const pageHeight = doc.internal.pageSize.getHeight()
  let page = 1

  for (const line of lines) {
    if (y > pageHeight - 27) {
      addFooter(doc, page)
      doc.addPage()
      page += 1
      drawBackground(doc)
      y = 24
    }
    doc.text(line, margin, y)
    y += 5.7
  }

  addFooter(doc, page)
  doc.save(`${safeName(form.name)}-Vellon-PASS-Cover-Letter.pdf`)
}

export default function VellonPass({ form }) {
  const [letter, setLetter] = useState({
    recipient: '',
    company: '',
    role: '',
    date: new Date().toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    body: ''
  })

  const updateLetter = (key, value) =>
    setLetter(old => ({ ...old, [key]: value }))

  const generatedLetter = buildLetter(form, letter)

  return (
    <section className="pass-suite" id="vellon-pass">
      <div className="pass-suite-heading">
        <div>
          <div className="eyebrow"><Sparkles size={14}/> THE PREMIUM APPLICATION SUITE</div>
          <h2>VÉLLON <span>PASS</span></h2>
          <p>A considered black-and-gold CV and a matching cover letter, built from your existing details.</p>
        </div>
        <div className="pass-seal-large" aria-label="VÉLLON PASS premium design seal">
          <span>VÉLLON</span>
          <strong>PASS</strong>
          <small>HIGHLY RECOMMENDED</small>
        </div>
      </div>

      <div className="pass-benefits">
        <div><Award size={18}/><span><strong>Premium design</strong><small>Black, gold and refined spacing</small></span></div>
        <div><FileText size={18}/><span><strong>Live CV preview</strong><small>Uses your current CV details</small></span></div>
        <div><Mail size={18}/><span><strong>Matching letter</strong><small>Editable and ready to export</small></span></div>
      </div>

      <div className="pass-grid">
        <div className="pass-preview-card">
          <div className="pass-card-heading">
            <span><ShieldCheck size={15}/> PASS CV PREVIEW</span>
            <span>LIVE</span>
          </div>
          <article className="pass-document">
            <header className="pass-document-header">
              <div className="pass-document-brand">VÉLLON <span>PASS</span></div>
              <div className="pass-document-seal">V.</div>
              <h3>{form.name || 'YOUR NAME'}</h3>
              <p>{form.title || 'PROFESSIONAL PROFILE'}</p>
              <small>{[form.email, form.phone, form.location].filter(Boolean).join('  ·  ') || 'EMAIL  ·  PHONE  ·  LOCATION'}</small>
            </header>
            <div className="pass-document-body">
              {form.summary && <section><h4>Professional Profile</h4><p>{form.summary}</p></section>}
              {form.skills && <section><h4>Core Skills</h4><p>{form.skills}</p></section>}
              {(form.experience || []).filter(job => job.role || job.company || job.details).map(job => (
                <section key={job.id}>
                  <h4>Professional Experience</h4>
                  <strong>{[job.role, job.company].filter(Boolean).join(' — ') || 'Experience'}</strong>
                  {job.dates && <small>{job.dates}</small>}
                  {job.details && <p>{job.details}</p>}
                </section>
              ))}
              {form.education && <section><h4>Education & Qualifications</h4><p>{form.education}</p></section>}
              {!form.summary && !form.skills && !form.education && !(form.experience || []).some(job => job.role || job.company || job.details) && (
                <p className="pass-empty-hint">Your completed CV sections will appear here. Fill in the builder below to update this preview.</p>
              )}
            </div>
            <footer className="pass-document-footer">VÉLLON PASS <span>PROFESSIONAL APPLICATION SERIES</span></footer>
          </article>
          <button className="button button-gold pass-action" onClick={() => exportPremiumCV(form)}>
            <Download size={16}/> Export premium CV PDF
          </button>
        </div>

        <div className="pass-letter-card">
          <div className="pass-card-heading">
            <span><Mail size={15}/> COVER LETTER STUDIO</span>
            <span>EDITABLE</span>
          </div>
          <p className="pass-card-intro">Personalize the recipient and role. The draft below uses your CV details as a starting point; review it carefully before sending.</p>

          <div className="pass-letter-fields">
            <label className="field"><span>Recipient name</span><input value={letter.recipient} onChange={e => updateLetter('recipient', e.target.value)} placeholder="Hiring manager (optional)"/></label>
            <label className="field"><span>Company</span><input value={letter.company} onChange={e => updateLetter('company', e.target.value)} placeholder="Company name"/></label>
            <label className="field"><span>Position applying for</span><input value={letter.role} onChange={e => updateLetter('role', e.target.value)} placeholder="Job title"/></label>
            <label className="field"><span>Date</span><input value={letter.date} onChange={e => updateLetter('date', e.target.value)} placeholder="Application date"/></label>
            <label className="field"><span>Letter content</span><textarea rows={11} value={letter.body} onChange={e => updateLetter('body', e.target.value)} placeholder={generatedLetter}/></label>
          </div>

          <div className="pass-letter-preview">
            <div className="pass-letter-preview-title">LETTER PREVIEW</div>
            <div className="pass-letter-preview-brand">VÉLLON PASS</div>
            <div className="pass-letter-preview-rule"/>
            <small>{letter.date}</small>
            {(letter.recipient || letter.company || letter.role) && (
              <p>{[letter.recipient, letter.company, letter.role && `Re: ${letter.role}`].filter(Boolean).join('\n')}</p>
            )}
            <p className="pass-letter-body">{generatedLetter}</p>
            <div className="pass-letter-stamp"><span>VÉLLON</span><strong>PASS</strong><small>HIGHLY RECOMMENDED</small></div>
          </div>

          <button className="button button-gold pass-action" onClick={() => exportCoverLetter(form, letter)}>
            <Download size={16}/> Export cover letter PDF
          </button>
        </div>
      </div>

      <p className="pass-disclaimer"><ShieldCheck size={14}/> The PASS seal is a design mark, not an employer endorsement or guarantee of employment. Review every detail before submitting an application.</p>
    </section>
  )
}
