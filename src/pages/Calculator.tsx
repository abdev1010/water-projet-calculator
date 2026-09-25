import { useEffect, useMemo } from 'react'
import { useScenarios } from '../store/scenarios'
import { computeScenario } from '../model/engine'
import { validate } from '../model/validate'
import { calculatorDefaults } from '../model/calculatorDefaults'
import { money, lakh, paise, count, pct, uid } from '../model/format'
import type { Scenario } from '../model/types'

/* ------------------------------------------------------------------ atoms */

function Row({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  hint,
  width = 96,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
  suffix?: string
  hint?: string
  width?: number
}) {
  return (
    <div className="cfield">
      <div className="crow">
        <label>
          {label}
          {suffix ? <em> {suffix}</em> : null}
        </label>
        <input
          className="num"
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          style={{ width }}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      {hint ? <div className="chint">{hint}</div> : null}
    </div>
  )
}

function Sec({ n, title, children, note }: { n: number; title: string; children: React.ReactNode; note?: string }) {
  return (
    <details className="csec" open>
      <summary>
        <span className="secnum">{n}</span>
        {title}
      </summary>
      {note ? <p className="csec-note">{note}</p> : null}
      <div className="csec-body">{children}</div>
    </details>
  )
}

function Out({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div className={'orow' + (strong ? ' strong' : '')}>
      <span>{label}</span>
      <span className="oval" style={tone ? { color: tone === 'good' ? 'var(--ok)' : 'var(--crit)' } : undefined}>
        {value}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------- page */

export function Calculator() {
  const scenarios = useScenarios((s) => s.scenarios)
  const activeId = useScenarios((s) => s.activeId)
  const update = useScenarios((s) => s.update)
  const setActive = useScenarios((s) => s.setActive)

  useEffect(() => {
    if (scenarios.length === 0) {
      const seeded = calculatorDefaults()
      useScenarios.setState({ scenarios: [seeded], activeId: seeded.id })
    } else if (!activeId) {
      setActive(scenarios[0]!.id)
    }
  }, [scenarios.length, activeId, setActive])

  const active = scenarios.find((s) => s.id === activeId)

  const result = useMemo(() => {
    if (!active) return null
    const d = computeScenario(active)
    return { d, findings: validate(active, d) }
  }, [active])

  if (!active || !result) return <div className="empty">Loading…</div>

  const { d, findings } = result
  const a = active.assumptions
  const patch = (fn: (s: Scenario) => Scenario) => update(active.id, fn)
  const setA = (k: keyof typeof a, v: number | string | boolean) =>
    patch((s) => ({ ...s, assumptions: { ...s.assumptions, [k]: v } as typeof s.assumptions }))

  const fixBottleneck = () =>
    patch((s) => ({
      ...s,
      machinery: s.machinery.map((m) =>
        m.ratedBph && m.ratedBph < s.assumptions.fillerBpm * 60
          ? { ...m, ratedBph: s.assumptions.fillerBpm * 60 }
          : m,
      ),
    }))

  const resetAll = () => {
    if (!confirm('Reset every value back to the prefilled defaults? Your edits will be lost.')) return
    const fresh = calculatorDefaults(active.name)
    patch(() => ({ ...fresh, id: active.id, createdAt: active.createdAt }))
  }

  const critical = findings.filter((f) => f.severity === 'critical')
  const marginPerBottle = a.wholesalePrice - d.unit.landedPerBottle
  const revenuePerCase = a.wholesalePrice * (a.casePackSize ?? 24)

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">One-page calculator</p>
        <h1>Project cost → bottle cost → revenue</h1>
        <p className="muted small">
          Left is input, right is derived. Nothing on the right can be typed — it is all computed
          from the left, so the two can never disagree.
        </p>
        <div className="btnrow" style={{ marginTop: 10 }}>
          <input value={active.name} style={{ width: 280 }} onChange={(e) => patch((s) => ({ ...s, name: e.target.value }))} />
          <button onClick={resetAll}>Reset to defaults</button>
        </div>
      </div>

      <div className="calc">
        {/* ================================================ LEFT — INPUTS */}
        <div className="calc-in">

          {/* ------------------------------------------ 1 MACHINERY */}
          <Sec n={1} title="Plant machinery (CAPEX)" note="kW drives the electricity cost. Rated BPH drives the bottleneck check — the line runs at its slowest machine, not the filler's badge.">
            <div className="mhead">
              <span>Machine</span><span>Cost ₹</span><span>kW</span><span>BPH</span><span />
            </div>
            {active.machinery.map((m) => (
              <div key={m.id}>
                <div className="mrow">
                  <input value={m.name} onChange={(e) => patch((s) => ({ ...s, machinery: s.machinery.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) }))} />
                  <input className="num" type="number" value={m.cost} onChange={(e) => patch((s) => ({ ...s, machinery: s.machinery.map((x) => (x.id === m.id ? { ...x, cost: parseFloat(e.target.value) || 0 } : x)) }))} />
                  <input className="num" type="number" step="0.1" placeholder="—" value={m.powerKw ?? ''} onChange={(e) => patch((s) => ({ ...s, machinery: s.machinery.map((x) => (x.id === m.id ? { ...x, powerKw: e.target.value === '' ? undefined : parseFloat(e.target.value) } : x)) }))} />
                  <input className="num" type="number" placeholder="—" value={m.ratedBph ?? ''} onChange={(e) => patch((s) => ({ ...s, machinery: s.machinery.map((x) => (x.id === m.id ? { ...x, ratedBph: e.target.value === '' ? undefined : parseFloat(e.target.value) } : x)) }))} />
                  <button className="ghost danger" onClick={() => patch((s) => ({ ...s, machinery: s.machinery.filter((x) => x.id !== m.id) }))}>×</button>
                </div>
                {m.note ? <div className="mnote">{m.note}</div> : null}
              </div>
            ))}
            <button style={{ marginTop: 8 }} onClick={() => patch((s) => ({ ...s, machinery: [...s.machinery, { id: uid('m'), name: '', cost: 0, qty: 1, confidence: 'assumption' }] }))}>+ machine</button>
          </Sec>

          {/* ------------------------------------------ 2 CIVIL & LAB */}
          <Sec n={2} title="Civil, lab & infrastructure">
            {active.civil.map((c) => (
              <div key={c.id}>
                <div className="crow">
                  <input value={c.name} onChange={(e) => patch((s) => ({ ...s, civil: s.civil.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) }))} />
                  <input className="num" type="number" style={{ width: 96 }} value={c.cost} onChange={(e) => patch((s) => ({ ...s, civil: s.civil.map((x) => (x.id === c.id ? { ...x, cost: parseFloat(e.target.value) || 0 } : x)) }))} />
                </div>
                {c.note ? <div className="mnote">{c.note}</div> : null}
              </div>
            ))}
            <button style={{ marginTop: 6 }} onClick={() => patch((s) => ({ ...s, civil: [...s.civil, { id: uid('c'), name: '', cost: 0, qty: 1, confidence: 'assumption' }] }))}>+ item</button>

            <div className="subhead">Working capital & pre-operative</div>
            {active.workingCapital.map((c) => (
              <div className="crow" key={c.id}>
                <input value={c.name} onChange={(e) => patch((s) => ({ ...s, workingCapital: s.workingCapital.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) }))} />
                <input className="num" type="number" style={{ width: 96 }} value={c.cost} onChange={(e) => patch((s) => ({ ...s, workingCapital: s.workingCapital.map((x) => (x.id === c.id ? { ...x, cost: parseFloat(e.target.value) || 0 } : x)) }))} />
              </div>
            ))}

            <div className="subhead">Licences & statutory <span className="addtag">added</span></div>
            {active.statutory.map((x) => (
              <div className="crow3" key={x.id}>
                <input value={x.name} onChange={(e) => patch((s) => ({ ...s, statutory: s.statutory.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)) }))} />
                <input className="num" type="number" value={x.amount} onChange={(e) => patch((s) => ({ ...s, statutory: s.statutory.map((y) => (y.id === x.id ? { ...y, amount: parseFloat(e.target.value) || 0 } : y)) }))} />
                <select value={x.recurrence} onChange={(e) => patch((s) => ({ ...s, statutory: s.statutory.map((y) => (y.id === x.id ? { ...y, recurrence: e.target.value as typeof y.recurrence } : y)) }))}>
                  <option value="oneTime">one-time</option>
                  <option value="annual">annual</option>
                  <option value="monthly">monthly</option>
                </select>
              </div>
            ))}
          </Sec>

          {/* ------------------------------------------ 3 OPERATIONS */}
          <Sec n={3} title="Operational parameters">
            <Row label="Machine rated capacity" suffix="BPM" value={a.fillerBpm} onChange={(v) => setA('fillerBpm', v)} />
            <Row label="Operational efficiency" suffix="%" step={5} value={Math.round(a.lineEfficiency * 100)} onChange={(v) => setA('lineEfficiency', v / 100)} hint="New lines realistically run 60–70% of nameplate once jams, changeovers, cleaning and power dips are counted." />
            <Row label="Operating hours per day" value={a.shiftHours} onChange={(v) => setA('shiftHours', v)} />
            <Row label="Shifts per day" value={a.shiftsPerDay} onChange={(v) => setA('shiftsPerDay', v)} hint="A second shift doubles the wage bill if the per-shift box below is ticked." />
            <Row label="Operating days per month" value={a.workingDays} onChange={(v) => setA('workingDays', v)} />
            <Row label="Bottles per master pack" suffix="case" value={a.casePackSize ?? 24} onChange={(v) => setA('casePackSize', v)} />
            <div className="crow">
              <label>Volume driven by</label>
              <select style={{ width: 150 }} value={a.volumeMode} onChange={(e) => setA('volumeMode', e.target.value)}>
                <option value="salesLed">what I can sell</option>
                <option value="capacityLed">plant capacity</option>
              </select>
            </div>
            {a.volumeMode === 'salesLed' && (
              <Row label="Bottles I expect to sell" suffix="/month" step={5000} width={110} value={a.monthlySalesTarget} onChange={(v) => setA('monthlySalesTarget', v)} />
            )}
          </Sec>

          {/* ------------------------------------------ 4 RAW MATERIAL */}
          <Sec n={4} title="Variable raw material (per 600ml bottle)">
            {active.consumables.map((c) => (
              <div key={c.id}>
                <div className="crow4">
                  <input type="checkbox" checked={c.enabled} title="Include" onChange={(e) => patch((s) => ({ ...s, consumables: s.consumables.map((x) => (x.id === c.id ? { ...x, enabled: e.target.checked } : x)) }))} />
                  <input value={c.name} onChange={(e) => patch((s) => ({ ...s, consumables: s.consumables.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) }))} />
                  <input className="num" type="number" step="0.01" value={c.costPerUnit} onChange={(e) => patch((s) => ({ ...s, consumables: s.consumables.map((x) => (x.id === c.id ? { ...x, costPerUnit: parseFloat(e.target.value) || 0 } : x)) }))} />
                  <span className="unit">{c.unit === 'pack' ? `/${c.packSize}-pack` : '/bottle'}</span>
                </div>
                {c.note ? <div className="mnote">{c.note}</div> : null}
              </div>
            ))}
            <Row label="Breakage & rejection" suffix="%" step={0.5} value={a.breakagePct} onChange={(v) => setA('breakagePct', v)} hint="ADDED — bottles lost at blowing, filling and in transit. 1–2% is normal." />
          </Sec>

          {/* ------------------------------------------ 5 UTILITIES */}
          <Sec n={5} title="Utilities, labour & logistics">
            <Row
              label="Running electrical load"
              suffix="kW"
              value={a.runningLoadKw ?? 0}
              onChange={(v) => setA('runningLoadKw', v)}
              hint={`Machine list implies ${d.power.derivedRunningKw.toFixed(1)} kW (${d.power.connectedKw.toFixed(1)} kW connected × ${a.diversityFactor} diversity). Set to 0 to use that instead.`}
            />
            <Row label="Electricity tariff" suffix="₹/kWh" step={0.5} value={a.tariffPerKwh} onChange={(v) => setA('tariffPerKwh', v)} />
            <Row label="DG backup fuel factor" suffix="₹/bottle" step={0.01} value={a.dgFuelPerBottle ?? 0} onChange={(v) => setA('dgFuelPerBottle', v)} />
            <Row label="Total monthly salaries" suffix="₹/mo" step={1000} width={110} value={a.monthlySalaries ?? 0} onChange={(v) => setA('monthlySalaries', v)} hint="Staff and helpers. Set to 0 to use the detailed role list on the Project cost page." />
            <div className="crow">
              <label>Wages scale with shifts</label>
              <input type="checkbox" checked={a.salariesPerShift ?? false} onChange={(e) => setA('salariesPerShift', e.target.checked)} style={{ width: 'auto' }} />
            </div>
            <Row label="Maintenance & misc fixed" suffix="₹/mo" step={1000} value={a.monthlyMaintenance ?? 0} onChange={(v) => setA('monthlyMaintenance', v)} />
            <Row label="Freight / delivery" suffix="₹ per case" step={0.5} value={a.freightPerCase ?? 0} onChange={(v) => setA('freightPerCase', v)} hint={`= ${paise((a.freightPerCase ?? 0) / Math.max(a.casePackSize ?? 24, 1))} per bottle. Freight is ~₹35/case per 100 km — the single biggest constraint on how far you can sell.`} />

            <div className="subhead">Costs not in the original list <span className="addtag">added</span></div>
            <Row label="NABL external testing" suffix="₹/mo" step={500} value={a.monthlyTesting} onChange={(v) => setA('monthlyTesting', v)} hint="Legally required monthly since Jan 2026. Not optional." />
            <Row label="Insurance" suffix="₹/mo" step={500} value={a.monthlyInsurance ?? 0} onChange={(v) => setA('monthlyInsurance', v)} />
            <Row label="Admin & compliance" suffix="₹/mo" step={500} value={a.monthlyAdmin} onChange={(v) => setA('monthlyAdmin', v)} />
            <Row label="Selling & distribution" suffix="₹/bottle" step={0.05} value={a.sellingCostPerBottle ?? 0} onChange={(v) => setA('sellingCostPerBottle', v)} hint="Trade schemes, samples, damaged-goods credits. Freight alone is not the cost of selling." />
            <Row label="Depreciation over" suffix="years" value={a.depreciationYears} onChange={(v) => setA('depreciationYears', v)} hint="Not a cash cost, but leaving it out overstates profit and a bank will add it back." />
          </Sec>

          {/* ------------------------------------------ 6 FINANCING */}
          <Sec n={6} title="Financing & commercial pricing">
            <Row label="Wholesale selling price" suffix="₹/bottle" step={0.25} value={a.wholesalePrice} onChange={(v) => setA('wholesalePrice', v)} hint={`Trade price, not MRP. = ${money(revenuePerCase)} per ${a.casePackSize ?? 24}-pack.`} />
            <Row label="PMEGP subsidy rate" suffix="%" step={1} value={Math.round(a.subsidyRate * 100)} onChange={(v) => setA('subsidyRate', v / 100)} hint="35% — special category (incl. women), rural. Verified against the Revised PMEGP Guidelines, 7 Dec 2023." />
            <Row label="Promoter margin / equity" suffix="%" step={1} value={Math.round(a.ownContributionRate * 100)} onChange={(v) => setA('ownContributionRate', v / 100)} hint="15% for special category, 25% general." />
            <Row label="Bank loan interest rate" suffix="% p.a." step={0.25} value={a.interestRatePa} onChange={(v) => setA('interestRatePa', v)} />
            <Row label="Loan tenure" suffix="years" step={1} value={Math.round(a.tenureMonths / 12)} onChange={(v) => setA('tenureMonths', v * 12)} />
            <Row label="Moratorium before EMI starts" suffix="months" value={a.moratoriumMonths ?? 0} onChange={(v) => setA('moratoriumMonths', v)} hint="ADDED — PMEGP loans usually carry 3–6 months. Interest still accrues; the EMI figure below is unaffected." />
            <Row label="Scheme ceiling" suffix="₹" step={100000} width={110} value={a.schemeCeiling} onChange={(v) => setA('schemeCeiling', v)} hint="PMEGP manufacturing cap is ₹50,00,000. Cost above it is yours to fund — declare the real number." />
          </Sec>
        </div>

        {/* =============================================== RIGHT — OUTPUTS */}
        <div className="calc-out">
          {critical.length > 0 && (
            <div className="finding critical">
              <div className="ftitle">{critical[0]!.title}</div>
              <div className="fdetail">{critical[0]!.detail}</div>
              {d.production.bottleneck && (
                <button className="primary" style={{ marginTop: 9 }} onClick={fixBottleneck}>
                  Fix: match {d.production.bottleneck} to the filler
                </button>
              )}
            </div>
          )}

          <div className="ocard">
            <h3>Project cost</h3>
            {d.capex.lines.map((l) => <Out key={l.label} label={l.label} value={money(l.amount)} />)}
            <Out label="Total project cost" value={lakh(d.capex.total)} strong />
          </div>

          <div className="ocard">
            <h3>Funding</h3>
            <Out label="Admissible under scheme" value={money(d.funding.admissibleCost)} />
            {d.funding.excessOverCeiling > 0 && <Out label="Above ceiling — your money" value={money(d.funding.excessOverCeiling)} tone="bad" />}
            <Out label="Promoter equity" value={money(d.funding.ownContribution)} />
            <Out label="Subsidy (non-repayable)" value={money(d.funding.subsidy)} tone="good" />
            <Out label="Bank term loan" value={money(d.funding.loan)} />
            <Out label="Total cash from you" value={money(d.funding.totalOwnCash)} strong />
            <Out label="Monthly EMI" value={money(d.funding.emi)} strong />
            {(a.moratoriumMonths ?? 0) > 0 && (
              <div className="chint" style={{ marginTop: 6 }}>Starts after a {a.moratoriumMonths}-month moratorium.</div>
            )}
          </div>

          <div className="ocard">
            <h3>Production</h3>
            <Out label="Filler rating" value={count(d.production.fillerBph) + ' bph'} />
            <Out label="Actual line rate" value={count(d.production.lineRateBph) + ' bph'} tone={d.production.bottleneck ? 'bad' : undefined} />
            <Out label="After efficiency" value={count(d.production.effectiveBph) + ' bph'} />
            <Out label="Per day" value={count(d.production.dailyOutput)} />
            <Out label="Capacity / month" value={count(d.production.monthlyCapacity)} />
            <Out label="Bottles made / month" value={count(d.production.monthlyVolume)} strong />
            <Out label="Cases / month" value={count(d.production.monthlyVolume / Math.max(a.casePackSize ?? 24, 1))} />
            <div className="bar"><span style={{ width: Math.min(100, d.production.utilisation * 100) + '%' }} /></div>
            <div className="chint" style={{ marginTop: 4 }}>
              {pct(d.production.utilisation)} of capacity · running load {d.power.runningKw.toFixed(1)} kW
              {d.power.manualLoadUsed && Math.abs(d.power.runningKw - d.power.derivedRunningKw) > 2
                ? ` (machines imply ${d.power.derivedRunningKw.toFixed(1)} kW)`
                : ''}
            </div>
          </div>

          <div className="ocard hero">
            <h3>Cost of one bottle</h3>
            {d.unit.variableLines.filter((l) => l.amount !== 0).map((l) => <Out key={l.label} label={l.label} value={paise(l.amount)} />)}
            <Out label="Variable cost" value={paise(d.unit.variablePerBottle)} strong />
            <Out label="Fixed costs ÷ volume" value={paise(d.unit.fixedPerBottle)} />
            <Out label="Full landed cost" value={paise(d.unit.landedPerBottle)} strong />
            <div className="chint" style={{ marginTop: 6 }}>Per case: {money(d.unit.landedPerBottle * (a.casePackSize ?? 24))}</div>
          </div>

          <div className="ocard hero">
            <h3>Revenue</h3>
            <Out label="Selling price" value={paise(a.wholesalePrice)} />
            <Out label="Margin per bottle" value={paise(marginPerBottle)} tone={marginPerBottle > 0 ? 'good' : 'bad'} strong />
            <Out label="Margin %" value={a.wholesalePrice > 0 ? pct(marginPerBottle / a.wholesalePrice) : '—'} />
            <Out label="Monthly revenue" value={money(d.cashflow.monthlyRevenue)} strong />
            <Out label="Variable cost" value={'−' + money(d.cashflow.monthlyVariableCost)} />
            <Out label="Fixed cost" value={'−' + money(d.cashflow.monthlyFixedCost)} />
            <Out label="EBITDA" value={money(d.cashflow.ebitda)} strong />
            <Out label="EMI" value={'−' + money(d.cashflow.emi)} />
            <Out label="Net monthly cash" value={money(d.cashflow.netMonthly)} tone={d.cashflow.netMonthly >= 0 ? 'good' : 'bad'} strong />
            <Out label="Net annual" value={money(d.cashflow.netMonthly * 12)} />
          </div>

          <div className="ocard">
            <h3>Fixed costs / month</h3>
            {d.fixed.lines.filter((l) => l.amount > 0).map((l) => <Out key={l.label} label={l.label} value={money(l.amount)} />)}
            <Out label="Total" value={money(d.fixed.total)} strong />
          </div>

          <div className="ocard">
            <h3>Break-even</h3>
            <Out label="Contribution / bottle" value={paise(d.breakeven.contributionPerBottle)} />
            <Out label="Bottles / month" value={count(d.breakeven.monthlyUnits)} strong />
            <Out label="Bottles / day" value={count(d.breakeven.dailyUnits)} strong />
            <Out label="Share of capacity" value={pct(d.breakeven.utilisationAtBreakeven)} />
          </div>

          {findings.length > 0 && (
            <div className="ocard">
              <h3>Checks ({findings.length})</h3>
              {findings.map((f) => (
                <div key={f.id} className={'finding ' + f.severity} style={{ marginBottom: 8 }}>
                  <div className="ftitle">{f.title}</div>
                  <div className="fdetail">{f.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
