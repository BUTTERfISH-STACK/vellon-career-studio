import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import {
  ArrowRight, Check, Crown, Download, FileText, LayoutDashboard,
  Mail, Palette, Plus, RotateCcw, ShieldCheck, Trash2, UserRound
} from 'lucide-react'
import './VellonPass.css'

const STORAGE_KEY = 'vellon-pass-draft-v2'

const themes = {
  obsidian: {
    label: 'Obsidian Luxury',
    paper: [13, 13, 13],
    text: [245, 241, 231],
    accent: [216, 181, 107],
    muted: [174, 166, 149]
  },
  ivory: {
    label: 'Ivory Editorial',
    paper: [250, 247, 239],
    text: [37, 34, 29],
    accent: [145, 108, 43],
    muted: [105, 99, 88]
  }
}

const cvTemplates = [
  { id: 'executive', label: 'Executive', description: 'Centered name and formal hierarchy' },
  { id: 'modern-professional', label: 'Modern Professional', description: 'Clean left-aligned contemporary layout' },
  { id: 'ats-classic', label: 'ATS Classic', description: 'Simple, restrained, recruiter-friendly layout' },
  { id: 'vellon-signature', label: 'VÉLLON Signature', description: 'Black-and-gold premium identity' },
  { id: 'creative', label: 'Creative', description: 'Distinctive accent panel and strong hierarchy' },
  { id: 'compact', label: 'Compact', description: 'Tighter spacing for concise applications' }
]

const letterStyles = [
  { id: 'signature', label: 'Signature', description: 'Premium branded letterhead' },
  { id: 'formal', label: 'Formal', description: 'Traditional business correspondence' },
  { id: 'modern', label: 'Modern', description: 'Clean, left-aligned presentation' },
  { id: 'minimal', label: 'Minimal', description: 'Quiet styling with minimal decoration' }
]

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
    experience: Array.isArray(form.experience)
      ? form.experience.map(job => ({
          id: job.id || newId(),
          role: job.role || '',
          company: job.company || '',
          dates: job.dates || '',
          details: job.details || ''
        }))
      : []
  }
}

function loadDraft(form) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved?.version === 2 && saved.cv && typeof saved.cv === 'object') {
      return {
        cv: { ...seedCV(form), ...saved.cv,
          experience: Array.isArray(saved.cv.experience) ? saved.cv.experience : [] },
        letter: saved.letter || {},
        settings: saved.settings || {}
      }
    }
  } catch {
    // Invalid or unavailable local storage must not prevent the editor opening.
  }
  return { cv: seedCV(form), letter: {}, settings: {} }
}

function suggestedLetter(cv, letter) {
  if (letter.body?.trim()) return letter.body.trim()

  return [
    `Dear ${letter.recipient?.trim() || 'Hiring Manager'},`,
    '',
    `I am writing to apply for the ${letter.role?.trim() || cv.title?.trim() || 'position'}${letter.company?.trim() ? ` at ${letter.company.trim()}` : ''}.`,
    '',
    cv.summary?.trim() || 'I am interested in contributing my skills, experience, and commitment to your team.',
    '',
    cv.skills?.trim() ? `My relevant skills include ${cv.skills.trim()}.` : 'I would welcome the opportunity to discuss my suitability for this position.',
    '',
    'Thank you for considering my application. I look forward to the opportunity to discuss my application with you.',
    '',
    'Kind regards,',
    cv.name?.trim() || '[Your name]'
  ].join('\n')
}

function Field({ label, value, onChange, placeholder = '', multiline = false, rows = 3, type = 'text' }) {
  return (
    <label className="vp2-field">
      <span>{label}</span>
      {multiline ? (
        <textarea rows={rows} value={value || ''} placeholder={placeholder}
          onChange={event => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value || ''} placeholder={placeholder}
          onChange={event => onChange(event.target.value)} />
      )}
    </label>
  )
}

