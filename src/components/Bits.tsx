import type { ReactNode } from 'react'
import type { Confidence } from '../model/types'
import type { Finding } from '../model/validate'

export function Tile({
  value,
  label,
  detail,
  tone,
}: {
  value: ReactNode
  label: string
  detail?: ReactNode
  tone?: 'good' | 'bad'
}) {
  return (
    <div className={'tile' + (tone ? ' ' + tone : '')}>
      <span className="n">{value}</span>
      <span className="k">{label}</span>
      {detail ? <span className="d">{detail}</span> : null}
    </div>
  )
}

export function ConfidenceTag({ c }: { c: Confidence }) {
  return <span className={'tag ' + c}>{c}</span>
}

export function Findings({ items }: { items: Finding[] }) {
  if (items.length === 0) {
    return (
      <div className="finding info">
        <div className="ftitle">No issues found</div>
        <div className="fdetail">
          The model is internally consistent. That is not the same as being right — it only
          means nothing contradicts anything else.
        </div>
      </div>
    )
  }
  return (
    <div>
      {items.map((f) => (
        <div key={f.id} className={'finding ' + f.severity}>
          <div className="ftitle">{f.title}</div>
          <div className="fdetail">{f.detail}</div>
        </div>
      ))}
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  hint,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
  suffix?: string
  hint?: string
}) {
  return (
    <label className="field">
      <span>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </span>
      <input
        className="num"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      {hint ? (
        <span style={{ textTransform: 'none', letterSpacing: 0, marginTop: 4, fontSize: 11.5 }}>
          {hint}
        </span>
      ) : null}
    </label>
  )
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <div style={{ maxWidth: 52 + 'ch', margin: '0 auto' }}>{children}</div>
    </div>
  )
}
