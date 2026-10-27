import { useRef, useState } from 'react'
import { FileUp, FileText, LoaderCircle, CheckCircle2 } from 'lucide-react'

export default function CVImportPanel({ onApply }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState(null)
  const [rawText, setRawText] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    setStatus('')
    setParsed(null)
    setRawText('')
    setBusy(true)

    try {
      const { extractCvText, parseCvText } = await import('./cvImport.js')
      const text = await extractCvText(file)
      const result = parseCvText(text)

      setRawText(text)
      setParsed(result)
      setStatus(`Text extracted from ${file.name}`)
    } catch (err) {
      console.error('CV import error:', err)
      setError(err instanceof Error ? err.message : 'Could not read this PDF.')
    } finally {
      setBusy(false)
    }
  }

  const detected = parsed
    ? [
        ['Name', parsed.name],
        ['Email', parsed.email],
        ['Phone', parsed.phone],
        ['Location', parsed.location],
        ['Summary', parsed.summary],
        ['Skills', parsed.skills],
        ['Education', parsed.education],
        ['Experience section', parsed.experienceText]
      ].filter(([, value]) => value)
    : []

  return (
    <section className="cv-import-panel" aria-labelledby="cv-import-title">
      <div className="cv-import-heading">
        <span className="cv-import-icon"><FileUp size={19} /></span>
        <div>
          <h3 id="cv-import-title">Already have a CV?</h3>
          <p>Import a text-based PDF and reuse its information.</p>
        </div>
      </div>

      <input
        ref={inputRef}
        className="cv-import-file"
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFile}
        aria-label="Choose an existing CV PDF"
      />

      <button
        className="button button-outline cv-import-button"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy
          ? <><LoaderCircle className="cv-import-spin" size={16} /> Reading PDF…</>
          : <><FileText size={16} /> Choose CV PDF</>}
      </button>

      <p className="cv-import-privacy">
        Processed in your browser. PDF limit: 10 MB and 15 pages.
        Scanned PDFs may require OCR.
      </p>

      {error && <p className="cv-import-error" role="alert">{error}</p>}

      {status && parsed && (
        <div className="cv-import-results">
          <p className="cv-import-success">
            <CheckCircle2 size={15} /> {status}
          </p>

          <strong>{detected.length} information categories detected</strong>

          {detected.length > 0 ? (
            <ul>
              {detected.map(([label, value]) => (
                <li key={label}>
                  <b>{label}:</b> {value.slice(0, 180)}
                  {value.length > 180 ? '…' : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p>No familiar CV sections were detected. You can inspect the extracted text below.</p>
          )}

          <details className="cv-import-text">
            <summary>Review extracted text</summary>
            <pre>{rawText.slice(0, 12000)}{rawText.length > 12000 ? '\n… Text preview limited to 12,000 characters.' : ''}</pre>
          </details>

          <button
            className="button button-gold cv-import-apply"
            type="button"
            onClick={() => onApply(parsed)}
          >
            Apply detected details
          </button>
          <p className="cv-import-privacy">
            Existing filled fields are preserved. Review imported details before exporting.
          </p>
        </div>
      )}
    </section>
  )
}
