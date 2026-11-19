import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Boxes,
  Check, CheckCircle2, ChevronRight, CloudDownload,
  Code2, FileCheck2, FileText, GraduationCap, Headphones,
  LockKeyhole, Package, Search,
  Shield, ShieldCheck, ShoppingBag, Sparkles, Terminal,
  UserRound, X
} from 'lucide-react'
import './launch.css'

const editions = [
  {
    id: 'starter',
    name: 'Starter',
    price: 199,
    description: 'The essential foundation for organising your IT operations.',
    features: [
      'Core IT asset register',
      'Infrastructure register',
      'Security checklist',
      'Risk and incident registers',
      'Getting started documentation',
      'VÉLLON welcome experience'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 499,
    description: 'A broader operational toolkit with additional templates and learning.',
    features: [
      'Everything in Starter',
      'Backup and patch trackers',
      'Access management register',
      'Editable IT policy templates',
      'Guided tutorials',
      'Build Your Own learning resources'
    ],
    recommended: true
  },
  {
    id: 'business',
    name: 'Business',
    price: 999,
    description: 'The complete proposed package for a more structured IT operation.',
    features: [
      'Everything in Professional',
      'Expanded reporting templates',
      'Additional operational documents',
      'Advanced learning resources',
      'Implementation planning guides',
      'Extended package documentation'
    ]
  }
]

const categories = [
  'All products',
  'IT & Cybersecurity',
  'Business Operations',
  'Automation',
  'Digital Tools'
]

const products = [
  {
    id: 'secure',
    name: 'VÉLLON SECURE™',
    category: 'IT & Cybersecurity',
    type: 'BUSINESS STARTER KIT',
    description: 'A structured operational toolkit for IT asset management, security recordkeeping and business IT administration.',
    status: 'Available for preview',
    icon: ShieldCheck,
    available: true
  },
  {
    id: 'service',
    name: 'VÉLLON SERVICEOS™',
    category: 'Business Operations',
    type: 'SERVICE MANAGEMENT',
    description: 'A proposed toolkit for managing service jobs, customers, workflows and operational records.',
    status: 'Planned product',
    icon: Boxes,
    available: false
  },
  {
    id: 'automate',
    name: 'VÉLLON AUTOMATE™',
    category: 'Automation',
    type: 'WORKFLOW TOOLKIT',
    description: 'A proposed collection of practical workflow templates and automation resources.',
    status: 'Planned product',
    icon: Terminal,
    available: false
  }
]

const modules = [
  ['IT Asset Register', 'Record devices, ownership, status and equipment details.'],
  ['Infrastructure Register', 'Document infrastructure, services and system dependencies.'],
  ['Security Checklist', 'Record security practices and review completion.'],
  ['Risk Register', 'Document risks, likelihood, impact and mitigation actions.'],
  ['Incident Register', 'Maintain a structured record of operational incidents.'],
  ['Backup Tracker', 'Record backup schedules and verification checks.'],
  ['Patch Management', 'Track software updates and maintenance activity.'],
  ['Access Register', 'Document authorised users and access reviews.'],
  ['Policy Library', 'Start with editable IT policy templates.'],
  ['Reporting', 'Prepare operational summaries and management reports.']
]

const learningModules = [
  {
    title: 'Welcome to VÉLLON SECURE',
    duration: '5 MIN',
    description: 'Understand the purpose of the toolkit and how its modules fit together.'
  },
  {
    title: 'Installation and first-time setup',
    duration: '10 MIN',
    description: 'Prepare your workspace and configure the basic operational registers.'
  },
  {
    title: 'Managing your IT assets',
    duration: '12 MIN',
    description: 'Learn how to organise equipment records and keep information current.'
  },
  {
    title: 'Build Your Own',
    duration: '15 MIN',
    description: 'Understand the underlying structure and learn how to customise your own system.'
  }
]

function money(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0
  }).format(value)
}

