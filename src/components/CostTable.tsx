import type { Confidence } from '../model/types'
import { money, uid } from '../model/format'

/**
 * A minimal editable table for capital line items. Deliberately not generic —
 * a bespoke table you can read beats a configurable one you cannot.
 */

export interface Row {
  id: string
  name: string
  cost: number
  qty: number
  confidence: Confidence
  powerKw?: number
  ratedBph?: number
  note?: string
}

const CONFIDENCES: Confidence[] = ['verified', 'indicative', 'assumption']

export function CostTable({
  rows,
  onChange,
  showPower = false,
  addLabel = 'Add item',
}: {
  rows: Row[]
  onChange: (rows: Row[]) => void
  showPower?: boolean
  addLabel?: string
}) {
  const patch = (id: string, p: Partial<Row>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)))

  const total = rows.reduce((t, r) => t + r.cost * r.qty, 0)

  return (
    <>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 190 }}>Item</th>
              <th className="num" style={{ width: 110 }}>Cost ₹</th>
              <th className="num" style={{ width: 62 }}>Qty</th>
              {showPower && <th className="num" style={{ width: 82 }}>kW</th>}
              {showPower && <th className="num" style={{ width: 92 }}>Rated BPH</th>}
              <th style={{ width: 118 }}>Evidence</th>
              <th className="num" style={{ width: 110 }}>Total</th>
              <th style={{ width: 34 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={showPower ? 8 : 6} className="muted small" style={{ padding: 16 }}>
                  Nothing here yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    value={r.name}
                    onChange={(e) => patch(r.id, { name: e.target.value })}
                    placeholder="Item name"
                  />
                  {r.note ? (
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {r.note}
                    </div>
                  ) : null}
                </td>
                <td>
                  <input
                    className="num"
                    type="number"
                    value={r.cost}
                    onChange={(e) => patch(r.id, { cost: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <input
                    className="num"
                    type="number"
                    value={r.qty}
                    onChange={(e) => patch(r.id, { qty: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                {showPower && (
                  <td>
                    <input
                      className="num"
                      type="number"
                      step="0.1"
                      value={r.powerKw ?? ''}
                      placeholder="—"
                      onChange={(e) =>
                        patch(r.id, {
                          powerKw: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        })
                      }
                    />
                  </td>
                )}
                {showPower && (
                  <td>
                    <input
                      className="num"
                      type="number"
                      value={r.ratedBph ?? ''}
                      placeholder="—"
                      onChange={(e) =>
                        patch(r.id, {
                          ratedBph: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        })
                      }
                    />
                  </td>
                )}
                <td>
                  <select
                    value={r.confidence}
                    onChange={(e) => patch(r.id, { confidence: e.target.value as Confidence })}
                  >
                    {CONFIDENCES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="num">{money(r.cost * r.qty)}</td>
                <td>
                  <button
                    className="ghost danger"
                    title="Remove"
                    onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showPower ? 6 : 4}>Total</td>
              <td className="num">{money(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="btnrow" style={{ marginTop: 10 }}>
        <button
          onClick={() =>
            onChange([
              ...rows,
              { id: uid('row'), name: '', cost: 0, qty: 1, confidence: 'assumption' },
            ])
          }
        >
          + {addLabel}
        </button>
      </div>
    </>
  )
}
