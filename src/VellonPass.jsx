import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import {
  Award, Check, ChevronRight, Crown, Download,
  Eye, FileText, LayoutTemplate, Mail, Palette, Plus, RotateCcw,
  ShieldCheck, Sparkles, Trash2, UserRound
} from 'lucide-react'

const GOLD = [193, 157, 83]
const DARK = [12, 12, 12]
const IVORY = [247, 244, 236]
const STORAGE_KEY = 'vellon-pass-draft-v1'

const themes = {
  obsidian: {
    label: 'Obsidian Luxury',
    paper: DARK,
    text: IVORY,
    accent: GOLD,
    muted: [190, 181, 161],
    panel: [24, 23, 20]
  },
  ivory: {
    label: 'Ivory Editorial',
    paper: [251, 249, 244],
    text: [36, 34, 30],
    accent: [145, 111, 47],
    muted: [105, 99, 88],
    panel: [239, 234, 222]
  }
}

const today = () => new Date().toLocaleDateString('en-ZA', {
  day: 'numeric', month: 'long', year: 'numeric'
})

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function cleanName(value) {
  return String(value || 'Candidate').trim()
    .replace(/[^a-z0-9_-]+/gi, '-').slice(0, 55) || 'Candidate'
}

function makeExperience(items = []) {
  return items.map(item => ({
    id: item.id || makeId(),
    role: item.role || '',
    company: item.company || '',
    dates: item.dates || '',
    details: item.details || ''
  }))
}

function seedCV(form = {}) {
  return {
    name: form.name || '',
    title: form.title || '',
    email: form.email || '',
    phone: form.phone || '',
    location: form.location || '',
    summary: form.summary || '',
    skills: form.skills || '',
    education: form.education || '',
    experience: makeExperience(form.experience || [])
  }
}

function buildLetter(cv, letter) {
  if (letter.body.trim()) return letter.body.trim()

  const greeting = letter.recipient.trim()
    ? `Dear ${letter.recipient.trim()},`
    : 'Dear Hiring Manager,'

  return [
    greeting,
    '',
    `I am writing to apply for the ${letter.role.trim() || cv.title.trim() || 'available position'}${letter.company.trim() ? ` at ${letter.company.trim()}` : ''}.`,
    '',
    cv.summary.trim() || 'I am a motivated professional who values reliability, continuous learning, and contributing positively to a team.',
    '',
    cv.skills.trim()
      ? `My relevant skills include ${cv.skills.trim()}.`
      : 'I would welcome the opportunity to discuss how my experience and strengths could contribute to your organization.',
    '',
    'Thank you for considering my application. I would appreciate the opportunity to discuss my suitability for the role.',
    '',
    'Kind regards,',
    cv.name.trim() || '[Your name]'
  ].join('\n')
}

function drawPDFHeader(doc, cv, theme, subtitle) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18
  const colors = themes[theme] || themes.obsidian

  doc.setFillColor(...colors.paper)
  doc.rect(0, 0, pageW, pageH, 'F')

  if (theme === 'obsidian') {
    doc.setDrawColor(...colors.accent)
    doc.setLineWidth(0.45)
    doc.rect(7, 7, pageW - 14, pageH - 14)
  }

  doc.setTextColor(...colors.accent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('VÉLLON  /  PASS', margin, 17)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(subtitle.toUpperCase(), pageW - margin, 17, { align: 'right' })

  doc.setDrawColor(...colors.accent)
  doc.setLineWidth(0.5)
  doc.line(margin, 22, pageW - margin, 22)

  return { pageW, pageH, margin, colors }
}

function drawFooter(doc, page, colors, margin) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  doc.setDrawColor(...colors.accent)
  doc.setLineWidth(0.3)
  doc.line(margin, pageH - 16, pageW - margin, pageH - 16)
  doc.setTextColor(...colors.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('VÉLLON PASS  ·  PROFESSIONAL APPLICATION', margin, pageH - 10)
  doc.text(String(page), pageW - margin, pageH - 10, { align: 'right' })
}

