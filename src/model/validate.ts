/**
 * Guard rails.
 *
 * These exist because financial models fail quietly. Every rule here was written
 * against a real mistake found in a real draft of this project's model — see
 * src/model/fixtures/exampleModel.ts and the tests beside it.
 */

import type { Derived } from './engine'
import type { Scenario } from './types'

export type Severity = 'critical' | 'warning' | 'info'

export interface Finding {
  id: string
  severity: Severity
  title: string
  detail: string
}

const fmtInt = (n: number) =>
  isFinite(n) ? new Intl.NumberFormat('en-IN').format(Math.round(n)) : '—'

export function validate(s: Scenario, d: Derived): Finding[] {
  const out: Finding[] = []
  const a = s.assumptions

  // 1. Line bottleneck ------------------------------------------------------
  if (d.production.bottleneck) {
    const lostPct = 1 - d.production.lineRateBph / d.production.fillerBph
    out.push({
      id: 'bottleneck',
      severity: 'critical',
      title: `Line is limited by ${d.production.bottleneck}`,
      detail:
        `Your filler is rated ${fmtInt(d.production.fillerBph)} bottles/hour but ` +
        `${d.production.bottleneck} caps the line at ${fmtInt(d.production.lineRateBph)}. ` +
        `You are paying for ${(lostPct * 100).toFixed(0)}% filling capacity you cannot use. ` +
        `Either upgrade that machine or buy the intermediate product in.`,
    })
  }

  // 2. Scheme ceiling -------------------------------------------------------
  if (d.funding.excessOverCeiling > 0) {
    out.push({
      id: 'ceiling',
      severity: 'warning',
      title: 'Project cost exceeds the scheme ceiling',
      detail:
        `Total project cost is ₹${fmtInt(d.capex.total)} against a ceiling of ` +
        `₹${fmtInt(a.schemeCeiling)}. ₹${fmtInt(d.funding.excessOverCeiling)} falls outside ` +
        `the subsidy calculation and must be funded by you. Declare the real cost and ask ` +
        `the DIC how they treat projects above the ceiling — do not understate it.`,
    })
  }

  // 3. Missing operating costs ---------------------------------------------
  const zeroed = d.fixed.lines.filter((l) => l.amount <= 0).map((l) => l.label)
  if (zeroed.length > 0) {
    out.push({
      id: 'zero-opex',
      severity: 'warning',
      title: `${zeroed.length} operating cost${zeroed.length > 1 ? 's' : ''} still at zero`,
      detail:
        `${zeroed.join(', ')} ${zeroed.length > 1 ? 'are' : 'is'} contributing nothing to ` +
        `the model. If that is deliberate, fine. If it is an omission, every margin on ` +
        `this page is overstated.`,
    })
  }

  // 4. Utilisation ----------------------------------------------------------
  if (d.production.monthlyCapacity > 0 && d.production.utilisation < 0.2) {
    out.push({
      id: 'low-utilisation',
      severity: 'info',
      title: `Plant runs at ${(d.production.utilisation * 100).toFixed(0)}% of capacity`,
      detail:
        `You are selling ${fmtInt(d.production.monthlyVolume)} of a possible ` +
        `${fmtInt(d.production.monthlyCapacity)} bottles a month. That is normal early on, ` +
        `but it means you are carrying machinery you are not using — check whether a ` +
        `smaller line would reach the same sales at lower capital cost.`,
    })
  }

  // 5. Contribution ---------------------------------------------------------
  if (d.breakeven.contributionPerBottle <= 0) {
    out.push({
      id: 'negative-contribution',
      severity: 'critical',
      title: 'Selling price is below variable cost',
      detail:
        `At ₹${a.wholesalePrice.toFixed(2)} you lose money on every bottle before a single ` +
        `fixed cost is paid. There is no volume that fixes this.`,
    })
  } else if (d.breakeven.utilisationAtBreakeven > 1) {
    out.push({
      id: 'unreachable-breakeven',
      severity: 'critical',
      title: 'Break-even is above full capacity',
      detail:
        `Breaking even needs ${fmtInt(d.breakeven.monthlyUnits)} bottles a month but the ` +
        `line can only make ${fmtInt(d.production.monthlyCapacity)}. Costs must come down ` +
        `or price must go up.`,
    })
  }

  // 6. Volume set to zero ---------------------------------------------------
  if (d.production.monthlyVolume <= 0) {
    out.push({
      id: 'no-volume',
      severity: 'critical',
      title: 'No production volume',
      detail:
        'Monthly volume resolves to zero, so every per-bottle figure below is meaningless. ' +
        'Check the filler rating, efficiency, shift hours and sales target.',
    })
  }

  // 7. Route shares ---------------------------------------------------------
  const shareTotal = s.routes.reduce((t, r) => t + r.sharePct, 0)
  if (s.routes.length > 0 && Math.abs(shareTotal - 100) > 0.5) {
    out.push({
      id: 'route-share',
      severity: 'warning',
      title: `Delivery route shares total ${shareTotal.toFixed(0)}%, not 100%`,
      detail:
        shareTotal < 100
          ? 'Some of your volume has no freight cost attached, so freight per bottle is understated.'
          : 'Freight is being counted more than once for part of your volume.',
    })
  }

  // 8. Evidence quality -----------------------------------------------------
  const capitalItems = [...s.machinery, ...s.civil, ...s.workingCapital]
  const assumed = capitalItems.filter((i) => i.confidence === 'assumption')
  const assumedValue = assumed.reduce((t, i) => t + i.cost * i.qty, 0)
  if (d.capex.total > 0 && assumedValue / d.capex.total > 0.3) {
    out.push({
      id: 'weak-evidence',
      severity: 'info',
      title: `${((assumedValue / d.capex.total) * 100).toFixed(0)}% of capex is unquoted`,
      detail:
        `₹${fmtInt(assumedValue)} of the project cost rests on estimates rather than written ` +
        `quotes (${assumed.length} item${assumed.length > 1 ? 's' : ''}). Get three quotes ` +
        `per major item before this goes near a bank.`,
    })
  }

  // 9. Efficiency sanity ----------------------------------------------------
  if (a.lineEfficiency > 0.85) {
    out.push({
      id: 'optimistic-efficiency',
      severity: 'info',
      title: `Line efficiency set to ${(a.lineEfficiency * 100).toFixed(0)}%`,
      detail:
        'New plants realistically run at 60–70% of nameplate once jams, cap-hopper refills, ' +
        'SKU changeovers, cleaning and power dips are counted. Above 85% is an aspiration.',
    })
  }

  return out
}