function Preview({ cv, theme, template = 'vellon-signature' }) {
  const visibleJobs = cv.experience.filter(job =>
    [job.role, job.company, job.dates, job.details].some(value => String(value || '').trim())
  )

  return (
    <aside className={`vp2-preview vp2-paper-${theme}`}>
      <div className="vp2-preview-label"><EyeIcon /> LIVE DOCUMENT PREVIEW</div>
      <article className={`vp2-paper vp2-template-${template}`}>
        {template === 'creative' && <div className="vp2-template-accent" />}
        <div className="vp2-paper-brand">VÉLLON <span>/ PASS</span></div>
        <h2>{cv.name || 'Your Full Name'}</h2>
        <p className="vp2-paper-title">{cv.title || 'Professional Title'}</p>
        <p className="vp2-paper-contact">
          {[cv.email, cv.phone, cv.location].filter(Boolean).join(' · ') || 'Email · Phone · Location'}
        </p>
        {cv.summary && <section><h3>PROFILE</h3><p>{cv.summary}</p></section>}
        {cv.skills && <section><h3>CORE SKILLS</h3><p>{cv.skills}</p></section>}
        {visibleJobs.length > 0 && (
          <section>
            <h3>EXPERIENCE</h3>
            {visibleJobs.map(job => (
              <div className="vp2-paper-job" key={job.id}>
                <strong>{job.role || 'Position'}{job.company ? ` — ${job.company}` : ''}</strong>
                {job.dates && <small>{job.dates}</small>}
                {job.details && <p>{job.details}</p>}
              </div>
            ))}
          </section>
        )}
        {cv.education && <section><h3>EDUCATION</h3><p>{cv.education}</p></section>}
        <footer>VÉLLON PASS <span>PROFESSIONAL PROFILE</span></footer>
      </article>
      <p className="vp2-preview-note">Preview approximation. The exported PDF uses a print-ready A4 layout.</p>
    </aside>
  )
}
function EyeIcon() { return <span aria-hidden="true">◉</span> }