function exportCV(cv, settings) {
  if (!cv.name.trim()) {
    window.alert('Enter your name in the PASS CV editor before exporting.')
    return
  }

  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const { pageW, pageH, margin, colors } =
    drawPDFHeader(doc, cv, settings.theme, 'Premium curriculum vitae')

  const width = pageW - margin * 2
  const bottom = pageH - 23
  let page = 1
  let y = 33

  const newPage = () => {
    drawFooter(doc, page, colors, margin)
    doc.addPage()
    page += 1
    drawPDFHeader(doc, cv, settings.theme, 'Curriculum vitae · continued')
    y = 31
  }

  const ensureSpace = (height) => {
    if (y + height > bottom) newPage()
  }

  const wrapped = (value, size, widthLimit = width) => {
    doc.setFontSize(size)
    return doc.splitTextToSize(String(value || ''), widthLimit)
  }

  const writeSection = (heading, body) => {
    if (!String(body || '').trim()) return
    ensureSpace(17)

    doc.setTextColor(...colors.accent)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(heading.toUpperCase(), margin, y)
    y += 3

    doc.setDrawColor(...colors.accent)
    doc.setLineWidth(0.25)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    doc.setTextColor(...colors.text)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(settings.fontSize)
    const lines = wrapped(body, settings.fontSize)

    for (const line of lines) {
      if (y + settings.lineHeight > bottom) newPage()
      doc.text(line, margin, y)
      y += settings.lineHeight
    }
    y += settings.spacing
  }

  doc.setTextColor(...colors.accent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  const nameLines = wrapped(cv.name, 22, width - 24)
  for (const line of nameLines) {
    ensureSpace(10)
    doc.text(line, margin, y)
    y += 9
  }

  doc.setTextColor(...colors.text)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const headline = wrapped(cv.title || 'Professional Profile', 11, width)
  headline.forEach(line => {
    ensureSpace(7)
    doc.text(line, margin, y)
    y += 6
  })
  y += 2

  const contact = [cv.email, cv.phone, cv.location].filter(Boolean).join('  |  ')
  if (contact) {
    doc.setTextColor(...colors.muted)
    doc.setFontSize(8)
    const lines = wrapped(contact, 8)
    lines.forEach(line => {
      ensureSpace(5)
      doc.text(line, margin, y)
      y += 4
    })
  }
  y += 5

  writeSection('Professional Profile', cv.summary)
  writeSection('Core Skills', cv.skills)

  for (const job of cv.experience.filter(item =>
    [item.role, item.company, item.dates, item.details].some(value => String(value || '').trim())
  )) {
    const description = [
      [job.role, job.company].filter(Boolean).join(' — '),
      job.dates,
      job.details
    ].filter(Boolean).join('\n')
    writeSection('Professional Experience', description)
  }

  writeSection('Education & Qualifications', cv.education)
  drawFooter(doc, page, colors, margin)
  doc.save(`${cleanName(cv.name)}-Vellon-PASS-CV.pdf`)
}

function exportLetter(cv, letter, settings) {
  if (!cv.name.trim()) {
    window.alert('Enter your name in the PASS CV editor before exporting.')
    return
  }

  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const { pageW, pageH, margin, colors } =
    drawPDFHeader(doc, cv, settings.theme, 'Professional cover letter')

  const width = pageW - margin * 2
  const bottom = pageH - 23
  let page = 1
  let y = 34

  const nextPage = () => {
    drawFooter(doc, page, colors, margin)
    doc.addPage()
    page += 1
    drawPDFHeader(doc, cv, settings.theme, 'Cover letter · continued')
    y = 32
  }

  const writeLines = (text, fontSize, lineHeight, gap = 0) => {
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(String(text || ''), width)
    for (const line of lines) {
      if (y + lineHeight > bottom) nextPage()
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += gap
  }

  doc.setTextColor(...colors.accent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  writeLines(cv.name, 19, 9, 1)

  doc.setTextColor(...colors.text)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  writeLines([cv.title, cv.email, cv.phone, cv.location].filter(Boolean).join('  ·  '), 9, 5, 8)

  doc.setTextColor(...colors.muted)
  writeLines(letter.date, 9, 5, 7)

  doc.setTextColor(...colors.text)
  const recipient = [
    letter.recipient,
    letter.company,
    letter.role ? `Re: ${letter.role}` : ''
  ].filter(Boolean).join('\n')
  if (recipient) writeLines(recipient, 10, 5.5, 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  writeLines(buildLetter(cv, letter), 10, 5.7, 0)

  drawFooter(doc, page, colors, margin)
  doc.save(`${cleanName(cv.name)}-Vellon-PASS-Cover-Letter.pdf`)
}

function Field({ label, value, onChange, placeholder, multiline = false, rows = 3 }) {
  return (
    <label className="pass-field">
      <span>{label}</span>
      {multiline ? (
        <textarea rows={rows} value={value} onChange={event => onChange(event.target.value)}
          placeholder={placeholder || ''} />
      ) : (
        <input value={value} onChange={event => onChange(event.target.value)}
          placeholder={placeholder || ''} />
      )}
    </label>
  )
}

function readSavedDraft() {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    return saved && saved.version === 1 ? saved : null
  } catch {
    return null
  }
}

export default function VellonPass({ form = {} }) {
  const [initialDraft] = useState(() => readSavedDraft())
  const [cv, setCV] = useState(() => {
    const base = seedCV(form)
    const saved = initialDraft?.cv
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base
    return {
      ...base,
      ...saved,
      experience: Array.isArray(saved.experience) ? saved.experience : base.experience
    }
  })
  const [letter, setLetter] = useState(() => ({
    recipient: '',
    company: '',
    role: '',
    date: today(),
    body: '',
    ...(initialDraft?.letter && typeof initialDraft.letter === 'object'
      ? initialDraft.letter : {})
  }))
  const [settings, setSettings] = useState(() => {
    const defaults = { theme: 'obsidian', fontSize: 9, lineHeight: 5, spacing: 5 }
    const saved = initialDraft?.settings
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults
    return {
      ...defaults,
      ...saved,
      theme: saved.theme === 'ivory' ? 'ivory' : 'obsidian',
      fontSize: Number.isFinite(saved.fontSize) ? saved.fontSize : defaults.fontSize,
      lineHeight: Number.isFinite(saved.lineHeight) ? saved.lineHeight : defaults.lineHeight,
      spacing: Number.isFinite(saved.spacing) ? saved.spacing : defaults.spacing
    }
  })
  const [view, setView] = useState('overview')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        cv,
        letter,
        settings
      }))
    } catch {
      // Storage may be disabled or full; the editor should remain usable.
    }
  }, [cv, letter, settings])

  const updateCV = (key, value) => {
    setCV(old => ({ ...old, [key]: value }))
    setNotice('PASS draft updated')
  }
  const updateLetter = (key, value) => {
    setLetter(old => ({ ...old, [key]: value }))
    setNotice('Cover letter updated')
  }
  const updateSettings = (key, value) => {
    setSettings(old => ({ ...old, [key]: value }))
    setNotice('Design settings updated')
  }
  const addExperience = () => updateCV('experience', [
    ...cv.experience,
    { id: makeId(), role: '', company: '', dates: '', details: '' }
  ])
  const updateExperience = (id, key, value) => {
    setCV(old => ({
      ...old,
      experience: old.experience.map(job =>
        job.id === id ? { ...job, [key]: value } : job
      )
    }))
    setNotice('Experience updated')
  }
  const removeExperience = id => {
    setCV(old => ({ ...old, experience: old.experience.filter(job => job.id !== id) }))
    setNotice('Experience removed')
  }

  const generatedLetter = buildLetter(cv, letter)

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutTemplate },
    { id: 'cv', label: 'CV Editor', icon: UserRound },
    { id: 'letter', label: 'Cover Letter', icon: Mail },
    { id: 'design', label: 'Design Studio', icon: Palette },
    { id: 'export', label: 'Export Center', icon: Download }
  ]

  return (
    <section className="pass-workspace" id="vellon-pass">
      <header className="pass-luxury-header">
        <div className="pass-brand-lockup">
          <div className="pass-brand-icon"><Crown size={22}/></div>
          <div>
            <div className="pass-brand-name">VÉLLON <span>PASS</span></div>
            <div className="pass-brand-subtitle">THE PREMIUM CAREER STUDIO</div>
          </div>
        </div>
        <div className="pass-header-status"><span/> PRIVATE WORKSPACE</div>
      </header>

      <div className="pass-workspace-intro">
        <div>
          <div className="pass-eyebrow"><Sparkles size={14}/> YOUR CAREER. YOUR PRESENTATION.</div>
          <h2>Make your next move <span>count.</span></h2>
          <p>A dedicated space for your premium CV, tailored cover letter, and polished application documents.</p>
        </div>
        <div className="pass-monogram" aria-label="VÉLLON PASS design mark">
          <span>VÉLLON</span><strong>PASS</strong><small>CAREER STUDIO</small>
        </div>
      </div>

      <nav className="pass-workspace-nav" aria-label="PASS workspace">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <button key={item.id} className={view === item.id ? 'active' : ''}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}>
              <Icon size={16}/><span>{item.label}</span>
              {view === item.id && <ChevronRight size={13} className="pass-nav-arrow"/>}
            </button>
          )
        })}
      </nav>

      <div className="pass-workspace-content">
        {view === 'overview' && (
          <div className="pass-overview">
            <div className="pass-welcome-card">
              <div>
                <div className="pass-eyebrow">YOUR PRIVATE CAREER DESK</div>
                <h3>Welcome to your studio.</h3>
                <p>Build and refine your application documents independently of the free CV editor.</p>
                <button className="pass-primary-button" onClick={() => setView('cv')}>
                  Open CV editor <ChevronRight size={16}/>
                </button>
              </div>
              <div className="pass-welcome-emblem"><Crown size={35}/><span>PASS</span></div>
            </div>

            <div className="pass-overview-grid">
              <button className="pass-feature-card" onClick={() => setView('cv')}>
                <span className="pass-feature-icon"><FileText size={20}/></span>
                <strong>Premium CV</strong>
                <small>Edit your profile, skills, experience, and education.</small>
                <span className="pass-feature-link">EDIT CV <ChevronRight size={13}/></span>
              </button>
              <button className="pass-feature-card" onClick={() => setView('letter')}>
                <span className="pass-feature-icon"><Mail size={20}/></span>
                <strong>Cover letter studio</strong>
                <small>Tailor a letter to the role and company you're applying to.</small>
                <span className="pass-feature-link">EDIT LETTER <ChevronRight size={13}/></span>
              </button>
              <button className="pass-feature-card" onClick={() => setView('design')}>
                <span className="pass-feature-icon"><Palette size={20}/></span>
                <strong>Design studio</strong>
                <small>Choose a finish and tune document typography and spacing.</small>
                <span className="pass-feature-link">CUSTOMIZE <ChevronRight size={13}/></span>
              </button>
              <button className="pass-feature-card" onClick={() => setView('export')}>
                <span className="pass-feature-icon"><Download size={20}/></span>
                <strong>Export center</strong>
                <small>Download your CV and cover letter as separate PDFs.</small>
                <span className="pass-feature-link">EXPORT FILES <ChevronRight size={13}/></span>
              </button>
            </div>

            <div className="pass-isolation-note">
              <ShieldCheck size={17}/>
              <div><strong>Independent PASS workspace</strong><p>Changes here stay inside PASS. Use the import button to copy the current free CV into PASS whenever you choose.</p></div>
            </div>
          </div>
        )}

        {view === 'cv' && (
          <div className="pass-editor-layout">
            <div className="pass-editor-panel">
              <div className="pass-section-heading">
                <div><div className="pass-eyebrow">DOCUMENT 01</div><h3>Premium CV editor</h3></div>
                <span className="pass-live-chip"><span/> LIVE DRAFT</span>
              </div>
              <p className="pass-helper">Edit the premium copy here. These fields do not update your free CV.</p>

              <div className="pass-form-grid">
                <Field label="Full name" value={cv.name} onChange={v => updateCV('name', v)} placeholder="Your full name"/>
                <Field label="Professional title" value={cv.title} onChange={v => updateCV('title', v)} placeholder="e.g. Operations Coordinator"/>
                <Field label="Email address" value={cv.email} onChange={v => updateCV('email', v)} placeholder="you@example.com"/>
                <Field label="Phone number" value={cv.phone} onChange={v => updateCV('phone', v)} placeholder="+27 ..."/>
                <Field label="Location" value={cv.location} onChange={v => updateCV('location', v)} placeholder="City, country"/>
              </div>

              <Field label="Professional profile" value={cv.summary} onChange={v => updateCV('summary', v)}
                multiline rows={5} placeholder="Write a concise, accurate summary of your experience and strengths."/>

              <Field label="Core skills" value={cv.skills} onChange={v => updateCV('skills', v)}
                multiline rows={4} placeholder="Separate skills with commas or line breaks."/>

              <div className="pass-repeater-heading">
                <div><h4>Professional experience</h4><p>Add roles with clear dates and achievement-focused details.</p></div>
                <button className="pass-secondary-button" onClick={addExperience}><Plus size={15}/> Add role</button>
              </div>

              {cv.experience.map((job, index) => (
                <div className="pass-experience-card" key={job.id}>
                  <div className="pass-experience-top"><strong>ROLE {String(index + 1).padStart(2, '0')}</strong>
                    <button aria-label={`Remove role ${index + 1}`} onClick={() => removeExperience(job.id)}><Trash2 size={15}/></button>
                  </div>
                  <div className="pass-form-grid">
                    <Field label="Job title" value={job.role} onChange={v => updateExperience(job.id, 'role', v)} placeholder="Position"/>
                    <Field label="Company" value={job.company} onChange={v => updateExperience(job.id, 'company', v)} placeholder="Organization"/>
                    <Field label="Dates" value={job.dates} onChange={v => updateExperience(job.id, 'dates', v)} placeholder="2022 – 2025"/>
                  </div>
                  <Field label="Responsibilities and achievements" value={job.details}
                    onChange={v => updateExperience(job.id, 'details', v)} multiline rows={4}
                    placeholder="Describe your actual responsibilities, results, and contributions."/>
                </div>
              ))}

              <Field label="Education and qualifications" value={cv.education} onChange={v => updateCV('education', v)}
                multiline rows={4} placeholder="Qualifications, institution, and dates."/>

              <div className="pass-editor-actions">
                <button className="pass-secondary-button" onClick={() => {
                  setCV(seedCV(form))
                  setNotice('PASS CV replaced with a fresh copy of the free CV')
                }}><RotateCcw size={15}/> Import free CV</button>
                <button className="pass-primary-button" onClick={() => setView('export')}>Continue to export <ChevronRight size={15}/></button>
              </div>
            </div>

            <CVPreview cv={cv} theme={settings.theme}/>
          </div>
        )}

        {view === 'letter' && (
          <div className="pass-editor-layout">
            <div className="pass-editor-panel">
              <div className="pass-section-heading">
                <div><div className="pass-eyebrow">DOCUMENT 02</div><h3>Cover letter studio</h3></div>
                <Mail size={20} className="pass-accent-icon"/>
              </div>
              <p className="pass-helper">The letter is independent. Add your own content or edit the suggested draft in full.</p>
              <div className="pass-form-grid">
                <Field label="Recipient name" value={letter.recipient} onChange={v => updateLetter('recipient', v)} placeholder="Hiring manager"/>
                <Field label="Company" value={letter.company} onChange={v => updateLetter('company', v)} placeholder="Company name"/>
                <Field label="Position" value={letter.role} onChange={v => updateLetter('role', v)} placeholder="Role you're applying for"/>
                <Field label="Date" value={letter.date} onChange={v => updateLetter('date', v)} placeholder="Application date"/>
              </div>
              <Field label="Letter content" value={letter.body} onChange={v => updateLetter('body', v)}
                multiline rows={18} placeholder={generatedLetter}/>
              <div className="pass-editor-actions">
                <button className="pass-secondary-button" onClick={() => updateLetter('body', '')}><RotateCcw size={15}/> Restore suggested draft</button>
                <button className="pass-primary-button" onClick={() => setView('export')}>Continue to export <ChevronRight size={15}/></button>
              </div>
            </div>
            <LetterPreview cv={cv} letter={letter} body={generatedLetter} theme={settings.theme}/>
          </div>
        )}

        {view === 'design' && (
          <div className="pass-design-layout">
            <div className="pass-editor-panel">
              <div className="pass-section-heading">
                <div><div className="pass-eyebrow">DESIGN SYSTEM</div><h3>Set the finish.</h3></div>
                <Palette size={20} className="pass-accent-icon"/>
              </div>
              <p className="pass-helper">These settings apply to the PASS CV and cover-letter PDFs.</p>

              <div className="pass-theme-options">
                <button className={settings.theme === 'obsidian' ? 'selected' : ''} onClick={() => updateSettings('theme', 'obsidian')}>
                  <span className="pass-theme-swatch obsidian-swatch"><i/></span>
                  <strong>Obsidian Luxury</strong><small>Matte black · Champagne gold</small>
                  {settings.theme === 'obsidian' && <Check size={17}/>}
                </button>
                <button className={settings.theme === 'ivory' ? 'selected' : ''} onClick={() => updateSettings('theme', 'ivory')}>
                  <span className="pass-theme-swatch ivory-swatch"><i/></span>
                  <strong>Ivory Editorial</strong><small>Warm paper · Antique gold</small>
                  {settings.theme === 'ivory' && <Check size={17}/>}
                </button>
              </div>

              <div className="pass-setting-row">
                <div><strong>Body text size</strong><small>Adjust the exported CV's body typography.</small></div>
                <select value={settings.fontSize} onChange={e => updateSettings('fontSize', Number(e.target.value))}>
                  <option value={8}>Compact · 8 pt</option>
                  <option value={9}>Standard · 9 pt</option>
                  <option value={10}>Comfortable · 10 pt</option>
                </select>
              </div>
              <div className="pass-setting-row">
                <div><strong>Line spacing</strong><small>Control vertical rhythm in the CV.</small></div>
                <select value={settings.lineHeight} onChange={e => updateSettings('lineHeight', Number(e.target.value))}>
                  <option value={4.5}>Tight</option>
                  <option value={5}>Balanced</option>
                  <option value={6}>Airy</option>
                </select>
              </div>
              <div className="pass-setting-row">
                <div><strong>Section spacing</strong><small>Space between CV sections.</small></div>
                <select value={settings.spacing} onChange={e => updateSettings('spacing', Number(e.target.value))}>
                  <option value={3}>Compact</option>
                  <option value={5}>Balanced</option>
                  <option value={8}>Airy</option>
                </select>
              </div>
              <div className="pass-isolation-note"><ShieldCheck size={17}/><div><strong>Designed for professional use</strong><p>Obsidian is the statement finish. Ivory Editorial is a lighter option when a more traditional CV is appropriate.</p></div></div>
            </div>
            <CVPreview cv={cv} theme={settings.theme}/>
          </div>
        )}

        {view === 'export' && (
          <div className="pass-export-center">
            <div className="pass-section-heading">
              <div><div className="pass-eyebrow">FINAL DOCUMENTS</div><h3>Your export center</h3></div>
              <Download size={20} className="pass-accent-icon"/>
            </div>
            <p className="pass-helper">Generate separate PDF files from your current PASS drafts and design settings.</p>
            <div className="pass-export-grid">
              <article className="pass-export-card">
                <div className="pass-export-icon"><FileText size={25}/></div>
                <div className="pass-eyebrow">DOCUMENT 01</div>
                <h4>Premium CV</h4>
                <p>{cv.name || 'Your name'}{cv.title ? ` · ${cv.title}` : ''}</p>
                <div className="pass-export-meta"><span>PDF · A4</span><span>{themes[settings.theme].label}</span></div>
                <button className="pass-primary-button" onClick={() => exportCV(cv, settings)}><Download size={16}/> Export CV PDF</button>
                {!cv.name.trim() && <small className="pass-export-warning">Add your name in CV Editor before exporting.</small>}
              </article>
              <article className="pass-export-card">
                <div className="pass-export-icon"><Mail size={25}/></div>
                <div className="pass-eyebrow">DOCUMENT 02</div>
                <h4>Cover letter</h4>
                <p>{letter.role || cv.title || 'Application letter'}{letter.company ? ` · ${letter.company}` : ''}</p>
                <div className="pass-export-meta"><span>PDF · A4</span><span>Matching design</span></div>
                <button className="pass-primary-button" onClick={() => exportLetter(cv, letter, settings)}><Download size={16}/> Export letter PDF</button>
                {!cv.name.trim() && <small className="pass-export-warning">Add your name in CV Editor before exporting.</small>}
              </article>
            </div>
            <div className="pass-isolation-note"><ShieldCheck size={17}/><div><strong>Before you send</strong><p>Check contact details, dates, spelling, and every claim. The PASS design mark is branding only, not an accreditation or employment guarantee.</p></div></div>
          </div>
        )}
      </div>

      <footer className="pass-workspace-footer">
        <span><ShieldCheck size={14}/> YOUR DOCUMENTS, YOUR DETAILS</span>
        <span>{notice || 'Independent PASS draft'} · Not synced to the free editor</span>
      </footer>
    </section>
  )
}

