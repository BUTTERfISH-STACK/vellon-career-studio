import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, Copy, Gift, Link2, RefreshCw, Users } from 'lucide-react'
import VellonPass from './VellonPass.jsx'
import {
  getReferralOwnerId,
  referralRequest
} from './referrals.js'
import './VellonReferrals.css'

export default function VellonReferrals() {
  const [ownerId] = useState(() => getReferralOwnerId())
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showWorkspace, setShowWorkspace] = useState(false)

  const referralUrl = `${window.location.origin}/?ref=${encodeURIComponent(ownerId)}`

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await referralRequest('/api/referrals/status', { ownerId })
      setStats(result)
    } catch (err) {
      setError(err.message || 'Referral progress is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    let active = true

    referralRequest('/api/referrals/status', { ownerId })
      .then(result => {
        if (active) setStats(result)
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'Referral progress is temporarily unavailable.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [ownerId])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setMessage('Referral link copied.')
    } catch {
      setMessage('Copy was blocked by this browser. Select and copy the link below.')
    }
  }

  async function useReward(download) {
    let reservation
    let downloadStarted = false

    try {
      reservation = await referralRequest('/api/referrals/reserve', { ownerId })
      await download()
      downloadStarted = true

      const result = await referralRequest('/api/referrals/redeem', {
        ownerId,
        rewardId: reservation.rewardId,
        reservationToken: reservation.reservationToken
      })

      if (!result.redeemed) {
        throw new Error('The reward redemption was not confirmed.')
      }

      setMessage('Premium CV export was initiated and reward redemption was confirmed.')
      setShowWorkspace(false)
      void refresh()
    } catch (err) {
      if (reservation?.rewardId && reservation?.reservationToken && !downloadStarted) {
        void referralRequest('/api/referrals/release', {
          ownerId,
          rewardId: reservation.rewardId,
          reservationToken: reservation.reservationToken
        }).catch(() => {})
      }

      if (downloadStarted) {
        setMessage(
          'The PDF export was initiated, but reward confirmation is pending. Refresh your progress before using another reward. An unresolved reservation may take up to 10 minutes to expire.'
        )
        void refresh()
      } else {
        setMessage(err.message || 'The reward could not be used. Refresh your progress and try again.')
      }
    }
  }

  const qualified = Number(stats?.qualified || 0)
  const remainder = qualified % 5
  const needed = remainder === 0 ? 5 : 5 - remainder

  return (
    <section className="referral-page" aria-labelledby="referral-title">
      <header className="referral-header">
        <div className="referral-brand"><span>V.</span><div>VÉLLON <small>CAREER STUDIO</small></div></div>
        <span className="referral-free-badge">FREE CV BUILDER</span>
      </header>

      <div className="referral-hero">
        <span className="referral-kicker"><Gift size={15} /> SHARE CAREER OPPORTUNITY</span>
        <h1 id="referral-title">Give someone a better CV.<br /><span>Earn a premium export.</span></h1>
        <p>Your standard CV builder stays free. Invite people to VÉLLON; each referred browser that generates its first standard CV export counts once. Every five qualifying referrals unlock one premium CV export.</p>
      </div>

      <div className="referral-progress-card">
        <div className="referral-progress-top">
          <div>
            <span className="referral-label">YOUR REFERRAL PROGRESS</span>
            <div className="referral-number">{loading ? '—' : qualified}<span> / next 5</span></div>
          </div>
          <div className="referral-icon"><Users size={22} /></div>
        </div>
        <div className="referral-progress-track" role="progressbar" aria-label="Progress toward next reward" aria-valuemin={0} aria-valuemax={5} aria-valuenow={remainder}>
          <span style={{ width: `${remainder / 5 * 100}%` }} />
        </div>
        <p>{loading ? 'Loading your progress…' : `${needed} more qualifying ${needed === 1 ? 'referral' : 'referrals'} to your next reward.`}</p>
        <div className="referral-stats">
          <div><strong>{loading ? '—' : Number(stats?.visits || 0)}</strong><span>Recorded visits</span></div>
          <div><strong>{loading ? '—' : Number(stats?.available || 0)}</strong><span>Rewards available</span></div>
          <div><strong>{loading ? '—' : Number(stats?.redeemed || 0)}</strong><span>Rewards used</span></div>
        </div>
      </div>

      <div className="referral-link-card">
        <h2><Link2 size={18} /> Your personal referral link</h2>
        <p>Share this link with someone who needs a CV. Their first qualifying export is counted once for this browser ID.</p>
        <div className="referral-link-row">
          <input aria-label="Your referral link" readOnly value={referralUrl} onFocus={e => e.target.select()} />
          <button type="button" onClick={copyLink}><Copy size={16} /> Copy link</button>
        </div>
        <button className="referral-refresh" type="button" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={15} /> Refresh progress
        </button>
      </div>

      {Number(stats?.available || 0) > 0 && (
        <div className="referral-reward-card">
          <div className="referral-reward-icon"><Gift size={23} /></div>
          <div className="referral-reward-copy">
            <span className="referral-label">REWARD UNLOCKED</span>
            <h2>One premium CV export</h2>
            <p>Use one available reward for a single premium CV PDF export. Cover-letter exports are not included in this reward.</p>
            <button type="button" onClick={() => setShowWorkspace(value => !value)}>
              {showWorkspace ? 'Close premium workspace' : 'Use a reward'} <ArrowRight size={16} />
            </button>
          </div>
          <Check className="referral-reward-check" size={20} />
        </div>
      )}

      {showWorkspace && Number(stats?.available || 0) > 0 && (
        <div className="referral-workspace">
          <VellonPass onPremiumExport={useReward} rewardMode />
        </div>
      )}

      {error && <p className="referral-message referral-error" role="alert">{error}</p>}
      {message && <p className="referral-message" role="status">{message}</p>}

      <div className="referral-rules">
        <h2>How it works</h2>
        <ol>
          <li>Share your personal referral link.</li>
          <li>A new referred browser opens the site and generates its first standard CV export.</li>
          <li>Every five distinct qualifying browser IDs unlock one premium CV export.</li>
        </ol>
        <p>Referral tracking uses browser-generated IDs and can be reset if someone clears browser storage or changes devices. It reduces duplicate counting but cannot prove that every ID is a different person. Export events are recorded when the app generates an export; the browser cannot confirm that a file was ultimately saved.</p>
      </div>
      <footer className="referral-footer">VÉLLON CAREER STUDIO · YOUR CAREER, PRESENTED WITH PURPOSE</footer>
    </section>
  )
}
