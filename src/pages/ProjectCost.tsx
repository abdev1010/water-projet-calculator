import { useMemo } from 'react'
import { useScenarios } from '../store/scenarios'
import { computeScenario } from '../model/engine'
import { validate } from '../model/validate'
import { lakh, money, paise, pct, count } from '../model/format'
import { ScenarioBar } from '../components/ScenarioBar'
import { Findings, Field, Empty } from '../components/Bits'
import type { Scenario } from '../model/types'
import type { Derived } from '../model/engine'

// ─── Bottle size presets ──────────────────────────────────────────────────────

const BOTTLE_SIZES = [
  {
    label: '300 ml (24-Pack)',
    casePackSize: 24,
    preformCostPb: 1.20,
    capCostPb: 0.23,
    shrinkCostPp: 4.00,
    sellingPricePp: 95,
  },
  {
    label: '600 ml (24-Pack)',
    casePackSize: 24,
    preformCostPb: 1.70,
    capCostPb: 0.28,
    shrinkCostPp: 5.50,
    sellingPricePp: 170,
  },
  {
    label: '1200 ml (12-Pack)',
    casePackSize: 12,
    preformCostPb: 2.80,
    capCostPb: 0.35,
    shrinkCostPp: 4.00,
    sellingPricePp: 280,
  },
] as const

// ─── Results panel ────────────────────────────────────────────────────────────