function CVPreview({ cv, theme }) {
  return (
    <aside className={`pass-live-preview pass-preview-${theme}`}>
      <div className="pass-preview-toolbar"><span><Eye size={15}/> LIVE DOCUMENT PREVIEW</span><span>A4 FORMAT</span></div>
      <article className="pass-paper-preview">
        <header className="pass-paper-header">
          <div className="pass-paper-brand">VÉLLON <span>PASS</span></div>
          <div className="pass-paper-rule"/>
          <h4>{cv.name || 'YOUR NAME'}</h4>
          <p>{cv.title || 'PROFESSIONAL PROFILE'}</p>
          <small>{[cv.email, cv.phone, cv.location].filter(Boolean).join('  ·  ') || 'EMAIL · PHONE · LOCATION'}</small>
        </header>
        <div className="pass-paper-body">
          {cv.summary && <section><h5>Professional Profile</h5><p>{cv.summary}</p></section>}
          {cv.skills && <section><h5>Core Skills</h5><p>{cv.skills}</p></section>}
          {cv.experience.filter(j => j.role || j.company || j.dates || j.details).map(job => (
            <section key={job.id}><h5>Professional Experience</h5>
              <strong>{[job.role, job.company].filter(Boolean).join(' — ') || 'Experience'}</strong>
              {job.dates && <small>{job.dates}</small>}
              {job.details && <p>{job.details}</p>}
            </section>
          ))}
          {cv.education && <section><h5>Education & Qualifications</h5><p>{cv.education}</p></section>}
          {!cv.summary && !cv.skills && !cv.education && !cv.experience.some(j => j.role || j.company || j.details) && (
            <p className="pass-preview-placeholder">Your CV sections will appear here as you edit them.</p>
          )}
        </div>
        <footer className="pass-paper-footer"><span>VÉLLON PASS</span><span>PROFESSIONAL APPLICATION</span></footer>
      </article>
      <div className="pass-preview-caption"><Award size={14}/> {themes[theme].label}</div>
    </aside>
  )
}

function LetterPreview({ cv, letter, body, theme }) {
  return (
    <aside className={`pass-live-preview pass-preview-${theme}`}>
      <div className="pass-preview-toolbar"><span><Eye size={15}/> LETTER PREVIEW</span><span>A4 FORMAT</span></div>
      <article className="pass-paper-preview pass-paper-letter">
        <header className="pass-paper-header">
          <div className="pass-paper-brand">VÉLLON <span>PASS</span></div>
          <div className="pass-paper-rule"/>
          <h4>{cv.name || 'YOUR NAME'}</h4>
          <small>{[cv.email, cv.phone, cv.location].filter(Boolean).join('  ·  ')}</small>
        </header>
        <div className="pass-letter-paper-body">
          <small>{letter.date}</small>
          {[letter.recipient, letter.company, letter.role && `Re: ${letter.role}`].filter(Boolean).map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
          <p className="pass-letter-paper-content">{body}</p>
        </div>
        <footer className="pass-paper-footer"><span>VÉLLON PASS</span><span>PROFESSIONAL CORRESPONDENCE</span></footer>
      </article>
      <div className="pass-preview-caption"><Mail size={14}/> Matching cover-letter design</div>
    </aside>
  )
}