async function exportPDF(kind, cv, letter, settings, onPremiumExport) {
  if (!cv.name.trim()) {
    window.alert('Enter your full name in the CV editor before exporting.')
    return
  }

  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const palette = themes[kind === 'letter' ? (settings.letterTheme || settings.theme) : settings.theme] || themes.obsidian
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = settings.template === 'compact' && kind === 'cv' ? 14 : 19
  const width = pageW - margin * 2
  const bottom = pageH - 23
  let y = 32

  const background = () => {
    doc.setFillColor(...palette.paper)
    doc.rect(0, 0, pageW, pageH, 'F')
  }
  background()
  const selectedTemplate = settings.template || 'vellon-signature'
  if (kind === 'cv' && selectedTemplate === 'creative') {
    doc.setFillColor(...palette.accent)
    doc.rect(0, 0, 7, pageH, 'F')
  } else if (kind === 'cv' && selectedTemplate === 'executive') {
    doc.setFillColor(...palette.accent)
    doc.rect(0, 0, pageW, 5, 'F')
  }

  const nextPage = () => {
    doc.addPage()
    background()
    y = 30
  }

  const write = (value, size = 9, color = palette.text, style = 'normal', gap = 0) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(value || ''), width)
    for (const line of lines) {
      if (y + size * 0.38 > bottom) nextPage()
      doc.text(line, margin, y)
      y += Math.max(size * 0.42, 3.5)
    }
    y += gap
  }

  const centeredWrite = (value, baseSize, minSize, color, style = 'normal', gap = 0) => {
    const text = String(value || '').trim()
    if (!text) {
      y += gap
      return
    }

    let size = baseSize
    doc.setFont('helvetica', style)

    // Reduce the font size before allowing a long heading to wrap.
    doc.setFontSize(size)
    while (size > minSize && doc.getTextWidth(text) > width) {
      size = Math.max(minSize, size - 0.5)
      doc.setFontSize(size)
    }

    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, width)

    for (const line of lines) {
      if (y + size * 0.45 > bottom) nextPage()
      doc.text(line, pageW / 2, y, { align: 'center', maxWidth: width })
      y += Math.max(size * 0.48, 3.5)
    }

    y += gap
  }

  const heading = value => {
    y += 2
    write(value.toUpperCase(), 10, palette.accent, 'bold', 2)
    doc.setDrawColor(...palette.accent)
    doc.setLineWidth(0.25)
    doc.line(margin, y - 1, pageW - margin, y - 1)
    y += 3
  }

  if (kind === 'cv') {
    const template = settings.template || 'vellon-signature'
    const contact = [cv.email, cv.phone, cv.location].filter(Boolean).join('  |  ')

    if (template === 'ats-classic' || template === 'modern-professional' || template === 'compact') {
      write(cv.name, template === 'compact' ? 19 : 22, palette.text, 'bold', 1)
      write(cv.title || 'Professional Profile', 10, palette.accent, 'bold', 2)
      write(contact, 8, palette.muted, 'normal', 5)
    } else if (template === 'creative') {
      y = 32
      write(cv.name, 22, palette.accent, 'bold', 1)
      write(cv.title || 'Professional Profile', 11, palette.text, 'bold', 2)
      write(contact, 8, palette.muted, 'normal', 5)
    } else {
      centeredWrite(cv.name, template === 'executive' ? 25 : 23, 12, palette.accent, 'bold', 1)
      centeredWrite(cv.title || 'Professional Profile', 11, 8, palette.text, 'normal', 2)
      centeredWrite(contact, 8, 7, palette.muted, 'normal', 5)
    }

    if (cv.summary.trim()) {
      heading('Professional Profile')
      write(cv.summary, settings.fontSize, palette.text, 'normal', settings.spacing)
    }
    if (cv.skills.trim()) {
      heading('Core Skills')
      write(cv.skills, settings.fontSize, palette.text, 'normal', settings.spacing)
    }

    const jobs = cv.experience.filter(job =>
      [job.role, job.company, job.dates, job.details].some(value => String(value || '').trim())
    )
    if (jobs.length) {
      heading('Professional Experience')
      jobs.forEach(job => {
        write([job.role, job.company].filter(Boolean).join(' — ') || 'Experience',
          9, palette.accent, 'bold', 1)
        if (job.dates) write(job.dates, 8, palette.muted, 'normal', 1)
        if (job.details) write(job.details, settings.fontSize, palette.text, 'normal', 3)
      })
    }
    if (cv.education.trim()) {
      heading('Education & Qualifications')
      write(cv.education, settings.fontSize, palette.text, 'normal', 2)
    }
  } else {
    const style = settings.letterStyle || 'signature'
    const contact = [cv.title, cv.email, cv.phone, cv.location].filter(Boolean).join(' · ')
    if (style === 'signature') {
      centeredWrite(cv.name, 22, 12, palette.accent, 'bold', 1)
      centeredWrite(contact, 8, 7, palette.muted, 'normal', 7)
    } else if (style === 'formal') {
      write(cv.name, 18, palette.text, 'bold', 1)
      write(contact, 8, palette.muted, 'normal', 7)
    } else if (style === 'modern') {
      write(cv.name, 21, palette.accent, 'bold', 1)
      write(contact, 9, palette.text, 'normal', 7)
    } else {
      write(cv.name, 17, palette.text, 'normal', 1)
      write(contact, 8, palette.muted, 'normal', 6)
    }
    write(letter.date || new Date().toLocaleDateString(), 9, palette.muted, 'normal', 6)
    if (letter.recipient) write(letter.recipient, 10, palette.text, 'bold', 1)
    if (letter.company) write(letter.company, 10, palette.text, 'normal', 1)
    if (letter.role) write(`Re: ${letter.role}`, 10, palette.accent, 'bold', 6)
    write(suggestedLetter(cv, letter), 10, palette.text, 'normal', 2)
  }

  const totalPages = doc.internal.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setTextColor(...palette.accent)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('VÉLLON  /  PASS', margin, 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(kind === 'cv' ? 'CURRICULUM VITAE' : 'COVER LETTER', pageW - margin, 14, { align: 'right' })
    doc.setDrawColor(...palette.accent)
    doc.setLineWidth(0.3)
    doc.line(margin, 18, pageW - margin, 18)
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16)
    doc.setTextColor(...palette.muted)
    doc.text('PROFESSIONAL APPLICATION DOCUMENT', margin, pageH - 10)
    doc.text(`${page} / ${totalPages}`, pageW - margin, pageH - 10, { align: 'right' })
  }

  const safeName = cv.name.trim().replace(/[^a-z0-9_-]+/gi, '-').slice(0, 55) || 'Candidate'
  const filename = `${safeName}-Vellon-PASS-${kind === 'cv' ? 'CV' : 'Cover-Letter'}.pdf`
  if (kind === 'cv' && typeof onPremiumExport === 'function') {
    // Generate the PDF blob before reserving a reward, so generation errors
    // do not consume the user's credit.
    const pdfBlob = doc.output('blob')
    await onPremiumExport(() => {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    })
  } else {
    doc.save(filename)
  }
}