function ResultsPanel({ d, a }: { d: Derived; a: Scenario['assumptions'] }) {
  const KV = ({
    label,
    value,
    strong,
    tone,
    indent,
  }: {
    label: string
    value: string
    strong?: boolean
    tone?: 'good' | 'bad'
    indent?: boolean
  }) => (
    <div
      className={[
        'result-kv',
        strong ? 'total' : '',
        tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="rk" style={indent ? { paddingLeft: 10 } : undefined}>
        {label}
      </span>
      <span className="rv">{value}</span>
    </div>
  )

  const sellingPpLabel = `₹${a.sellingPricePp ?? (a.wholesalePrice * (a.casePackSize ?? 24)).toFixed(0)}`
  const logisticPpLabel = `₹${a.logisticCostPp ?? (a.freightPerCase ?? 11)}`
  const casePack = d.sku.casePack

  return (
    <div className="card pc-results-card">
      {/* ── A+B Project Cost ───────────────────────────────────── */}
      <div className="result-block">
        <h4>Estimated Project Cost</h4>
        <KV label="RO Filter Plant" value={lakh(a.capexRoPlant ?? 0)} indent />
        <KV label="Blower + Comp + Chiller" value={lakh(a.capexBlowerUnit ?? 0)} indent />
        <KV label="Monoblock + Labeler combo" value={lakh(a.capexMonoblockUnit ?? 0)} indent />
        <KV label="Custom Molds" value={lakh(a.capexMolds ?? 0)} indent />
        {(a.capexSolar ?? 0) > 0 && (
          <KV label="☀️ Solar Plant" value={lakh(a.capexSolar ?? 0)} indent />
        )}
        <KV label="Section A machinery" value={lakh(d.capex.machinery + d.capex.solar)} strong />
        <KV label="Civil + Lab" value={lakh(a.capexCivil ?? 0)} indent />
        <KV label="Borewell + Water tank" value={lakh(a.capexBorewell ?? 0)} indent />
        <KV label="BIS + FSSAI Licensing" value={lakh(a.capexLicensing ?? 0)} indent />
        <KV label="Working capital" value={lakh(a.capexWorkingCap ?? 0)} indent />
        <KV label="Total project cost" value={lakh(d.capex.total)} strong />
        <KV label="Monthly EMI" value={money(d.funding.emi)} strong />
      </div>

      {/* ── Solar & Electricity ────────────────────────────────── */}
      {(a.capexSolar ?? 0) > 0 && (
        <div className="result-block">
          <h4>☀️ Solar & Electricity</h4>
          <KV label={`Grid hrs/day (${a.shiftHours}h − ${a.solarHours ?? 0}h solar)`} value={`${d.power.gridHoursPerDay} hrs`} indent />
          <KV label="Daily grid cost" value={money(d.power.monthlyGridCost / (a.workingDays || 1))} indent />
          <KV label="Monthly grid cost" value={money(d.power.monthlyGridCost)} strong />
          <KV label="Monthly solar saving" value={money(d.power.monthlySolarSaving)} tone="good" indent />
          <KV
            label="Solar payback"
            value={
              isFinite(d.power.solarPaybackMonths)
                ? `${d.power.solarPaybackMonths.toFixed(0)} months`
                : '—'
            }
            indent
          />
        </div>
      )}

      {/* ── Per Bottle / Per Packet Cost ──────────────────────── */}
      <div className="result-block">
        <h4>Per Bottle / Per {casePack}-Pack</h4>
        {d.unit.variableLines.map((l) => (
          <KV key={l.label} label={l.label} value={paise(l.amount)} indent />
        ))}
        <KV label="Variable cost / bottle" value={paise(d.unit.variablePerBottle)} strong />
        <KV
          label="Fixed overhead / bottle"
          value={d.production.monthlyVolume > 0 ? paise(d.unit.fixedPerBottle) : '—'}
          indent
        />
        <KV label="Landed cost / bottle" value={paise(d.unit.landedPerBottle)} strong />
        <KV label={`Cost per ${casePack}-pack`} value={money(d.unit.landedPerBottle * casePack)} strong />
      </div>

      {/* ── Revenue & P&L ─────────────────────────────────────── */}
      <div className="result-block">
        <h4>Revenue &amp; P&amp;L</h4>
        <div className="small muted" style={{ marginBottom: 6 }}>
          {count(d.production.monthlyVolume)} bottles /{' '}
          {count(d.sku.packagesPerMonth)} packs per month
        </div>
        <KV label={`Sell ${sellingPpLabel}/pack`} value={lakh(d.cashflow.monthlyRevenue)} />
        <KV label={`Logistics ${logisticPpLabel}/pack`} value={`−${lakh(d.unit.freightPerBottle * d.production.monthlyVolume)}`} indent />
        <KV label="Variable cost" value={`−${lakh(d.cashflow.monthlyVariableCost)}`} indent />
        <KV label="Staff salaries" value={`−${money(d.fixed.labour)}`} indent />
        <KV label="Other fixed" value={`−${money(d.fixed.total - d.fixed.labour)}`} indent />
        <KV
          label="EBITDA"
          value={lakh(d.cashflow.ebitda)}
          strong
          tone={d.cashflow.ebitda > 0 ? 'good' : 'bad'}
        />
        <KV label="EMI" value={`−${money(d.cashflow.emi)}`} indent />
        <KV
          label="Net / month"
          value={money(d.cashflow.netMonthly)}
          strong
          tone={d.cashflow.netMonthly > 0 ? 'good' : 'bad'}
        />
        {d.production.monthlyCapacity > 0 && (
          <div className="small muted" style={{ marginTop: 6 }}>
            Break-even:{' '}
            {isFinite(d.breakeven.monthlyUnits)
              ? `${count(d.breakeven.monthlyUnits)} bottles/mo (${pct(d.breakeven.utilisationAtBreakeven)} capacity)`
              : 'cannot be reached'}
          </div>
        )}
      </div>

      {/* ── Costing Breakdown Table ───────────────────────────── */}
      <div className="result-block">
        <h4>Costing Breakdown</h4>
        <table className="cost-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>₹/bottle</th>
              <th>₹/{casePack}-pack</th>
            </tr>
          </thead>
          <tbody>
            {d.unit.variableLines.map((l) => (
              <tr key={l.label}>
                <td>{l.label}</td>
                <td>{paise(l.amount)}</td>
                <td>{paise(l.amount * casePack)}</td>
              </tr>
            ))}
            <tr className="subtotal-row">
              <td>Variable total</td>
              <td>{paise(d.unit.variablePerBottle)}</td>
              <td>{paise(d.unit.variablePerBottle * casePack)}</td>
            </tr>
            {d.production.monthlyVolume > 0 && (
              <>
                <tr>
                  <td>Fixed overheads</td>
                  <td>{paise(d.unit.fixedPerBottle)}</td>
                  <td>{paise(d.unit.fixedPerBottle * casePack)}</td>
                </tr>
                <tr className="total-row">
                  <td>Landed cost</td>
                  <td>{paise(d.unit.landedPerBottle)}</td>
                  <td>{money(d.unit.landedPerBottle * casePack)}</td>
                </tr>
                <tr className="margin-row">
                  <td>Margin / bottle</td>
                  <td
                    style={{
                      color:
                        d.unit.landedPerBottle < a.wholesalePrice
                          ? 'var(--ok)'
                          : 'var(--crit)',
                    }}
                  >
                    {paise(a.wholesalePrice - d.unit.landedPerBottle)}
                  </td>
                  <td
                    style={{
                      color:
                        d.unit.landedPerBottle < a.wholesalePrice
                          ? 'var(--ok)'
                          : 'var(--crit)',
                    }}
                  >
                    {money((a.wholesalePrice - d.unit.landedPerBottle) * casePack)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Government Subsidies ──────────────────────────────── */}
      <div className="result-block">
        <h4>Government Subsidies Available</h4>
        <div className="small muted" style={{ marginBottom: 8 }}>
          Admissible cost (capped at scheme ceiling): {lakh(d.funding.admissibleCost)}
        </div>

        <div className="subsidy-scheme">
          <div className="scheme-badge central">Central</div>
          <div className="scheme-body">
            <div className="scheme-name">PMEGP — Ministry of MSME</div>
            <div className="scheme-note">Rural women category · 35% capital subsidy</div>
          </div>
          <div className="scheme-amount good">{lakh(d.funding.subsidy)}</div>
        </div>

        <div className="subsidy-scheme" style={{ marginTop: 8 }}>
          <div className="scheme-badge state">UP State</div>
          <div className="scheme-body">
            <div className="scheme-name">ODOP / UP MSME Capital Subsidy</div>
            <div className="scheme-note">
              {(a.upStateSubsidyRate ?? 0) > 0
                ? `${((a.upStateSubsidyRate ?? 0) * 100).toFixed(0)}% applied — set in Section E`
                : 'Set UP State % in Section E if applicable'}
            </div>
          </div>
          <div className={`scheme-amount ${(a.upStateSubsidyRate ?? 0) > 0 ? 'good' : 'muted'}`}>
            {(a.upStateSubsidyRate ?? 0) > 0 ? lakh(d.funding.upStateSubsidy) : '—'}
          </div>
        </div>

        <div className="subsidy-scheme" style={{ marginTop: 8 }}>
          <div className="scheme-badge info">Central</div>
          <div className="scheme-body">
            <div className="scheme-name">Mudra Tarun / MSME Credit Guarantee</div>
            <div className="scheme-note">Interest subvention 2–3% on working capital loan</div>
          </div>
          <div className="scheme-amount muted">Info</div>
        </div>

        <KV
          label="Total govt capital support"
          value={lakh(d.funding.totalSubsidy)}
          strong
          tone="good"
        />
      </div>

      {/* ── Project Funding Summary ───────────────────────────── */}
      <div className="result-block">
        <h4>Project Funding Summary</h4>
        <table className="cost-table">
          <tbody>
            <tr>
              <td>Total project cost</td>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                {lakh(d.capex.total)}
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 10, color: 'var(--ok)' }}>
                − PMEGP Central ({(a.subsidyRate * 100).toFixed(0)}%)
              </td>
              <td colSpan={2} style={{ textAlign: 'right', color: 'var(--ok)' }}>
                {lakh(d.funding.subsidy)}
              </td>
            </tr>
            {(a.upStateSubsidyRate ?? 0) > 0 && (
              <tr>
                <td style={{ paddingLeft: 10, color: 'var(--ok)' }}>
                  − UP State ({((a.upStateSubsidyRate ?? 0) * 100).toFixed(0)}%)
                </td>
                <td colSpan={2} style={{ textAlign: 'right', color: 'var(--ok)' }}>
                  {lakh(d.funding.upStateSubsidy)}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ paddingLeft: 10 }}>− Bank loan</td>
              <td colSpan={2} style={{ textAlign: 'right' }}>
                {lakh(d.funding.loan)}
              </td>
            </tr>
            {d.funding.excessOverCeiling > 0 && (
              <tr>
                <td style={{ paddingLeft: 10, color: 'var(--crit)' }}>
                  + Above ceiling (self-fund)
                </td>
                <td colSpan={2} style={{ textAlign: 'right', color: 'var(--crit)' }}>
                  {money(d.funding.excessOverCeiling)}
                </td>
              </tr>
            )}
            <tr className="total-row">
              <td>Own cash required</td>
              <td colSpan={2} style={{ textAlign: 'right' }}>
                {lakh(d.funding.totalOwnCash)}
              </td>
            </tr>
            <tr>
              <td style={{ color: 'var(--ink-3)', fontSize: 11.5 }}>
                Monthly EMI ({a.tenureMonths / 12} yr @ {a.interestRatePa}%)
              </td>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                {money(d.funding.emi)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ProjectCost() {
  const active = useScenarios((s) => s.scenarios.find((x) => x.id === s.activeId))
  const update = useScenarios((s) => s.update)
  const create = useScenarios((s) => s.create)

  const result = useMemo(() => {
    if (!active) return null
    const d = computeScenario(active)
    return { d, findings: validate(active, d) }
  }, [active])

  if (!active || !result) {
    return (
      <>
        <ScenarioBar />
        <Empty title="No scenario open">
          <p>Create a scenario to start the calculator.</p>
          <button className="primary" onClick={() => create('Alaipur pilot')}>
            Create scenario
          </button>
        </Empty>
      </>
    )
  }

  const { d, findings } = result
  const a = active.assumptions
  const patch = (fn: (s: Scenario) => Scenario) => update(active.id, fn)
  const setA = (k: keyof Scenario['assumptions'], v: number) =>
    patch((s) => ({ ...s, assumptions: { ...s.assumptions, [k]: v } }))

  const setNote = (k: keyof Scenario['assumptions'], v: string) =>
    patch((s) => ({ ...s, assumptions: { ...s.assumptions, [k]: v || undefined } }))

  const applyBottlePreset = (idx: number) => {
    const p = BOTTLE_SIZES[idx]
    patch((s) => ({
      ...s,
      assumptions: {
        ...s.assumptions,
        casePackSize: p.casePackSize,
        preformCostPb: p.preformCostPb,
        capCostPb: p.capCostPb,
        shrinkCostPp: p.shrinkCostPp,
        sellingPricePp: p.sellingPricePp,
      },
    }))
  }

  const currentSizeIdx = BOTTLE_SIZES.findIndex(
    (p) =>
      p.casePackSize === (a.casePackSize ?? 24) &&
      Math.abs(p.sellingPricePp - (a.sellingPricePp ?? 95)) < 1,
  )

  const criticals = findings.filter((f) => f.severity === 'critical')

  return (
    <>
      <ScenarioBar />

      <div className="page-head">
        <p className="eyebrow">Calculator</p>
        <h1>Plant Configuration &amp; Costs</h1>
      </div>

      {criticals.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Findings items={criticals} />
        </div>
      )}

      <div className="pc-layout">
        {/* ═══════════════════ LEFT FORM ═══════════════════ */}
        <div>

          {/* A · Plant Machinery & Solar CAPEX ────────────── */}
          <div className="card">
            <div className="card-head">
              <h3>A · Plant Machinery &amp; Solar CAPEX</h3>
              <span className="card-subtotal">{lakh(d.capex.machinery + d.capex.solar)}</span>
            </div>

            <div className="pc-item-grid">
              <div>
                <div className="pc-item-label">RO Water Filter Plant</div>
                <div className="pc-item-hint">Purifies borewell water to 100% pure.</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: capacity, manufacturer…"
                  value={a.noteRoPlant ?? ''}
                  onChange={(e) => setNote('noteRoPlant', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexRoPlant ?? 0} onChange={(v) => setA('capexRoPlant', v)} step={10000} />

              <div>
                <div className="pc-item-label">PET Blower + Compressor + Chiller</div>
                <div className="pc-item-hint">Blows preforms into bottles. 20-bar compressor. UP summer-rated chiller.</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: make, model, capacity…"
                  value={a.noteBlowerUnit ?? ''}
                  onChange={(e) => setNote('noteBlowerUnit', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexBlowerUnit ?? 0} onChange={(v) => setA('capexBlowerUnit', v)} step={10000} />

              <div>
                <div className="pc-item-label">RFC Monoblock + Labeler + Coder + Shrink</div>
                <div className="pc-item-hint">Washes, fills, caps, labels, prints MRP, and shrink-wraps automatically.</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: BPM, vendor, model…"
                  value={a.noteMonoblockUnit ?? ''}
                  onChange={(e) => setNote('noteMonoblockUnit', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexMonoblockUnit ?? 0} onChange={(v) => setA('capexMonoblockUnit', v)} step={10000} />

              <div>
                <div className="pc-item-label">Custom Square Metal Molds</div>
                <div className="pc-item-hint">Dies for your unique square bottle shape (2 sets, NCR toolmakers).</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: toolmaker, sizes, sets…"
                  value={a.noteMolds ?? ''}
                  onChange={(e) => setNote('noteMolds', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexMolds ?? 0} onChange={(v) => setA('capexMolds', v)} step={5000} />

              <div>
                <div className="pc-item-label">☀️ Solar Power Plant Setup (40 kW On-Grid)</div>
                <div className="pc-item-hint">Panels on shed roof — drastically cuts the electricity bill.</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: kW, panels, installer…"
                  value={a.noteSolar ?? ''}
                  onChange={(e) => setNote('noteSolar', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexSolar ?? 0} onChange={(v) => setA('capexSolar', v)} step={50000} />
            </div>
          </div>

          {/* B · Infrastructure & Pre-Ops ──────────────────── */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <h3>B · Infrastructure &amp; Pre-Ops CAPEX</h3>
              <span className="card-subtotal">{lakh(d.capex.civil + d.capex.statutoryOneTime + d.capex.workingCapital)}</span>
            </div>

            <div className="pc-item-grid">
              <div>
                <div className="pc-item-label">Civil Shed, Clean Room &amp; BIS Lab</div>
                <div className="pc-item-hint">Tin shed, epoxy floors, glass partitions, testing lab (BIS IS:14543).</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: sq. ft., contractor, location…"
                  value={a.noteCivil ?? ''}
                  onChange={(e) => setNote('noteCivil', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexCivil ?? 0} onChange={(v) => setA('capexCivil', v)} step={10000} />

              <div>
                <div className="pc-item-label">Borewell + Motor + HDPE Water Tank</div>
                <div className="pc-item-hint">Borewell drilling (100–300 ft), submersible pump motor, 10,000 L HDPE raw-water storage tank.</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: depth, driller, tank size…"
                  value={a.noteBorewell ?? ''}
                  onChange={(e) => setNote('noteBorewell', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexBorewell ?? 0} onChange={(v) => setA('capexBorewell', v)} step={5000} />

              <div>
                <div className="pc-item-label">BIS IS:14543 + FSSAI + State NOC Fees</div>
                <div className="pc-item-hint">Mandatory one-time: BIS application, water testing, NABL calibration, radioactive residue, caps &amp; bottle testing, FSSAI registration.</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: BIS file no., consultant, timeline…"
                  value={a.noteLicensing ?? ''}
                  onChange={(e) => setNote('noteLicensing', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexLicensing ?? 0} onChange={(v) => setA('capexLicensing', v)} step={5000} />

              <div>
                <div className="pc-item-label">Working Capital (Cash Reserve)</div>
                <div className="pc-item-hint">Cash for 2-week raw material stock (preforms, caps, labels) + first-month salaries before revenue arrives.</div>
                <input
                  className="pc-item-note"
                  placeholder="Add note: months of runway, purpose…"
                  value={a.noteWorkingCap ?? ''}
                  onChange={(e) => setNote('noteWorkingCap', e.target.value)}
                />
              </div>
              <Field label="Cost (₹)" value={a.capexWorkingCap ?? 0} onChange={(v) => setA('capexWorkingCap', v)} step={10000} />
            </div>
          </div>

          {/* C · Operations, Solar & Electricity ──────────── */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <h3>C · Operations, Solar &amp; Electricity</h3>
              <span className="card-subtotal">{count(d.production.dailyOutput)} bottles/day</span>
            </div>

            <div className="grid two" style={{ gap: 10 }}>
              <Field
                label="Daily operating hours"
                suffix="hrs"
                value={a.shiftHours}
                onChange={(v) => setA('shiftHours', v)}
                hint="Standard: 8 hrs per shift"
              />
              <Field
                label="☀️ Solar effective hours"
                suffix="hrs free"
                value={a.solarHours ?? 0}
                onChange={(v) => setA('solarHours', v)}
                hint="9 AM – 4 PM ≈ 7 hrs. Remaining hours use grid."
              />
              <Field
                label="Machine running load"
                suffix="kW"
                value={a.runningLoadKw ?? 35}
                onChange={(v) => setA('runningLoadKw', v)}
                hint="Total factory load"
              />
              <Field
                label="UP electricity tariff"
                suffix="₹/kWh"
                step={0.1}
                value={a.tariffPerKwh}
                onChange={(v) => setA('tariffPerKwh', v)}
                hint="₹8.00 base UPPCL tariff (LT-4 commercial)"
              />
              <Field
                label="Operating days"
                suffix="per month"
                value={a.workingDays}
                onChange={(v) => setA('workingDays', v)}
                hint="25 = Sundays off"
              />
              <Field
                label="True speed (BPM)"
                suffix="bottles/min"
                value={a.fillerBpm}
                onChange={(v) => setA('fillerBpm', v)}
                hint="Real-world speed accounting for stoppages"
              />
            </div>

            <div className="grid two" style={{ gap: 10, marginTop: 2 }}>
              <Field
                label="Total staff salaries"
                suffix="₹/month"
                step={1000}
                value={a.monthlySalaries ?? 90000}
                onChange={(v) => setA('monthlySalaries', v)}
                hint="Chemist ₹18k + Manager ₹20k + Operator ₹15k + 3×Helpers ₹30k + misc"
              />
              <Field
                label="Plant maintenance & misc fixed"
                suffix="₹/month"
                step={1000}
                value={a.monthlyMaintenance ?? 0}
                onChange={(v) => setA('monthlyMaintenance', v)}
                hint="Flat override — spares, repairs, consumables. 0 = use % of machinery."
              />
            </div>
          </div>

          {/* Bottle size selector ─────────────────────────── */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <h3>Select Bottle Size to Manufacture</h3>
              <span className="small muted">Changes preform weight, pack size &amp; prices</span>
            </div>
            <div className="btnrow">
              {BOTTLE_SIZES.map((p, i) => (
                <button
                  key={p.label}
                  className={currentSizeIdx === i ? 'primary' : ''}
                  onClick={() => applyBottlePreset(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* D · Bottle Specs & Raw Materials ──────────────── */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <h3>D · Bottle Specs &amp; Raw Materials</h3>
              <span className="card-subtotal">{paise(d.unit.consumablesPerBottle)}/bottle</span>
            </div>

            <div className="grid two" style={{ gap: 10 }}>
              <Field
                label="Bottles per packet (case size)"
                value={a.casePackSize ?? 24}
                onChange={(v) => setA('casePackSize', Math.round(v))}
                hint="24 for 300 ml & 600 ml; 12 for 1200 ml"
              />
              <div /> {/* spacer */}

              <Field
                label="Raw preform cost"
                suffix="₹/bottle"
                step={0.05}
                value={a.preformCostPb ?? 1.2}
                onChange={(v) => setA('preformCostPb', v)}
                hint="Kanpur PET resin. 300ml: ₹1.20"
              />
              <Field
                label="Cap cost"
                suffix="₹/bottle"
                step={0.01}
                value={a.capCostPb ?? 0.23}
                onChange={(v) => setA('capCostPb', v)}
                hint="Virgin plastic lid"
              />
              <Field
                label="Label cost"
                suffix="₹/bottle"
                step={0.01}
                value={a.labelCostPb ?? 0.20}
                onChange={(v) => setA('labelCostPb', v)}
                hint="Printed brand sticker"
              />
              <Field
                label="Ink &amp; gas cost"
                suffix="₹/bottle"
                step={0.01}
                value={a.inkCostPb ?? 0.06}
                onChange={(v) => setA('inkCostPb', v)}
                hint="Printer ink + purifying gas"
              />
              <Field
                label="Shrink wrap"
                suffix="₹/packet"
                step={0.25}
                value={a.shrinkCostPp ?? 4}
                onChange={(v) => setA('shrinkCostPp', v)}
                hint="Thick plastic to bundle the packet"
              />
            </div>
          </div>

          {/* E · Revenue & Financing ───────────────────────── */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <h3>E · Revenue &amp; Financing</h3>
              <span className="card-subtotal">{lakh(d.cashflow.monthlyRevenue)}/mo</span>
            </div>

            <div className="grid two" style={{ gap: 10 }}>
              <Field
                label="Wholesale selling price"
                suffix="₹/packet"
                step={5}
                value={a.sellingPricePp ?? 95}
                onChange={(v) => setA('sellingPricePp', v)}
                hint="What you charge the hotel/shopkeeper for 1 full packet"
              />
              <Field
                label="Estimated logistic cost"
                suffix="₹/packet"
                step={1}
                value={a.logisticCostPp ?? 11}
                onChange={(v) => setA('logisticCostPp', v)}
                hint="Diesel + toll for one packet to Lucknow"
              />
              <Field
                label="PMEGP Central subsidy"
                suffix="%"
                step={5}
                value={a.subsidyRate * 100}
                onChange={(v) => setA('subsidyRate', v / 100)}
                hint="Rural women special category: 35%"
              />
              <Field
                label="UP State subsidy (ODOP/MSME)"
                suffix="%"
                step={5}
                value={(a.upStateSubsidyRate ?? 0) * 100}
                onChange={(v) => setA('upStateSubsidyRate', v / 100)}
                hint="0 if not applicable. ODOP districts may get 10–25% additional."
              />
              <Field
                label="Bank loan interest"
                suffix="% p.a."
                step={0.25}
                value={a.interestRatePa}
                onChange={(v) => setA('interestRatePa', v)}
                hint="SBI / BOB MSME: ~11%"
              />
              <Field
                label="Loan tenure"
                suffix="years"
                step={1}
                value={a.tenureMonths / 12}
                onChange={(v) => setA('tenureMonths', v * 12)}
                hint="Standard: 5 years"
              />
            </div>
          </div>

          {/* Model checks ─────────────────────────────────── */}
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Model checks</h3>
            <Findings items={findings} />
          </div>
        </div>

        {/* ═══════════════════ RIGHT PANEL ═══════════════════ */}
        <div className="pc-results">
          <ResultsPanel d={d} a={a} />
        </div>
      </div>
    </>
  )
}
