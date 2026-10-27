import CVImportPanel from "./CVImportPanel.jsx"
import VellonPass from './VellonPass.jsx'
import { useMemo, useState } from 'react'
import {
  ArrowRight, FileText, Download, ShieldCheck, Sparkles,
  BriefcaseBusiness, GraduationCap, UserRound, Plus, Trash2,
  Eye
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import './index.css'

const emptyExperience = () => ({
  id: crypto.randomUUID(), role: '', company: '', dates: '', details: ''
})

const initialForm = {
  name: '', title: '', email: '', phone: '', location: '',
  summary: '', skills: '', education: '', experience: [emptyExperience()]
}

export default function App() {
  const [form, setForm] = useState(initialForm)
  const [activeTab, setActiveTab] = useState('personal')
  const [notice, setNotice] = useState('')

  const update = (key, value) => setForm(old => ({ ...old, [key]: value }))


  const applyImportedCv = (parsed) => {
    const keys = [
      'name', 'title', 'email', 'phone',
      'location', 'summary', 'skills', 'education'
    ]

    setForm(old => {
      const next = { ...old }

      for (const key of keys) {
        if (
          parsed[key] &&
          !String(old[key] || '').trim()
        ) {
          next[key] = parsed[key]
        }
      }

      if (
        parsed.experienceText &&
        Array.isArray(old.experience) &&
        old.experience.length > 0 &&
        !old.experience.some(job =>
          job.role || job.company || job.details
        )
      ) {
        next.experience = [
          {
            ...old.experience[0],
            details: parsed.experienceText
          },
          ...old.experience.slice(1)
        ]
      }

      return next
    })

    if (typeof setNotice === 'function') {
      setNotice(
        'Imported details applied to empty fields. Review the CV and correct anything that needs editing.'
      )
    }

    if (typeof setActiveTab === 'function') {
      setActiveTab('personal')
    }
  }

  const updateExperience = (id, key, value) => {
    setForm(old => ({
      ...old,
      experience: old.experience.map(item =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }))
  }

  const completeness = useMemo(() => {
    const fields = [
      form.name, form.title, form.email, form.summary,
      form.education, form.skills,
      ...form.experience.flatMap(e => [e.role, e.company, e.details])
    ]
    return Math.round(fields.filter(v => String(v).trim()).length / fields.length * 100)
  }, [form])

  function exportPDF() {
    if (!form.name.trim()) {
      setNotice('Add your name before exporting your CV.')
      setActiveTab('personal')
      return
    }

    try {
      const doc = new jsPDF()
      const margin = 18
      const pageWidth = doc.internal.pageSize.getWidth()
      const usable = pageWidth - margin * 2
      let y = 22

      const ensureSpace = (height = 10) => {
        if (y + height > 278) {
          doc.addPage()
          y = 20
        }
      }

      const section = (heading, body) => {
        if (!String(body || '').trim()) return
        ensureSpace(18)
        y += 5
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(heading.toUpperCase(), margin, y)
        y += 3
        doc.setDrawColor(194, 157, 91)
        doc.line(margin, y, pageWidth - margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const lines = doc.splitTextToSize(String(body), usable)
        for (const line of lines) {
          ensureSpace(6)
          doc.text(line, margin, y)
          y += 5
        }
      }

      doc.setFillColor(10, 10, 10)
      doc.rect(0, 0, pageWidth, 48, 'F')
      doc.setTextColor(225, 190, 120)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(21)
      doc.text(form.name, margin, 20)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.text(form.title || 'Professional Profile', margin, 29)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(
        [form.email, form.phone, form.location].filter(Boolean).join('  |  ').slice(0, 110),
        margin, 39
      )
      doc.setTextColor(25, 25, 25)
      y = 57

      section('Professional Summary', form.summary)
      section('Skills', form.skills)

      for (const job of form.experience) {
        const body = [
          [job.role, job.company].filter(Boolean).join(' — '),
          job.dates,
          job.details
        ].filter(Boolean).join('\n')
        section('Work Experience', body)
      }

      section('Education', form.education)
      const filename = form.name.trim().replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60)
      doc.save(`${filename || 'CV'}-Vellon.pdf`)
      setNotice('Your CV export was generated. Check your Downloads.')
    } catch (error) {
      console.error(error)
      setNotice('PDF export failed. Please try again.')
    }
  }

  const input = (label, key, placeholder, multiline = false) => (
    <label className="field" key={key}>
      <span>{label}</span>
      {multiline
        ? <textarea value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} rows={4} />
        : <input value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} />}
    </label>
  )

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Vellon Career Studio home">
          <span className="brand-mark">V.</span>
          <span>VÉLLON <small>CAREER STUDIO</small></span>
        </a>
        <div className="top-actions">
          <span className="free-label"><ShieldCheck size={15}/> FREE CV BUILDER</span>
          <button className="button button-gold" onClick={exportPDF}><Download size={16}/> Export PDF</button>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> YOUR NEXT CHAPTER STARTS HERE</div>
        <h1>Your experience.<br/><span>Your next opportunity.</span></h1>
        <p>Create a professional, ATS-conscious CV in minutes. No account required. Your information stays in this browser until you export it.</p>
        <div className="hero-proof">
          <span><ShieldCheck size={16}/> Free to use</span>
          <span><FileText size={16}/> PDF export</span>
          <span><BriefcaseBusiness size={16}/> Professional format</span>
        </div>
      </section>

      <section className="pass-promo" aria-labelledby="pass-promo-title">
        <div className="pass-promo-copy">
          <span className="eyebrow"><Sparkles size={14}/> INTRODUCING THE PREMIUM TIER</span>
          <h2 id="pass-promo-title">Make your next application <span>stand apart.</span></h2>
          <p>Meet VÉLLON PASS: a black-and-gold CV, a matching editable cover letter, and a signature PASS seal.</p>
        </div>
        <button className="button button-gold" onClick={() => document.getElementById('vellon-pass')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          Explore VÉLLON PASS <ArrowRight size={16}/>
        </button>
      </section>

      <VellonPass form={form} />

      <section className="workspace">
        <div className="editor-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">YOUR DOCUMENT</span><h2>Build your CV</h2></div>
            <span className="completion">{completeness}% complete</span>
          </div>
          <div className="progress"><span style={{ width: `${completeness}%` }}/></div>

          <CVImportPanel onApply={applyImportedCv} />

          <nav className="tabs" aria-label="CV sections">
            <button className={activeTab === 'personal' ? 'active' : ''} onClick={() => setActiveTab('personal')}><UserRound size={16}/> Personal</button>
            <button className={activeTab === 'experience' ? 'active' : ''} onClick={() => setActiveTab('experience')}><BriefcaseBusiness size={16}/> Experience</button>
            <button className={activeTab === 'education' ? 'active' : ''} onClick={() => setActiveTab('education')}><GraduationCap size={16}/> Education</button>
          </nav>

          {activeTab === 'personal' && <div className="fields">
            {input('Full name *', 'name', 'e.g. Alex Morgan')}
            {input('Professional headline', 'title', 'e.g. Customer Support Specialist')}
            {input('Email address', 'email', 'you@example.com')}
            {input('Phone number', 'phone', '+27 ...')}
            {input('City / region', 'location', 'e.g. Durban, South Africa')}
            {input('Professional summary', 'summary', 'Introduce your experience, strengths and career goals...', true)}
            {input('Skills', 'skills', 'Customer service, Excel, communication...')}
          </div>}

          {activeTab === 'experience' && <div className="fields">
            {form.experience.map((job, index) => <div className="experience-card" key={job.id}>
              <div className="experience-title"><strong>Position {index + 1}</strong>
                {form.experience.length > 1 && <button className="icon-button" aria-label="Remove position" onClick={() => update('experience', form.experience.filter(e => e.id !== job.id))}><Trash2 size={16}/></button>}
              </div>
              <label className="field"><span>Job title</span><input value={job.role} onChange={e => updateExperience(job.id, 'role', e.target.value)} placeholder="e.g. Sales Consultant"/></label>
              <label className="field"><span>Company</span><input value={job.company} onChange={e => updateExperience(job.id, 'company', e.target.value)} placeholder="Company name"/></label>
              <label className="field"><span>Dates</span><input value={job.dates} onChange={e => updateExperience(job.id, 'dates', e.target.value)} placeholder="2022 – 2025"/></label>
              <label className="field"><span>Responsibilities and achievements</span><textarea rows={4} value={job.details} onChange={e => updateExperience(job.id, 'details', e.target.value)} placeholder="Describe your work and measurable achievements..."/></label>
            </div>)}
            <button className="button button-outline" onClick={() => update('experience', [...form.experience, emptyExperience()])}><Plus size={16}/> Add another position</button>
          </div>}

          {activeTab === 'education' && <div className="fields">
            {input('Education and qualifications', 'education', 'Qualification, institution, years and relevant details...', true)}
          </div>}

          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
          <div className="editor-footer">
            <span>Changes update your preview instantly.</span>
            <button className="button button-gold" onClick={exportPDF}><Download size={16}/> Download CV</button>
          </div>
        </div>

        <aside className="preview-panel">
          <div className="preview-heading"><span><Eye size={16}/> LIVE PREVIEW</span><span className="live-dot">LIVE</span></div>
          <article className="paper">
            <div className="paper-header">
              <h2>{form.name || 'Your Name'}</h2>
              <p>{form.title || 'Professional Headline'}</p>
              <div className="paper-contact">{[form.email, form.phone, form.location].filter(Boolean).join(' · ') || 'Email · Phone · Location'}</div>
            </div>
            <div className="paper-content">
              <PreviewSection title="Profile" value={form.summary || 'Your professional summary will appear here. Briefly describe your experience, strengths and career direction.'}/>
              <PreviewSection title="Skills" value={form.skills || 'Your key skills will appear here.'}/>
              <h3>Experience</h3>
              {form.experience.some(j => j.role || j.company || j.details) ? form.experience.filter(j => j.role || j.company || j.details).map(j => <div className="preview-job" key={j.id}><strong>{j.role || 'Position'}{j.company ? ` — ${j.company}` : ''}</strong>{j.dates && <small>{j.dates}</small>}<p>{j.details}</p></div>) : <p className="placeholder">Your professional experience will appear here.</p>}
              {form.education && <><h3>Education</h3><p>{form.education}</p></>}
            </div>
          </article>
          <div className="preview-note"><ShieldCheck size={15}/> Review all details before sending your CV.</div>
          <button className="button button-outline preview-download" onClick={exportPDF}><Download size={16}/> Export your CV as PDF</button>
        </aside>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark">V.</span><span>VÉLLON <small>CAREER STUDIO</small></span></a>
        <span>Built for your next opportunity.</span>
        <span>Free CV creation · No account required</span>
      </footer>
    </main>
  )
}

function PreviewSection({ title, value }) {
  return <><h3>{title}</h3><p className={value.startsWith('Your ') ? 'placeholder' : ''}>{value}</p></>
}
