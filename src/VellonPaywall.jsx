import { useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  Crown,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react'
import './VellonPaywall.css'

const benefits = [
  {
    icon: FileCheck2,
    title: 'Premium CV design',
    description: 'A distinctive black-and-gold presentation for your next application.'
  },
  {
    icon: Sparkles,
    title: 'Redo without limits',
    description: 'Create and refine CV versions throughout your active 24-hour pass.'
  },
  {
    icon: ShieldCheck,
    title: 'A coordinated application',
    description: 'Access the existing PASS tools, including supported premium exports.'
  },
  {
    icon: Clock3,
    title: 'Your 24-hour window',
    description: 'The access timer will begin only after payment is verified.'
  }
]

export default function VellonPaywall() {
  const [showCheckoutNotice, setShowCheckoutNotice] = useState(false)

  return (
    <section className="vellon-paywall" aria-labelledby="vellon-paywall-title">
      <div className="paywall-ambient" aria-hidden="true" />

      <div className="paywall-topline">
        <span className="paywall-brand-mark">V.</span>
        <span className="paywall-brand-name">
          VÉLLON <small>CAREER STUDIO</small>
        </span>
        <span className="paywall-secure-label">
          <LockKeyhole size={13} /> PREMIUM ACCESS
        </span>
      </div>

      <div className="paywall-hero">
        <div className="paywall-eyebrow">
          <Sparkles size={14} />
          YOUR NEXT APPLICATION, REFINED
        </div>

        <h1 id="vellon-paywall-title">
          Make your next move
          <span> count.</span>
        </h1>

        <p className="paywall-intro">
          Unlock a focused 24-hour window to redo, refine and prepare
          your CV using the VÉLLON PASS workspace.
        </p>
      </div>

      <div className="paywall-offer">
        <div className="paywall-offer-heading">
          <div>
            <span className="paywall-plan-label">
              <Crown size={15} /> THE 24-HOUR PASS
            </span>
            <p className="paywall-price">
              <span className="paywall-currency">R</span>29.99
            </p>
            <p className="paywall-payment-note">
              Once-off payment <span>·</span> No subscription
            </p>
          </div>

          <div className="paywall-seal" aria-label="24-hour access">
            <Crown size={22} />
            <strong>VÉLLON</strong>
            <span>PASS</span>
            <small>24 HOURS</small>
          </div>
        </div>

        <div className="paywall-divider" />

        <div className="paywall-benefits">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article className="paywall-benefit" key={title}>
              <span className="paywall-benefit-icon">
                <Icon size={19} />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
              <Check className="paywall-check" size={17} />
            </article>
          ))}
        </div>

        <button
          type="button"
          className="paywall-checkout-button"
          onClick={() => setShowCheckoutNotice(true)}
          aria-describedby="paywall-checkout-status"
        >
          <LockKeyhole size={17} />
          Unlock PASS — R29.99
          <ArrowRight size={17} />
        </button>

        <p
          id="paywall-checkout-status"
          className="paywall-checkout-status"
          role="status"
        >
          {showCheckoutNotice
            ? 'Checkout is not connected yet. No payment has been taken and PASS remains locked.'
            : 'Secure Yoco checkout is being prepared. Payments are not enabled yet.'}
        </p>

        <div className="paywall-trust">
          <ShieldCheck size={15} />
          <span>No account required for the planned pass flow.</span>
        </div>
      </div>

      <div className="paywall-free-note">
        <div className="paywall-free-icon"><Zap size={18} /></div>
        <div>
          <strong>Your free CV builder is still available.</strong>
          <p>Close this page or select My CV to keep creating and exporting a standard CV.</p>
        </div>
      </div>

      <p className="paywall-footer">
        VÉLLON CAREER STUDIO <span>·</span> YOUR CAREER, PRESENTED WITH PURPOSE
      </p>
    </section>
  )
}
