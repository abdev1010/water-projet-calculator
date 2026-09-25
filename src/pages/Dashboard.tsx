import { useMemo } from 'react'
import { useScenarios } from '../store/scenarios'
import { computeScenario } from '../model/engine'
import { validate } from '../model/validate'
import { lakh, money, paise, count, pct } from '../model/format'
import { Tile, Findings, Empty } from '../components/Bits'
import { ScenarioBar } from '../components/ScenarioBar'

export function Dashboard() {
  const active = useScenarios((s) => s.scenarios.find((x) => x.id === s.activeId))
  const create = useScenarios((s) => s.create)
  const loadExample = useScenarios((s) => s.loadExample)

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
          <p>
            A scenario holds every input for one version of the plant — machinery, civil work,
            consumables, labour, freight, licences and financing. Everything else in this app is
            a view over it.
          </p>
          <div className="btnrow" style={{ justifyContent: 'center' }}>
            <button className="primary" onClick={() => create('Alaipur pilot')}>
              Start a blank scenario
            </button>
            <button onClick={() => loadExample()}>Load the example model</button>
          </div>
        </Empty>
      </>
    )
  }

  const { d, findings } = result
  const criticals = findings.filter((f) => f.severity === 'critical').length

  return (
    <>
      <ScenarioBar />

      <div className="page-head">
        <p className="eyebrow">Summary</p>
        <h1>{active.name}</h1>
        <p className="muted small">
          Every figure below is derived from the inputs. Nothing here is typed in directly.
        </p>
      </div>

      <div className="tiles" style={{ marginBottom: 18 }}>
        <Tile value={lakh(d.capex.total)} label="Total project cost" detail="Incl. licences & working capital" />
        <Tile value={lakh(d.funding.totalOwnCash)} label="Your own cash" detail="Contribution + amount above ceiling" />
        <Tile value={lakh(d.funding.subsidy)} label="Subsidy" detail={`${pct(active.assumptions.subsidyRate)} of admissible cost`} />
        <Tile value={money(d.funding.emi)} label="Monthly EMI" detail={`On a ${lakh(d.funding.loan)} loan`} />
        <Tile
          value={count(d.production.monthlyVolume)}
          label="Bottles / month"
          detail={`${pct(d.production.utilisation)} of capacity`}
        />
        <Tile
          value={money(d.cashflow.netMonthly)}
          label="Net monthly cash"
          tone={d.cashflow.netMonthly >= 0 ? 'good' : 'bad'}
          detail="After opex and EMI"
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3>
          {criticals > 0
            ? `${criticals} thing${criticals > 1 ? 's' : ''} to fix`
            : 'Model checks'}
        </h3>
        <Findings items={findings} />
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Production</h3>
          <div className="tablewrap">
            <table>
              <tbody>
                <tr><td>Filler rating</td><td className="num">{count(d.production.fillerBph)} bph</td></tr>
                <tr>
                  <td>Actual line rate</td>
                  <td className="num">
                    {count(d.production.lineRateBph)} bph
                    {d.production.bottleneck ? (
                      <div className="small" style={{ color: 'var(--crit)' }}>
                        limited by {d.production.bottleneck}
                      </div>
                    ) : null}
                  </td>
                </tr>
                <tr><td>After efficiency</td><td className="num">{count(d.production.effectiveBph)} bph</td></tr>
                <tr><td>Per day</td><td className="num">{count(d.production.dailyOutput)}</td></tr>
                <tr><td>Capacity / month</td><td className="num">{count(d.production.monthlyCapacity)}</td></tr>
                <tr><td>Planned volume</td><td className="num">{count(d.production.monthlyVolume)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="bar" title={pct(d.production.utilisation) + ' utilisation'}>
            <span style={{ width: Math.min(100, d.production.utilisation * 100) + '%' }} />
          </div>
          <div className="small muted" style={{ marginTop: 5 }}>
            {pct(d.production.utilisation)} of what the line could make
          </div>
        </div>

        <div className="card">
          <h3>Per bottle</h3>
          <div className="tablewrap">
            <table>
              <tbody>
                {d.unit.variableLines
                  .filter((l) => l.amount !== 0)
                  .map((l) => (
                    <tr key={l.label}>
                      <td className="muted">{l.label}</td>
                      <td className="num">{paise(l.amount)}</td>
                    </tr>
                  ))}
                <tr>
                  <td><strong>Variable cost</strong></td>
                  <td className="num"><strong>{paise(d.unit.variablePerBottle)}</strong></td>
                </tr>
                <tr>
                  <td className="muted">Fixed costs, spread over volume</td>
                  <td className="num">{paise(d.unit.fixedPerBottle)}</td>
                </tr>
                <tr>
                  <td><strong>Landed cost</strong></td>
                  <td className="num"><strong>{paise(d.unit.landedPerBottle)}</strong></td>
                </tr>
                <tr>
                  <td>Selling price</td>
                  <td className="num">{paise(active.assumptions.wholesalePrice)}</td>
                </tr>
                <tr>
                  <td><strong>Contribution</strong></td>
                  <td className="num" style={{ color: d.breakeven.contributionPerBottle > 0 ? 'var(--ok)' : 'var(--crit)' }}>
                    <strong>{paise(d.breakeven.contributionPerBottle)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 9, marginBottom: 0 }}>
            Contribution uses variable cost, not landed cost — landed cost already contains the
            fixed costs that break-even is solving for.
          </p>
        </div>

        <div className="card">
          <h3>Monthly cash</h3>
          <div className="tablewrap">
            <table>
              <tbody>
                <tr><td>Revenue</td><td className="num">{money(d.cashflow.monthlyRevenue)}</td></tr>
                <tr><td className="muted">Variable cost</td><td className="num">−{money(d.cashflow.monthlyVariableCost)}</td></tr>
                <tr><td className="muted">Fixed cost</td><td className="num">−{money(d.cashflow.monthlyFixedCost)}</td></tr>
                <tr><td><strong>EBITDA</strong></td><td className="num"><strong>{money(d.cashflow.ebitda)}</strong></td></tr>
                <tr><td className="muted">EMI</td><td className="num">−{money(d.cashflow.emi)}</td></tr>
                <tr>
                  <td><strong>Net</strong></td>
                  <td className="num" style={{ color: d.cashflow.netMonthly >= 0 ? 'var(--ok)' : 'var(--crit)' }}>
                    <strong>{money(d.cashflow.netMonthly)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Break-even</h3>
          <div className="tablewrap">
            <table>
              <tbody>
                <tr><td>Bottles / month</td><td className="num">{count(d.breakeven.monthlyUnits)}</td></tr>
                <tr><td>Bottles / day</td><td className="num">{count(d.breakeven.dailyUnits)}</td></tr>
                <tr>
                  <td>As share of capacity</td>
                  <td className="num">{pct(d.breakeven.utilisationAtBreakeven)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 9, marginBottom: 0 }}>
            Covers all fixed costs plus the EMI.
          </p>
        </div>
      </div>
    </>
  )
}