export default function VellonPass({ form = {}, onPremiumExport, rewardMode = false }) {
  const [initial] = useState(() => loadDraft(form))
  const [cv, setCV] = useState(initial.cv)
  const [letter, setLetter] = useState({
    recipient: '',
    company: '',
    role: '',
    date: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
    body: '',
    ...initial.letter
  })
  const [settings, setSettings] = useState({
    theme: 'obsidian',
    template: 'vellon-signature',
    letterTheme: initial.settings?.letterTheme || initial.settings?.theme || 'obsidian',
    letterStyle: 'signature',
    fontSize: 9,
    spacing: 4,
    ...initial.settings
  })
  const [view, setView] = useState('home')
  const [notice, setNotice] = useState('Your workspace is ready')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, cv, letter, settings }))
    } catch {
      // Keep the current draft usable if browser storage is unavailable.
      // Avoid setting React state synchronously inside this persistence effect.
      console.warn('VÉLLON PASS: local draft saving is unavailable.')
    }
  }, [cv, letter, settings])

  const updateCV = (key, value) => {
    setCV(old => ({ ...old, [key]: value }))
    setNotice('Changes saved locally')
  }
  const updateLetter = (key, value) => {
    setLetter(old => ({ ...old, [key]: value }))
    setNotice('Changes saved locally')
  }
  const updateSettings = (key, value) => {
    setSettings(old => ({ ...old, [key]: value }))
    setNotice('Design updated')
  }
  const updateJob = (id, key, value) => {
    setCV(old => ({
      ...old,
      experience: old.experience.map(job => job.id === id ? { ...job, [key]: value } : job)
    }))
  }
  const addJob = () => setCV(old => ({
    ...old,
    experience: [...old.experience, { id: newId(), role: '', company: '', dates: '', details: '' }]
  }))

  const nav = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'cv', label: 'CV Studio', icon: UserRound },
    { id: 'letter', label: 'Cover Letter', icon: Mail },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'export', label: 'Export', icon: Download }
  ]

  return (
    <section className="vp2" id="vellon-pass">
      <header className="vp2-header">
        <a className="vp2-brand" href="#vellon-pass" onClick={event => { event.preventDefault(); setView('home') }}>
          <span className="vp2-brand-mark"><Crown size={20}/></span>
          <span><strong>VÉLLON <i>PASS</i></strong><small>YOUR PRIVATE CAREER STUDIO</small></span>
        </a>
        <div className="vp2-private"><ShieldCheck size={15}/> PRIVATE WORKSPACE</div>
      </header>

      <div className="vp2-intro">
        <div>
          <span className="vp2-kicker">THE NEXT CHAPTER STARTS HERE</span>
          <h2>Your career.<br/><em>Presented properly.</em></h2>
          <p>Create professional application documents with a live preview, thoughtful design controls, and print-ready PDF exports.</p>
        </div>
        <div className="vp2-seal"><Crown size={27}/><strong>PASS</strong><small>CAREER STUDIO</small></div>
      </div>

      <nav className="vp2-nav" aria-label="PASS workspace navigation">
        {nav.map(item => {
          const Icon = item.icon
          return (
            <button type="button" key={item.id} className={view === item.id ? 'is-active' : ''}
              onClick={() => setView(item.id)}>
              <Icon size={16}/><span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="vp2-status"><span className="vp2-status-dot"/>{notice}</div>

      {view === 'home' && (
        <div className="vp2-home">
          <div className="vp2-hero-card">
            <div><span className="vp2-kicker">YOUR DOCUMENT WORKSPACE</span>
              <h3>Make a stronger first impression.</h3>
              <p>Your own CV and cover-letter workspace. Drafts save locally on this device.</p>
              <div className="vp2-home-actions">
                <button type="button" className="vp2-primary" onClick={() => setView('cv')}>
                  Open CV Studio <ArrowRight size={16}/>
                </button>
                <button type="button" className="vp2-secondary vp2-quick-export"
                  onClick={() => exportPDF('cv', cv, letter, settings, onPremiumExport)}>
                  <Download size={16}/> Download CV PDF
                </button>
              </div>
            </div>
            <div className="vp2-hero-icon"><Crown size={34}/><span>V / P</span></div>
          </div>
          <div className="vp2-tiles">
            <button type="button" onClick={() => setView('cv')}><FileText/><strong>CV Studio</strong><span>Edit your profile, skills, experience, and education.</span><b>OPEN STUDIO →</b></button>
            <button type="button" onClick={() => setView('letter')}><Mail/><strong>Cover Letter</strong><span>Prepare a tailored letter for a specific application.</span><b>WRITE LETTER →</b></button>
            <button type="button" onClick={() => setView('design')}><Palette/><strong>Design System</strong><span>Choose a document finish and adjust typography.</span><b>CHOOSE STYLE →</b></button>
            <button type="button" onClick={() => setView('export')}><Download/><strong>Export Center</strong><span>Download your documents as separate PDF files.</span><b>EXPORT FILES →</b></button>
          </div>
          <div className="vp2-privacy"><ShieldCheck size={19}/><div><strong>Local-first drafts</strong><p>PASS stores its draft in this browser on this device. Clearing site data may remove saved drafts, so export important documents.</p></div></div>
        </div>
      )}

      {view === 'cv' && (
        <div className="vp2-editor-layout">
          <div className="vp2-panel">
            <div className="vp2-panel-heading"><div><span className="vp2-kicker">DOCUMENT 01</span><h3>Build your CV</h3></div><span className="vp2-live">LIVE EDITOR</span></div>
            <p className="vp2-help">Keep information accurate and relevant to the job. Your edits here do not change the free CV.</p>
            <div className="vp2-fields">
              <Field label="Full name" value={cv.name} onChange={v => updateCV('name', v)} placeholder="Your full name"/>
              <Field label="Professional title" value={cv.title} onChange={v => updateCV('title', v)} placeholder="e.g. Sales Consultant"/>
              <Field label="Email address" type="email" value={cv.email} onChange={v => updateCV('email', v)} placeholder="you@example.com"/>
              <Field label="Phone number" value={cv.phone} onChange={v => updateCV('phone', v)} placeholder="+27 ..."/>
              <Field label="Location" value={cv.location} onChange={v => updateCV('location', v)} placeholder="Town or city"/>
            </div>
            <Field label="Professional profile" value={cv.summary} onChange={v => updateCV('summary', v)} multiline rows={5} placeholder="A concise, factual introduction to your strengths and experience."/>
            <Field label="Core skills" value={cv.skills} onChange={v => updateCV('skills', v)} multiline rows={4} placeholder="Use commas or line breaks between skills."/>
            <div className="vp2-repeat-heading"><div><h4>Experience</h4><p>Add roles, dates, and real responsibilities.</p></div><button type="button" className="vp2-secondary" onClick={addJob}><Plus size={15}/> Add role</button></div>
            {cv.experience.map((job, index) => (
              <div className="vp2-job" key={job.id}>
                <div className="vp2-job-heading"><strong>POSITION {String(index + 1).padStart(2, '0')}</strong><button type="button" aria-label={`Remove position ${index + 1}`} onClick={() => setCV(old => ({ ...old, experience: old.experience.filter(item => item.id !== job.id) }))}><Trash2 size={15}/></button></div>
                <div className="vp2-fields">
                  <Field label="Job title" value={job.role} onChange={v => updateJob(job.id, 'role', v)} placeholder="Position"/>
                  <Field label="Company" value={job.company} onChange={v => updateJob(job.id, 'company', v)} placeholder="Organization"/>
                  <Field label="Dates" value={job.dates} onChange={v => updateJob(job.id, 'dates', v)} placeholder="2023–2025"/>
                </div>
                <Field label="Responsibilities and achievements" value={job.details} onChange={v => updateJob(job.id, 'details', v)} multiline rows={4} placeholder="Describe your actual work and contributions."/>
              </div>
            ))}
            <Field label="Education and qualifications" value={cv.education} onChange={v => updateCV('education', v)} multiline rows={4} placeholder="Qualification, institution, and year."/>
            <div className="vp2-actions">
              <button type="button" className="vp2-secondary" onClick={() => { setCV(seedCV(form)); setNotice('Imported the current free CV') }}><RotateCcw size={15}/> Import free CV</button>
              <button type="button" className="vp2-primary" onClick={() => setView('export')}>Continue to export <ArrowRight size={15}/></button>
            </div>
          </div>
          <Preview cv={cv} theme={settings.theme} template={settings.template || 'vellon-signature'}/>
        </div>
      )}

      {view === 'letter' && (
        <div className="vp2-editor-layout">
          <div className="vp2-panel">
            <div className="vp2-panel-heading"><div><span className="vp2-kicker">DOCUMENT 02</span><h3>Write your letter</h3></div><Mail className="vp2-gold-icon"/></div>
            <p className="vp2-help">A suggested letter is generated from your CV details. Enter your own text to replace it, or restore the suggestion.</p>
            <div className="vp2-fields">
              <Field label="Recipient" value={letter.recipient} onChange={v => updateLetter('recipient', v)} placeholder="Hiring manager"/>
              <Field label="Company" value={letter.company} onChange={v => updateLetter('company', v)} placeholder="Company name"/>
              <Field label="Position" value={letter.role} onChange={v => updateLetter('role', v)} placeholder="Position applying for"/>
              <Field label="Date" value={letter.date} onChange={v => updateLetter('date', v)} placeholder="Application date"/>
            </div>
            <Field label="Letter content" value={letter.body || ''} onChange={v => updateLetter('body', v)} multiline rows={17} placeholder={suggestedLetter(cv, letter)}/>
            <div className="vp2-actions">
              <button type="button" className="vp2-secondary" onClick={() => updateLetter('body', '')}><RotateCcw size={15}/> Restore suggestion</button>
              <button type="button" className="vp2-primary" onClick={() => setView('export')}>Continue to export <ArrowRight size={15}/></button>
            </div>
          </div>
          <aside className={`vp2-preview vp2-paper-${settings.letterTheme || settings.theme}`}>
            <div className="vp2-preview-label"><Mail size={14}/> LIVE LETTER PREVIEW</div>
            <article className={`vp2-paper vp2-letter-paper vp2-letter-style-${settings.letterStyle || 'signature'}`}>
              <div className="vp2-paper-brand">VÉLLON <span>/ PASS</span></div>
              <h2>{cv.name || 'Your Full Name'}</h2>
              <p className="vp2-paper-contact">{[cv.email, cv.phone, cv.location].filter(Boolean).join(' · ')}</p>
              <p>{letter.date}</p>
              <p>{letter.recipient}<br/>{letter.company}</p>
              {letter.role && <strong>Re: {letter.role}</strong>}
              <p className="vp2-letter-text">{suggestedLetter(cv, letter)}</p>
            </article>
          </aside>
        </div>
      )}

      {view === 'design' && (
        <div className="vp2-design-layout">
          <div className="vp2-panel">
            <span className="vp2-kicker">DOCUMENT DESIGN</span><h3>Choose your finish.</h3>
            <p className="vp2-help">Design settings apply to both exported PDFs. Preview the CV to see the selected palette.</p>
            <h4 className="vp2-choice-heading">CV template</h4>
            <p className="vp2-help">Choose a layout. Your selection changes the live CV preview and the exported PDF.</p>
            <div className="vp2-template-grid">
              {cvTemplates.map(template => (
                <button
                  type="button"
                  key={template.id}
                  className={`vp2-template-choice ${settings.template === template.id ? 'selected' : ''}`}
                  aria-pressed={settings.template === template.id}
                  onClick={() => updateSettings('template', template.id)}
                >
                  <span className={`vp2-template-mini vp2-template-mini-${template.id}`}>
                    <i/><i/><i/><i/>
                  </span>
                  <strong>{template.label}</strong>
                  <small>{template.description}</small>
                  {settings.template === template.id && <Check size={16}/>}
                </button>
              ))}
            </div>
            <h4 className="vp2-choice-heading">CV color palette</h4>
            <div className="vp2-themes">
              <button type="button" className={settings.theme === 'obsidian' ? 'selected' : ''} onClick={() => updateSettings('theme', 'obsidian')}>
                <span className="vp2-swatch vp2-swatch-dark"/><strong>Obsidian Luxury</strong><small>Matte black · Champagne gold</small>{settings.theme === 'obsidian' && <Check/>}
              </button>
              <button type="button" className={settings.theme === 'ivory' ? 'selected' : ''} onClick={() => updateSettings('theme', 'ivory')}>
                <span className="vp2-swatch vp2-swatch-ivory"/><strong>Ivory Editorial</strong><small>Warm paper · Antique gold</small>{settings.theme === 'ivory' && <Check/>}
              </button>
            </div>
            <h4 className="vp2-choice-heading">Cover-letter design</h4>
            <div className="vp2-letter-style-grid">
              {letterStyles.map(style => (
                <button
                  type="button"
                  key={style.id}
                  className={`vp2-letter-style-choice ${settings.letterStyle === style.id ? 'selected' : ''}`}
                  aria-pressed={(settings.letterStyle || 'signature') === style.id}
                  onClick={() => updateSettings('letterStyle', style.id)}
                >
                  <strong>{style.label}</strong>
                  <small>{style.description}</small>
                </button>
              ))}
            </div>
            <div className="vp2-setting">
              <label htmlFor="vp2-letter-theme">Cover-letter color palette</label>
              <select id="vp2-letter-theme" value={settings.letterTheme || settings.theme} onChange={event => updateSettings('letterTheme', event.target.value)}>
                <option value="obsidian">Obsidian Luxury · Black and gold</option>
                <option value="ivory">Ivory Editorial · Warm paper</option>
              </select>
            </div>
            <div className="vp2-setting"><label htmlFor="vp2-font-size">CV body text size</label><select id="vp2-font-size" value={settings.fontSize} onChange={event => updateSettings('fontSize', Number(event.target.value))}><option value={8}>Compact · 8 pt</option><option value={9}>Standard · 9 pt</option><option value={10}>Comfortable · 10 pt</option></select></div>
            <div className="vp2-setting"><label htmlFor="vp2-spacing">Section spacing</label><select id="vp2-spacing" value={settings.spacing} onChange={event => updateSettings('spacing', Number(event.target.value))}><option value={2}>Compact</option><option value={4}>Balanced</option><option value={7}>Relaxed</option></select></div>
            <button type="button" className="vp2-primary" onClick={() => setView('export')}>Go to Export Center <ArrowRight size={15}/></button>
          </div>
          <Preview cv={cv} theme={settings.theme} template={settings.template || 'vellon-signature'}/>
        </div>
      )}

      {view === 'export' && (
        <div className="vp2-export">
          <span className="vp2-kicker">FINAL DOCUMENTS</span><h3>Ready when you are.</h3>
          <p className="vp2-help">Generate each document as a separate A4 PDF. Check your details before downloading.</p>
          <div className="vp2-export-grid">
            <div className="vp2-export-card"><span className="vp2-export-icon"><FileText size={24}/></span><span className="vp2-kicker">DOCUMENT 01</span><h4>Curriculum Vitae</h4><p>{cv.name || 'Your name'}{cv.title ? ` · ${cv.title}` : ''}</p><button type="button" className="vp2-primary" onClick={() => exportPDF('cv', cv, letter, settings, onPremiumExport)}><Download size={16}/> Download CV PDF</button></div>
            <div className="vp2-export-card"><span className="vp2-export-icon"><Mail size={24}/></span><span className="vp2-kicker">DOCUMENT 02</span><h4>Cover Letter</h4><p>{letter.company || 'Add a company in Cover Letter'}{letter.role ? ` · ${letter.role}` : ''}</p><button type="button" className="vp2-primary" disabled={rewardMode} onClick={() => exportPDF('letter', cv, letter, settings, onPremiumExport)}><Download size={16}/> Download Letter PDF</button></div>
          </div>
          <div className="vp2-privacy"><ShieldCheck size={19}/><div><strong>Before you submit</strong><p>Review spelling, dates, contact details, and job-specific information. The PDF export uses selectable text and standard fonts.</p></div></div>
          <button type="button" className="vp2-secondary" onClick={() => setView('cv')}><UserRound size={15}/> Return to CV Studio</button>
        </div>
      )}

      <footer className="vp2-footer"><span>VÉLLON <b>PASS</b></span><span>CAREER DOCUMENTS, CONSIDERED.</span></footer>
    </section>
  )
}
