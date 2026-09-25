import { describe, it, expect } from 'vitest'
import { computeScenario, emi } from './engine'
import { validate } from './validate'
import { exampleModel } from './fixtures/exampleModel'
import { blankScenario } from './defaults'

const d = computeScenario(exampleModel)
const findings = validate(exampleModel, d)
const has = (id: string) => findings.some((f) => f.id === id)

describe('capex roll-up', () => {
  it('sums machinery to the stated ₹33,17,000', () => {
    expect(d.capex.machinery).toBe(3317000)
  })

  it('sums civil to the stated ₹16,00,000', () => {
    expect(d.capex.civil).toBe(1600000)
  })

  it('picks up the ₹1,50,000 of licences the example left out of its total', () => {
    expect(d.capex.statutoryOneTime).toBe(150000)
    // Example stated ₹53,67,000. Including licences it is ₹55,17,000.
    expect(d.capex.total).toBe(5517000)
  })
})

describe('production — the bottleneck', () => {
  it('names the blow moulder as the constraint', () => {
    expect(d.production.bottleneck).toBe('PET blowing machine, 2-cavity')
  })

  it('runs the line at the blower speed, not the filler speed', () => {
    expect(d.production.fillerBph).toBe(3600)
    expect(d.production.lineRateBph).toBe(1200)
  })

  it('derives 216,000 bottles/month — not the 81,000 the example stated', () => {
    // 1200 BPH × 0.9 × 8 h × 1 shift × 25 days
    expect(d.production.monthlyCapacity).toBe(216000)
    expect(d.production.monthlyVolume).toBe(216000)
    expect(d.production.monthlyVolume).not.toBe(81000)
  })

  it('raises a critical bottleneck finding', () => {
    expect(has('bottleneck')).toBe(true)
  })
})

describe('power — derived from the machine list', () => {
  it('computes connected load rather than trusting a typed-in total', () => {
    expect(d.power.connectedKw).toBeCloseTo(42.9, 1)
    expect(d.power.runningKw).toBeCloseTo(34.32, 2)
  })

  it('costs power against the real line rate, giving ₹0.25 not ₹0.08', () => {
    // The example's ₹0.08 assumed 3,240 bottles/hour, which the blower cannot supply.
    expect(d.unit.powerPerBottle).toBeGreaterThan(0.2)
    expect(d.unit.powerPerBottle).toBeLessThan(0.3)
  })
})

describe('unit cost', () => {
  it('excludes disabled consumables', () => {
    // 1.50 + 0.30 + 0.20 + 0.02 + 0.05 + (5/24) = 2.2783; carton is off
    expect(d.unit.consumablesPerBottle).toBeCloseTo(2.2783, 3)
  })

  it('weights freight by route share', () => {
    // premium (30×2×6+40)/1200 × 0.3 = 0.10 ; rural (10×2×6)/1200 × 0.7 = 0.07
    expect(d.unit.freightPerBottle).toBeCloseTo(0.17, 4)
  })

  it('keeps variable and fixed cost separate', () => {
    expect(d.unit.landedPerBottle).toBeCloseTo(
      d.unit.variablePerBottle + d.unit.fixedPerBottle,
      6,
    )
    expect(d.unit.fixedPerBottle).toBeGreaterThan(0)
  })
})

describe('labour scales with shifts', () => {
  it('matches ₹89,000 on a single shift', () => {
    expect(d.fixed.labour).toBe(89000)
  })

  it('does NOT hold labour flat when a second shift is added', () => {
    const two = computeScenario({
      ...exampleModel,
      assumptions: { ...exampleModel.assumptions, shiftsPerDay: 2 },
    })
    // Manager and driver are fixed; chemist, operator and helpers double.
    expect(two.fixed.labour).toBe(89000 + 18000 + 15000 + 24000)
  })
})

describe('funding', () => {
  it('caps the admissible cost at the scheme ceiling without hiding the excess', () => {
    expect(d.funding.admissibleCost).toBe(5000000)
    expect(d.funding.excessOverCeiling).toBe(517000)
  })

  it('splits 15 / 35 / 50', () => {
    expect(d.funding.ownContribution).toBe(750000)
    expect(d.funding.subsidy).toBe(1750000)
    expect(d.funding.loan).toBe(2500000)
  })

  it('computes EMI on ₹25 L, not ₹30 L', () => {
    // ₹25,00,000 at 10.5% p.a. over 60 months. The example stated ₹64,500,
    // which is the EMI on ₹30,00,000 — a loan size the 15/35/50 split does
    // not produce.
    expect(d.funding.emi).toBeCloseTo(53734.75, 1)
  })

  it('flags the ceiling breach', () => {
    expect(has('ceiling')).toBe(true)
  })
})

describe('break-even uses variable cost, not landed cost', () => {
  it('derives contribution from price minus variable cost', () => {
    expect(d.breakeven.contributionPerBottle).toBeCloseTo(
      exampleModel.assumptions.wholesalePrice - d.unit.variablePerBottle,
      6,
    )
  })

  it('lands below capacity for this fixture', () => {
    expect(d.breakeven.utilisationAtBreakeven).toBeLessThan(1)
    expect(d.breakeven.dailyUnits).toBeGreaterThan(0)
  })
})

describe('validator catches the example’s omissions', () => {
  it('flags the operating costs left at zero', () => {
    expect(has('zero-opex')).toBe(true)
  })

  it('flags the optimistic 90% line efficiency', () => {
    expect(has('optimistic-efficiency')).toBe(true)
  })

  it('produces at least one critical finding', () => {
    expect(findings.some((f) => f.severity === 'critical')).toBe(true)
  })
})

describe('emi()', () => {
  it('handles a zero-interest loan', () => {
    expect(emi(120000, 0, 12)).toBeCloseTo(10000, 6)
  })

  it('returns zero for no loan', () => {
    expect(emi(0, 10, 60)).toBe(0)
  })
})

describe('blank scenario — UP defaults pre-populated', () => {
  const b = computeScenario(blankScenario('Test'))

  it('produces a finite capex, variable cost, and landed cost', () => {
    expect(Number.isFinite(b.capex.total)).toBe(true)
    expect(b.capex.total).toBeGreaterThan(0)
    expect(Number.isFinite(b.unit.variablePerBottle)).toBe(true)
    expect(Number.isFinite(b.unit.landedPerBottle)).toBe(true)
    expect(b.unit.landedPerBottle).toBeGreaterThan(0)
  })

  it('has production volume with capacity-led defaults', () => {
    expect(b.production.monthlyVolume).toBeGreaterThan(0)
    expect(b.production.monthlyCapacity).toBeGreaterThan(0)
  })

  it('computes sku revenue for all three bottle sizes', () => {
    expect(b.sku.packagesPerMonth).toBeGreaterThan(0)
    expect(b.sku.ml300.monthlyRevenue).toBeGreaterThan(0)
    expect(b.sku.ml600.monthlyRevenue).toBeGreaterThan(b.sku.ml300.monthlyRevenue)
    expect(b.sku.ml1200.monthlyRevenue).toBeGreaterThan(b.sku.ml600.monthlyRevenue)
  })
})
