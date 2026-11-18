import CVImportPanel from "./CVImportPanel.jsx"
import { initializeReferralTracking, trackStandardExport } from './referrals.js'
import { useEffect, useMemo, useState } from 'react'
import {
  FileText, Download, ShieldCheck, Sparkles,
  Home,
  BriefcaseBusiness, GraduationCap, UserRound, Plus, Trash2,
  Eye
} from 'lucide-react'
import { generateCvPdf } from './cvLayout.js'
import './index.css'

const emptyExperience = () => ({
  id: crypto.randomUUID(), role: '', company: '', dates: '', details: ''
})

const initialForm = {
  name: '', title: '', email: '', phone: '', location: '',
  summary: '', skills: '', competencies: '', projects: '', certifications: '', education: '', experience: [emptyExperience()]
}

export default function App() {
  const [form, setForm] = useState(initialForm)
  const [activeTab, setActiveTab] = useState('personal')
  const [activePage, setActivePage] = useState('dashboard')
  const [notice, setNotice] = useState('')

  useEffect(() => { initializeReferralTracking() }, [])

  const update = (key, value) => setForm(old => ({ ...old, [key]: value }))


  const applyImportedCv = (parsed) => {
    const keys = [
      'name', 'title', 'email', 'phone', 'location',
      'summary', 'skills', 'competencies', 'projects',
      'certifications', 'education'
    ]

    setForm(old => {
      const next = { ...old }

      for (const key of keys) {
        if (parsed[key] && !String(old[key] || '').trim()) {
          next[key] = parsed[key]
        }
      }

      if (Array.isArray(parsed.experience) && parsed.experience.length) {
        const hasExistingJobs = old.experience.some(job =>
          job.role || job.company || job.dates || job.details
        )

        if (!hasExistingJobs) {
          next.experience = parsed.experience.map(job => ({
            id: crypto.randomUUID(),
            role: job.role || '',
            company: job.company || '',
            dates: job.dates || '',
            details: job.details || ''
          }))
        }
      } else if (parsed.experienceText && !old.experience.some(job =>
        job.role || job.company || job.dates || job.details
      )) {
        next.experience = [{
          ...old.experience[0],
          details: parsed.experienceText
        }]
      }

      return next
    })

    setNotice('Imported information was placed into matching fields where detected. Review all sections and any unclassified text before exporting.')
    setActiveTab('personal')
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
      generateCvPdf(form)
      trackStandardExport()
      setNotice('Your redesigned CV PDF was generated. Check your Downloads.')
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
    <main className="app" data-page={activePage}>
      <aside className="app-sidebar" aria-label="Main navigation">
        <a className="sidebar-brand" href="#" onClick={(e) => {
          e.preventDefault()
          setActivePage('dashboard')
        }}>
          <span className="brand-mark">V.</span>
          <span>VÉLLON<small>CAREER STUDIO</small></span>
        </a>

        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Workspace">
          <button className={activePage === 'dashboard' ? 'active' : ''}
            aria-current={activePage === 'dashboard' ? 'page' : undefined}
            onClick={() => setActivePage('dashboard')}>
            <Home size={18}/><span>Home</span>
          </button>
          <button className={activePage === 'cv' ? 'active' : ''}
            aria-current={activePage === 'cv' ? 'page' : undefined}
            onClick={() => setActivePage('cv')}>
            <FileText size={18}/><span>Free CV Builder</span>
          </button>
        </nav>


        <div className="sidebar-bottom">
          <span className="sidebar-status-dot"></span>
          <span>Local-first workspace</span>
          <small>No account required</small>
        </div>
      </aside>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Vellon Career Studio home"
          onClick={(e) => {
            e.preventDefault()
            setActivePage('dashboard')
          }}>
          <span className="brand-mark">V.</span>
          <span>VÉLLON <small>CAREER STUDIO</small></span>
        </a>
        <div className="top-actions">
          <span className="free-label"><ShieldCheck size={15}/> FREE CV BUILDER</span>
          {activePage === 'cv' ? (
            <button className="button button-gold" onClick={exportPDF}>
              <Download size={16}/> Export PDF
            </button>
          ) : (
            <button className="button button-gold" onClick={() => {
              setActivePage('cv')
              setActiveTab('personal')
            }}>
              <FileText size={16}/> Build my CV
            </button>
          )}
        </div>
      </header>

      {activePage === 'dashboard' && (
      <section className="hero home-hero">

        <aside className="advertiser-banner daep-spotlight" aria-label="DÆP featured artist promotion">
          <div className="advertiser-banner-copy">
            <span className="advertiser-eyebrow">VÉLLON SPOTLIGHT · FEATURED ARTIST</span>
            <h2>MEET <span>DÆP.</span></h2>
            <p className="advertiser-banner-prompt">SOUTH AFRICAN SOUND. YOUR NEXT LISTEN.</p>
            <p className="advertiser-banner-description">
              Discover DÆP. Explore the music, latest releases and sounds on YouTube.
            </p>
            <a
              className="advertiser-banner-link"
              href="https://youtube.com/@daep-za?si=6zo0ZvOg9Oqpq-7r"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Listen to DÆP on YouTube"
            >
              LISTEN ON YOUTUBE <span aria-hidden="true">↗</span>
            </a>
          </div>

          <a
            className="advertiser-banner-preview daep-spotlight-art"
            href="https://youtube.com/@daep-za?si=6zo0ZvOg9Oqpq-7r"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit the DÆP YouTube channel"
          >
            <span className="daep-art-overline">VÉLLON PRESENTS</span>
            <strong>DÆP<span>.</span></strong>
            <span className="daep-art-caption">INDEPENDENT MUSIC · OFFICIAL CHANNEL</span>
            <span className="daep-art-play">▶</span>
          </a>

          <div className="advertiser-banner-footnote">
            Featured artist · Sponsored by VÉLLON
          </div>
        </aside>

        <div className="eyebrow">
          <Sparkles size={14}/> A BETTER CV. A FRESH START.
        </div>

        <h1>Make your next opportunity <span>easier to reach.</span></h1>

        <p className="home-lead">
          Your skills and experience deserve to be presented clearly.
          Build a professional CV, review it as you go, and export a PDF
          you can use when applying for your next opportunity.
        </p>

        <div className="home-actions">
          <button className="button button-gold" onClick={() => {
            setActivePage('cv')
            setActiveTab('personal')
          }}>
            <FileText size={17}/> Build my free CV
          </button>
          <button className="button button-outline" onClick={() => {
            setActivePage('cv')
            setActiveTab('personal')
          }}>
            Start with my details <Eye size={16}/>
          </button>
        </div>

        <div className="hero-proof">
          <span><ShieldCheck size={16}/> Free to use</span>
          <span><FileText size={16}/> PDF export</span>
          <span><BriefcaseBusiness size={16}/> Professional format</span>
        </div>

        <div className="home-feature-grid">
          <article className="home-feature">
            <span className="home-feature-icon"><FileText size={20}/></span>
            <h2>A CV that is yours</h2>
            <p>Add your contact details, work history, education, skills,
              and professional summary.</p>
          </article>

          <article className="home-feature">
            <span className="home-feature-icon"><Eye size={20}/></span>
            <h2>See it take shape</h2>
            <p>Preview your CV while you edit it, so you can check the
              details before exporting.</p>
          </article>

          <article className="home-feature">
            <span className="home-feature-icon"><ShieldCheck size={20}/></span>
            <h2>Start without an account</h2>
            <p>Use the builder without signing up. Your CV details stay
              in the current browser session unless you export them.</p>
          </article>
        </div>

        <div className="home-how">
          <div>
            <span className="eyebrow">THREE SIMPLE STEPS</span>
            <h2>From your experience to your next application.</h2>
          </div>
          <ol>
            <li><span>01</span><div><strong>Add your details</strong><p>Enter your skills, experience, and education.</p></div></li>
            <li><span>02</span><div><strong>Review your CV</strong><p>Check the live preview and correct any mistakes.</p></div></li>
            <li><span>03</span><div><strong>Export your PDF</strong><p>Save your CV and prepare it for your applications.</p></div></li>
          </ol>
        </div>

        <div className="home-final-cta">
          <div>
            <h2>Your next chapter can start today.</h2>
            <p>Build your CV for free. No account required.</p>
          </div>
          <button className="button button-gold" onClick={() => {
            setActivePage('cv')
            setActiveTab('personal')
          }}>
            Create my CV <Download size={16}/>
          </button>
        </div>



</section>
      )}

{activePage === 'cv' && (
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
            {input('Skills', 'skills', 'Customer service, Excel, communication...')}\n            {input('Professional competencies', 'competencies', 'Leadership, problem-solving, project delivery...', true)}
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
            {input('Education and qualifications', 'education', 'Qualification, institution, years and relevant details...', true)}\n            {input('Certifications and professional development', 'certifications', 'Certificate, provider and completion date...', true)}\n            {input('Projects and portfolio', 'projects', 'Project name, purpose, technologies and achievements...', true)}
          </div>}

          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
          <div className="editor-footer">
            <span>Changes update your preview instantly.</span>
            <button className="button button-gold" onClick={exportPDF}><Download size={16}/> Download CV</button>
          </div>
        </div>

        <aside className="preview-panel">
          <div className="preview-heading"><span><Eye size={16}/> LIVE PREVIEW</span><span className="live-dot">LIVE</span></div>
          <article className="paper paper-editorial">
            <aside className="paper-rail">
              <div className="paper-rail-brand">
                <span>V.</span>
                <small>VÉLLON / CAREER STUDIO</small>
              </div>

              <div className="paper-identity">
                <h2>{form.name || 'Your Name'}</h2>
                <p>{form.title || 'Professional Profile'}</p>
              </div>

              <div className="paper-rail-section">
                <h3>Contact</h3>
                {[form.email, form.phone, form.location].filter(Boolean).length
                  ? [form.email, form.phone, form.location].filter(Boolean).map((item, index) => (
                    <p key={index}>{item}</p>
                  ))
                  : <p className="paper-empty">Email · Phone · Location</p>}
              </div>

              <div className="paper-rail-section">
                <h3>Core Skills</h3>
                {form.skills
                  ? form.skills.split(/[,\n;•]+/).map(skill => skill.trim()).filter(Boolean).map((skill, index) => (
                    <span className="paper-skill" key={`${skill}-${index}`}>{skill}</span>
                  ))
                  : <p className="paper-empty">Your key skills will appear here.</p>}
              </div>

              <div className="paper-rail-footer">VÉLLON <small>FREE EDITION</small></div>
            </aside>

            <div className="paper-main">
              <div className="paper-kicker"><span /> PROFESSIONAL CURRICULUM VITAE</div>

              <section className="paper-section">
                <h3>Professional Summary</h3>
                <p className={form.summary ? '' : 'placeholder'}>
                  {form.summary || 'Introduce your experience, strengths and career direction.'}
                </p>
              </section>

              <section className="paper-section">
                <h3>Professional Experience</h3>
                {form.experience.some(j => j.role || j.company || j.details || j.dates)
                  ? form.experience.filter(j => j.role || j.company || j.details || j.dates).map(j => (
                    <div className="paper-job" key={j.id}>
                      <strong>{j.role || 'Position'}</strong>
                      {j.company && <span className="paper-company">{j.company}</span>}
                      {j.dates && <small>{j.dates}</small>}
                      {j.details && <p>{j.details}</p>}
                    </div>
                  ))
                  : <p className="placeholder">Your work history will appear here.</p>}
              </section>

              {form.education && (
                <section className="paper-section">
                  <h3>Education & Qualifications</h3>
                  <p>{form.education}</p>
                </section>
              )}

              {form.projects && (
                <section className="paper-section">
                  <h3>Projects & Portfolio</h3>
                  <p>{form.projects}</p>
                </section>
              )}

              {form.certifications && (
                <section className="paper-section">
                  <h3>Certifications & Professional Development</h3>
                  <p>{form.certifications}</p>
                </section>
              )}

              {form.competencies && (
                <section className="paper-section">
                  <h3>Professional Competencies</h3>
                  <p>{form.competencies}</p>
                </section>
              )}

              <div className="paper-page-footer">
                <span>PREPARED WITH VÉLLON CAREER STUDIO</span>
                <span>01</span>
              </div>
            </div>
          </article>
          <div className="preview-note"><ShieldCheck size={15}/> Review all details before sending your CV.</div>
          <button className="button button-outline preview-download" onClick={exportPDF}><Download size={16}/> Export your CV as PDF</button>
        </aside>
      </section>

      )}

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