function readPurchases() {
  try {
    const saved = JSON.parse(localStorage.getItem('vellon-launch-demo-purchases') || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export default function LaunchPage() {
  const [page, setPage] = useState('store')
  const [category, setCategory] = useState('All products')
  const [search, setSearch] = useState('')
  const [edition, setEdition] = useState('professional')
  const [purchases, setPurchases] = useState(readPurchases)
  const [notice, setNotice] = useState('')
  const [completed, setCompleted] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vellon-launch-demo-progress') || '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })

  const selectedEdition = editions.find(item => item.id === edition) || editions[1]
  const hasSecure = purchases.some(item => item.productId === 'secure')

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter(product => {
      const matchesCategory = category === 'All products' || product.category === category
      const matchesSearch = !term ||
        `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(term)
      return matchesCategory && matchesSearch
    })
  }, [category, search])

  const navigate = (next) => {
    setNotice('')
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const beginPurchase = () => {
    if (hasSecure) {
      navigate('library')
      return
    }
    navigate('checkout')
  }

  const completeDemoPurchase = () => {
    const purchase = {
      id: `DEMO-${purchases.length + 1}`,
      productId: 'secure',
      productName: 'VÉLLON SECURE™',
      edition: selectedEdition.name,
      price: selectedEdition.price,
      date: new Date().toISOString(),
      demo: true
    }

    const updated = [purchase, ...purchases]
    setPurchases(updated)

    try {
      localStorage.setItem('vellon-launch-demo-purchases', JSON.stringify(updated))
    } catch {
      setNotice('Browser storage is unavailable. This demonstration purchase could not be saved.')
      return
    }

    navigate('welcome')
  }

  const toggleLesson = (index) => {
    const updated = completed.includes(index)
      ? completed.filter(item => item !== index)
      : [...completed, index]

    setCompleted(updated)

    try {
      localStorage.setItem('vellon-launch-demo-progress', JSON.stringify(updated))
    } catch {
      setNotice('Progress is visible for this session but could not be saved.')
    }
  }

  const navItems = [
    { id: 'store', label: 'Discover', icon: ShoppingBag },
    { id: 'library', label: 'My Library', icon: Package },
    { id: 'learn', label: 'Learning Centre', icon: GraduationCap }
  ]

  return (
    <section className="launch-root">
      <div className="launch-topline">
        <div className="launch-lockup">
          <span className="launch-mark">V.</span>
          <span>VÉLLON <small>LAUNCH</small></span>
        </div>
        <span className="launch-preview-label"><span /> LOCAL PREVIEW</span>
      </div>

      <nav className="launch-nav" aria-label="Launch navigation">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => navigate(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          )
        })}
        <button
          className={page === 'account' ? 'active' : ''}
          onClick={() => navigate('account')}
        >
          <UserRound size={16} />
          <span>Account</span>
        </button>
      </nav>

      {notice && (
        <div className="launch-notice" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15}/></button>
        </div>
      )}

      {page === 'store' && (
        <>
          <section className="launch-hero">
            <div className="launch-hero-copy">
              <span className="launch-eyebrow"><Sparkles size={13}/> THE VÉLLON PRODUCT STANDARD</span>
              <h1>Professional systems.<br/><span>Ready to launch.</span></h1>
              <p>
                Practical software, business systems and digital toolkits.
                Start with a professional foundation, learn how it works,
                and build on it yourself.
              </p>
              <div className="launch-hero-actions">
                <button className="launch-button launch-button-gold" onClick={() => {
                  document.getElementById('launch-catalogue')?.scrollIntoView({ behavior: 'smooth' })
                }}>
                  Explore products <ArrowRight size={16}/>
                </button>
                <button className="launch-button launch-button-outline" onClick={() => navigate('learn')}>
                  Explore the learning centre <BookOpen size={16}/>
                </button>
              </div>
              <div className="launch-proof">
                <span><CheckCircle2 size={15}/> Practical resources</span>
                <span><GraduationCap size={15}/> Learn as you build</span>
                <span><ShieldCheck size={15}/> Clear product scope</span>
              </div>
            </div>

            <div className="launch-feature-card">
              <div className="launch-feature-top">
                <span>FEATURED RELEASE</span>
                <span className="launch-release-dot">PREVIEW</span>
              </div>
              <div className="launch-feature-icon"><ShieldCheck size={35}/></div>
              <span className="launch-product-kicker">IT & CYBERSECURITY</span>
              <h2>VÉLLON<br/><span>SECURE™</span></h2>
              <p>Your IT operations. Organised.</p>
              <div className="launch-feature-divider"/>
              <div className="launch-feature-bottom">
                <span>THREE EDITIONS</span>
                <strong>From R199</strong>
              </div>
              <button className="launch-feature-link" onClick={() => navigate('product')}>
                View product <ArrowUpRight size={16}/>
              </button>
              <div className="launch-feature-watermark">V.</div>
            </div>
          </section>

          <section className="launch-value-strip">
            <div><Package size={18}/><span><strong>Complete packages</strong><small>Tools and documentation</small></span></div>
            <div><BookOpen size={18}/><span><strong>Guided learning</strong><small>Learn how to use your system</small></span></div>
            <div><Code2 size={18}/><span><strong>Build Your Own</strong><small>Understand and customise</small></span></div>
          </section>

          <section className="launch-catalogue" id="launch-catalogue">
            <div className="launch-section-heading">
              <div>
                <span className="launch-eyebrow">THE PRODUCT CATALOGUE</span>
                <h2>Find your starting point.</h2>
                <p>Explore practical systems designed to help you work more professionally.</p>
              </div>
              <span className="launch-catalogue-count">{products.length} PRODUCT CONCEPTS</span>
            </div>

            <div className="launch-catalogue-tools">
              <div className="launch-search">
                <Search size={17}/>
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                />
                {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15}/></button>}
              </div>
              <div className="launch-categories">
                {categories.map(item => (
                  <button
                    key={item}
                    className={category === item ? 'active' : ''}
                    onClick={() => setCategory(item)}
                  >{item}</button>
                ))}
              </div>
            </div>

            <div className="launch-product-grid">
              {filteredProducts.map(product => {
                const Icon = product.icon
                return (
                  <article className="launch-product-card" key={product.id}>
                    <div className="launch-product-card-top">
                      <span className="launch-product-card-icon"><Icon size={22}/></span>
                      <span className={product.available ? 'launch-status available' : 'launch-status'}>
                        {product.status}
                      </span>
                    </div>
                    <span className="launch-product-kicker">{product.type}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="launch-product-card-footer">
                      <span>{product.available ? 'From R199' : 'Coming soon'}</span>
                      <button
                        disabled={!product.available}
                        onClick={() => navigate('product')}
                        aria-label={`View ${product.name}`}
                      >
                        {product.available ? <>Explore <ArrowRight size={15}/></> : 'Planned'}
                      </button>
                    </div>
                  </article>
                )
              })}
              {filteredProducts.length === 0 && (
                <div className="launch-empty">
                  <Search size={22}/>
                  <strong>No matching products</strong>
                  <span>Try another search or category.</span>
                </div>
              )}
            </div>
          </section>

          <section className="launch-build-banner">
            <div className="launch-build-icon"><Code2 size={25}/></div>
            <div>
              <span className="launch-eyebrow">MORE THAN A DOWNLOAD</span>
              <h2>Understand it. Customise it. Build your own.</h2>
              <p>Our learning approach is designed to help you understand the systems you use.</p>
            </div>
            <button className="launch-button launch-button-outline" onClick={() => navigate('learn')}>
              Visit learning centre <ArrowRight size={16}/>
            </button>
          </section>
        </>
      )}

      {page === 'product' && (
        <section className="launch-page-content">
          <button className="launch-back" onClick={() => navigate('store')}><ArrowLeft size={15}/> Back to catalogue</button>
          <div className="launch-product-detail">
            <div className="launch-product-detail-main">
              <span className="launch-eyebrow">VÉLLON LAUNCH · PRODUCT 001</span>
              <div className="launch-detail-icon"><ShieldCheck size={30}/></div>
              <span className="launch-product-kicker">IT & CYBERSECURITY BUSINESS STARTER KIT</span>
              <h1>VÉLLON <span>SECURE™</span></h1>
              <p className="launch-detail-lead">
                A structured IT operations toolkit for small businesses,
                independent IT professionals and growing teams.
              </p>
              <div className="launch-detail-pills">
                <span><FileCheck2 size={14}/> Operational templates</span>
                <span><BookOpen size={14}/> Learning resources</span>
                <span><Package size={14}/> Package concept</span>
              </div>
              <div className="launch-detail-disclaimer">
                <Shield size={17}/>
                <p>
                  This is an operational recordkeeping and management toolkit.
                  It is not antivirus software, a vulnerability scanner, a firewall
                  or an automated threat detection service.
                </p>
              </div>
            </div>
            <aside className="launch-edition-panel">
              <span className="launch-eyebrow">CHOOSE YOUR EDITION</span>
              <h2>One foundation.<br/>Three ways to start.</h2>
              <div className="launch-edition-list">
                {editions.map(item => (
                  <button
                    key={item.id}
                    className={`launch-edition-option ${edition === item.id ? 'selected' : ''}`}
                    onClick={() => setEdition(item.id)}
                  >
                    <span className="launch-edition-radio">{edition === item.id && <span/>}</span>
                    <span className="launch-edition-info">
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <strong className="launch-edition-price">{money(item.price)}</strong>
                    {item.recommended && <span className="launch-edition-tag">POPULAR</span>}
                  </button>
                ))}
              </div>
              <div className="launch-edition-total">
                <span>Selected edition</span>
                <strong>{money(selectedEdition.price)}</strong>
              </div>
              <button className="launch-button launch-button-gold launch-buy-button" onClick={beginPurchase}>
                {hasSecure ? 'Open in my library' : 'Continue to demo checkout'} <ArrowRight size={16}/>
              </button>
              <p className="launch-demo-disclaimer">Local preview only. No payment will be taken.</p>
            </aside>
          </div>

          <div className="launch-module-section">
            <div className="launch-section-heading">
              <div>
                <span className="launch-eyebrow">WHAT'S INCLUDED</span>
                <h2>Built around practical operations.</h2>
              </div>
            </div>
            <div className="launch-module-grid">
              {modules.map(([name, description], index) => (
                <article key={name} className="launch-module-card">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{name}</strong><p>{description}</p></div>
                  <Check size={16}/>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {page === 'checkout' && (
        <section className="launch-page-content launch-checkout-page">
          <button className="launch-back" onClick={() => navigate('product')}><ArrowLeft size={15}/> Back to product</button>
          <div className="launch-checkout-card">
            <div className="launch-checkout-heading">
              <span className="launch-eyebrow">VÉLLON LAUNCH · CHECKOUT PREVIEW</span>
              <div className="launch-detail-icon"><LockKeyhole size={27}/></div>
              <h1>Review your <span>selection.</span></h1>
              <p>This is a demonstration checkout. No payment details are collected.</p>
            </div>
            <div className="launch-order-row">
              <div><strong>VÉLLON SECURE™</strong><small>{selectedEdition.name} Edition</small></div>
              <strong>{money(selectedEdition.price)}</strong>
            </div>
            <div className="launch-order-row">
              <span>Delivery</span><strong>Digital package (planned)</strong>
            </div>
            <div className="launch-order-total">
              <span>Demonstration total</span><strong>{money(selectedEdition.price)}</strong>
            </div>
            <div className="launch-checkout-warning">
              <ShieldCheck size={18}/>
              <span>Demo mode: completing this step creates a local demonstration entitlement only. It does not charge money or deliver a real ZIP package.</span>
            </div>
            <button className="launch-button launch-button-gold launch-buy-button" onClick={completeDemoPurchase}>
              Complete demo purchase <CheckCircle2 size={17}/>
            </button>
            <button className="launch-text-button" onClick={() => navigate('product')}>Change edition</button>
          </div>
        </section>
      )}

      {page === 'welcome' && (
        <section className="launch-page-content launch-welcome-page">
          <div className="launch-welcome-card">
            <div className="launch-welcome-seal"><Check size={35}/></div>
            <span className="launch-eyebrow">WELCOME TO THE VÉLLON STANDARD</span>
            <h1>Your next chapter<br/><span>starts here.</span></h1>
            <p>
              Your VÉLLON SECURE™ {selectedEdition.name} demonstration entitlement
              has been added to your local preview library.
            </p>
            <div className="launch-welcome-steps">
              <div><span>01</span><strong>Explore your product</strong><small>Understand the modules and their purpose.</small></div>
              <div><span>02</span><strong>Learn the workflow</strong><small>Follow the getting-started learning path.</small></div>
              <div><span>03</span><strong>Build your own</strong><small>Explore how to customise and extend the system.</small></div>
            </div>
            <div className="launch-welcome-actions">
              <button className="launch-button launch-button-gold" onClick={() => navigate('library')}>Open my library <ArrowRight size={16}/></button>
              <button className="launch-button launch-button-outline" onClick={() => navigate('learn')}>Start learning <BookOpen size={16}/></button>
            </div>
            <span className="launch-demo-disclaimer">Demonstration experience · No real order or licence has been issued.</span>
          </div>
        </section>
      )}

      {page === 'library' && (
        <section className="launch-page-content">
          <div className="launch-page-heading">
            <span className="launch-eyebrow">YOUR PRODUCTS</span>
            <h1>My <span>Library.</span></h1>
            <p>Your product access and package information in one place.</p>
          </div>
          {purchases.length ? (
            <div className="launch-library-list">
              {purchases.map(item => (
                <article className="launch-library-card" key={item.id}>
                  <div className="launch-library-icon"><ShieldCheck size={26}/></div>
                  <div className="launch-library-info">
                    <span className="launch-product-kicker">IT & CYBERSECURITY</span>
                    <h2>{item.productName}</h2>
                    <p>{item.edition} Edition · {new Date(item.date).toLocaleDateString()}</p>
                    <span className="launch-demo-entitlement">DEMO ENTITLEMENT · NOT A REAL LICENCE</span>
                  </div>
                  <div className="launch-library-actions">
                    <button className="launch-button launch-button-gold" onClick={() => navigate('welcome')}>Open product <ArrowRight size={15}/></button>
                    <button className="launch-button launch-button-outline" onClick={() => setNotice('ZIP delivery is not connected in this local prototype. The real package will be delivered through secure, entitlement-checked downloads.')}>
                      <CloudDownload size={15}/> Package ZIP
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="launch-empty-state">
              <div className="launch-empty-icon"><Package size={28}/></div>
              <h2>Your library is ready.</h2>
              <p>When you add a product, it will appear here with its edition, learning resources and package information.</p>
              <button className="launch-button launch-button-gold" onClick={() => navigate('store')}>Explore products <ArrowRight size={16}/></button>
            </div>
          )}
        </section>
      )}

      {page === 'learn' && (
        <section className="launch-page-content">
          <div className="launch-page-heading">
            <span className="launch-eyebrow">THE VÉLLON LEARNING CENTRE</span>
            <h1>Learn it.<br/><span>Make it yours.</span></h1>
            <p>Practical guidance to help you understand, operate and customise your systems.</p>
          </div>
          <div className="launch-learning-layout">
            <div className="launch-learning-intro">
              <div className="launch-learning-icon"><GraduationCap size={29}/></div>
              <span className="launch-product-kicker">FEATURED LEARNING PATH</span>
              <h2>VÉLLON SECURE™<br/>Getting Started</h2>
              <p>A guided introduction to the toolkit, its modules and the fundamentals behind its structure.</p>
              <div className="launch-learning-progress">
                <div><span>YOUR PROGRESS</span><strong>{completed.length}/{learningModules.length}</strong></div>
                <div className="launch-progress-track"><span style={{width:`${completed.length / learningModules.length * 100}%`}}/></div>
              </div>
            </div>
            <div className="launch-lesson-list">
              {learningModules.map((lesson, index) => (
                <article className={`launch-lesson ${completed.includes(index) ? 'complete' : ''}`} key={lesson.title}>
                  <button className="launch-lesson-toggle" onClick={() => toggleLesson(index)}>
                    <span className="launch-lesson-check">{completed.includes(index) ? <Check size={16}/> : String(index + 1).padStart(2, '0')}</span>
                    <span className="launch-lesson-content">
                      <strong>{lesson.title}</strong>
                      <small>{lesson.description}</small>
                      <em>{lesson.duration}</em>
                    </span>
                    <ChevronRight size={17}/>
                  </button>
                </article>
              ))}
            </div>
          </div>
          <div className="launch-build-banner launch-build-learning">
            <div className="launch-build-icon"><Code2 size={25}/></div>
            <div><span className="launch-eyebrow">BUILD YOUR OWN</span><h2>Learn beyond the package.</h2><p>Understand data structures, workflows, customisation and the principles behind building your own tools.</p></div>
          </div>
        </section>
      )}

      {page === 'account' && (
        <section className="launch-page-content">
          <div className="launch-page-heading">
            <span className="launch-eyebrow">CUSTOMER SPACE</span>
            <h1>Your <span>account.</span></h1>
            <p>This local preview does not require registration or collect personal information.</p>
          </div>
          <div className="launch-account-grid">
            <article><UserRound size={22}/><strong>Customer profile</strong><p>Account registration will be connected when the production backend is ready.</p><span>NOT CONNECTED</span></article>
            <article><FileText size={22}/><strong>Orders and licences</strong><p>Real orders, licence records and entitlements require verified payment and server-side account services.</p><span>DEMO MODE</span></article>
            <article><Headphones size={22}/><strong>Support</strong><p>Product support and ticket tracking will be introduced with the customer platform.</p><span>PLANNED</span></article>
          </div>
        </section>
      )}

      <footer className="launch-footer">
        <div className="launch-footer-brand"><span className="launch-mark">V.</span><span>VÉLLON <small>LAUNCH</small></span></div>
        <span>Professional foundations. Built to grow.</span>
        <span>Local interactive preview · 2026</span>
      </footer>
    </section>
  )
}
