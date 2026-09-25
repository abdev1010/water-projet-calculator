/**
 * The calculation engine.
 *
 * Pure functions, no React, no I/O. One public entry point: computeScenario().
 * Every page in the app reads its numbers from the returned `Derived` object.
 * Nothing else in the codebase is allowed to compute a business figure.
 *
 * Two invariants this file exists to protect:
 *
 *  1. PRODUCTION VOLUME IS RESOLVED IN EXACTLY ONE PLACE.
 *     A model that states its volume in more than one spot will eventually
 *     state two different volumes. Everything downstream reads `monthlyVolume`.
 *
 *  2. VARIABLE AND FIXED COSTS STAY SEPARATE.
 *     Fixed-cost-per-bottle depends on volume, so folding labour into a single
 *     "landed cost" and then using that for break-even is circular. Break-even
 *     uses the variable cost only.
 */

import type { Scenario } from './types'

export interface CostLine {
  label: string
  amount: number
}

export interface SkuRevenue {
  pricePerBottle: number
  pricePerPack: number
  packagesPerMonth: number
  monthlyRevenue: number
}

export interface Derived {
  capex: {
    machinery: number
    solar: number
    civil: number
    statutoryOneTime: number
    workingCapital: number
    total: number
    lines: CostLine[]
  }
  production: {
    fillerBph: number
    lineRateBph: number
    /** Name of the machine limiting the line, if it isn't the filler. */
    bottleneck: string | null
    effectiveBph: number
    dailyOutput: number
    monthlyCapacity: number
    monthlyVolume: number
    utilisation: number
  }
  power: {
    /** Sum of machinery[].powerKw × qty — always computed, for cross-checking. */
    connectedKw: number
    /** Load actually used in the cost: the manual entry if given, else derived. */
    runningKw: number
    /** What the machine list implies, so a manual override can be compared. */
    derivedRunningKw: number
    manualLoadUsed: boolean
    costPerHour: number
    /** Electricity cost per bottle, accounting for solar-free hours. */
    costPerBottle: number
    solarHoursPerDay: number
    gridHoursPerDay: number
    monthlyGridCost: number
    monthlySolarSaving: number
    /** Months to pay back the solar capex from monthly savings. */
    solarPaybackMonths: number
  }
  unit: {
    consumablesPerBottle: number
    powerPerBottle: number
    freightPerBottle: number
    breakagePerBottle: number
    /** Costs that scale with each bottle produced. */
    variablePerBottle: number
    /** Costs that don't — expressed per bottle at the CURRENT volume. */
    fixedPerBottle: number
    landedPerBottle: number
    variableLines: CostLine[]
  }
  fixed: {
    labour: number
    statutoryRecurring: number
    maintenance: number
    insurance: number
    depreciation: number
    testing: number
    admin: number
    total: number
    lines: CostLine[]
  }
  funding: {
    admissibleCost: number
    /** Project cost above the scheme ceiling — funded by you, outside the scheme. */
    excessOverCeiling: number
    ownContribution: number
    subsidy: number
    upStateSubsidy: number
    totalSubsidy: number
    loan: number
    emi: number
    totalOwnCash: number
  }
  cashflow: {
    monthlyRevenue: number
    monthlyVariableCost: number
    monthlyFixedCost: number
    monthlyOpex: number
    ebitda: number
    emi: number
    netMonthly: number
    ebitdaMarginPct: number
  }
  breakeven: {
    contributionPerBottle: number
    monthlyUnits: number
    dailyUnits: number
    utilisationAtBreakeven: number
  }
  sku: {
    casePack: number
    packagesPerMonth: number
    ml300: SkuRevenue
    ml600: SkuRevenue
    ml1200: SkuRevenue
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Standard reducing-balance EMI. Returns 0 for a zero-principal loan. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / months
  const f = Math.pow(1 + r, months)
  return (principal * r * f) / (f - 1)
}

export function computeScenario(s: Scenario): Derived {
  const a = s.assumptions

  const casePack = Math.max(a.casePackSize ?? 24, 1)

  // Effective wholesale price per bottle (may be derived from per-packet input)
  const effectiveWholesalePrice =
    (a.sellingPricePp ?? 0) > 0 ? a.sellingPricePp! / casePack : a.wholesalePrice

  // ---------------------------------------------------------------- CAPEX
  // When capexRoPlant is set the caller is using the specific-fields form;
  // otherwise fall back to summing the generic line-item arrays.
  const useSpecificCapex = (a.capexRoPlant ?? 0) > 0

  const machinery = useSpecificCapex
    ? (a.capexRoPlant ?? 0) +
      (a.capexBlowerUnit ?? 0) +
      (a.capexMonoblockUnit ?? 0) +
      (a.capexMolds ?? 0)
    : sum(s.machinery.map((m) => m.cost * m.qty))

  const solarCapex = a.capexSolar ?? 0

  const civil = useSpecificCapex
    ? (a.capexCivil ?? 0) + (a.capexBorewell ?? 0)
    : sum(s.civil.map((c) => c.cost * c.qty))

  const workingCapital = useSpecificCapex
    ? (a.capexWorkingCap ?? 0)
    : sum(s.workingCapital.map((c) => c.cost * c.qty))

  const statutoryOneTime =
    sum(s.statutory.filter((x) => x.recurrence === 'oneTime').map((x) => x.amount)) +
    (useSpecificCapex ? (a.capexLicensing ?? 0) : 0)

  const capexTotal = machinery + solarCapex + civil + workingCapital + statutoryOneTime

  // ----------------------------------------------------------- PRODUCTION
  const fillerBph = a.fillerBpm * 60
  let lineRateBph = fillerBph
  let bottleneck: string | null = null
  for (const m of s.machinery) {
    if (m.ratedBph && m.ratedBph > 0 && m.ratedBph < lineRateBph) {
      lineRateBph = m.ratedBph
      bottleneck = m.name
    }
  }

  const effectiveBph = lineRateBph * a.lineEfficiency
  const totalHoursPerDay = a.shiftHours * a.shiftsPerDay
  const dailyOutput = effectiveBph * totalHoursPerDay
  const monthlyCapacity = dailyOutput * a.workingDays

  const monthlyVolume =
    a.volumeMode === 'capacityLed'
      ? monthlyCapacity
      : Math.min(Math.max(a.monthlySalesTarget, 0), monthlyCapacity)

  const utilisation = monthlyCapacity > 0 ? monthlyVolume / monthlyCapacity : 0

  // ---------------------------------------------------------------- POWER
  const connectedKw = sum(s.machinery.map((m) => (m.powerKw ?? 0) * m.qty))
  const derivedRunningKw = connectedKw * a.diversityFactor
  const manualLoadUsed = (a.runningLoadKw ?? 0) > 0
  const runningKw = manualLoadUsed ? a.runningLoadKw! : derivedRunningKw

  // Solar: the plant provides free power for `solarHours` hours each day.
  // Grid supplies the rest. Per-bottle cost uses only the paid (grid) hours.
  const solarHoursPerDay = Math.min(a.solarHours ?? 0, totalHoursPerDay)
  const gridHoursPerDay = totalHoursPerDay - solarHoursPerDay

  const gridCostPerDay = runningKw * gridHoursPerDay * a.tariffPerKwh
  const solarSavingPerDay = runningKw * solarHoursPerDay * a.tariffPerKwh
  const bottlesPerDay = effectiveBph * totalHoursPerDay
  const powerPerBottle = bottlesPerDay > 0 ? gridCostPerDay / bottlesPerDay : 0

  const monthlyGridCost = gridCostPerDay * a.workingDays
  const monthlySolarSaving = solarSavingPerDay * a.workingDays
  const solarPaybackMonths =
    monthlySolarSaving > 0 ? solarCapex / monthlySolarSaving : Infinity

  // For display compatibility, costPerHour is the full (no-solar) rate per hour
  const powerCostPerHour = runningKw * a.tariffPerKwh

  // ---------------------------------------------------- VARIABLE PER BOTTLE
  // When preformCostPb is set, use the specific per-bottle material costs
  // instead of summing the consumables[] list.
  const useSpecificCosts = (a.preformCostPb ?? 0) > 0

  let consumableLines: CostLine[]
  let consumablesPerBottle: number

  if (useSpecificCosts) {
    const preform = a.preformCostPb ?? 0
    const cap = a.capCostPb ?? 0
    const label = a.labelCostPb ?? 0
    const ink = a.inkCostPb ?? 0
    const shrink = (a.shrinkCostPp ?? 0) / casePack
    consumablesPerBottle = preform + cap + label + ink + shrink
    consumableLines = [
      { label: 'Preform (raw plastic)', amount: preform },
      { label: 'Cap', amount: cap },
      { label: 'Label', amount: label },
      { label: 'Ink & printing', amount: ink },
      { label: `Shrink film (÷${casePack})`, amount: shrink },
    ]
  } else {
    consumableLines = s.consumables
      .filter((c) => c.enabled)
      .map((c) => ({
        label: c.name,
        amount:
          c.unit === 'pack' ? c.costPerUnit / Math.max(c.packSize ?? casePack, 1) : c.costPerUnit,
      }))
    consumablesPerBottle = sum(consumableLines.map((l) => l.amount))
  }

  // Freight: per-packet input → freightPerCase, or per-case assumption, or routes
  const logisticPp = a.logisticCostPp ?? 0
  const effectiveFreightPerCase = logisticPp > 0 ? logisticPp : (a.freightPerCase ?? 0)

  const freightPerBottle =
    effectiveFreightPerCase > 0
      ? effectiveFreightPerCase / casePack
      : sum(
          s.routes.map((r) => {
            const perTrip = r.oneWayKm * 2 * r.fuelCostPerKm + r.tollsPerTrip
            const perBottle = r.bottlesPerTrip > 0 ? perTrip / r.bottlesPerTrip : 0
            return perBottle * (r.sharePct / 100)
          }),
        )

  const dgPerBottle = a.dgFuelPerBottle ?? 0
  const sellingPerBottle = a.sellingCostPerBottle ?? 0

  const subtotalBeforeBreakage =
    consumablesPerBottle + powerPerBottle + dgPerBottle + freightPerBottle + sellingPerBottle
  const breakagePerBottle = subtotalBeforeBreakage * (a.breakagePct / 100)
  const variablePerBottle = subtotalBeforeBreakage + breakagePerBottle

  const variableLines: CostLine[] = [
    ...consumableLines,
    { label: 'Electricity (grid)', amount: powerPerBottle },
    ...(dgPerBottle > 0 ? [{ label: 'DG backup fuel', amount: dgPerBottle }] : []),
    { label: 'Freight / logistics', amount: freightPerBottle },
    ...(sellingPerBottle > 0 ? [{ label: 'Selling & distribution', amount: sellingPerBottle }] : []),
    { label: `Breakage & rejection (${a.breakagePct}%)`, amount: breakagePerBottle },
  ]

  // ------------------------------------------------------- FIXED PER MONTH
  const labourMonthly =
    (a.monthlySalaries ?? 0) > 0
      ? a.monthlySalaries! * (a.salariesPerShift ? a.shiftsPerDay : 1)
      : sum(
          s.labour.map(
            (r) => r.count * r.monthlySalary * (r.shiftScaling === 'perShift' ? a.shiftsPerDay : 1),
          ),
        )

  const statutoryRecurring = sum(
    s.statutory.map((x) =>
      x.recurrence === 'annual' ? x.amount / 12 : x.recurrence === 'monthly' ? x.amount : 0,
    ),
  )
  const maintenance =
    (a.monthlyMaintenance ?? 0) > 0
      ? a.monthlyMaintenance!
      : (machinery * (a.maintenancePctOfMachineryPa / 100)) / 12
  const insurance =
    (a.monthlyInsurance ?? 0) > 0
      ? a.monthlyInsurance!
      : ((machinery + civil) * (a.insurancePctOfCapexPa / 100)) / 12
  const depreciation =
    a.depreciationYears > 0 ? (machinery + civil) / a.depreciationYears / 12 : 0

  const fixedLines: CostLine[] = [
    { label: 'Labour', amount: labourMonthly },
    { label: 'Licences & statutory', amount: statutoryRecurring },
    { label: 'Maintenance & spares', amount: maintenance },
    { label: 'Insurance', amount: insurance },
    { label: 'Depreciation', amount: depreciation },
    { label: 'NABL testing', amount: a.monthlyTesting },
    { label: 'Admin & compliance', amount: a.monthlyAdmin },
  ]
  const fixedTotal = sum(fixedLines.map((l) => l.amount))
  const fixedPerBottle = monthlyVolume > 0 ? fixedTotal / monthlyVolume : 0

  // -------------------------------------------------------------- FUNDING
  const admissibleCost = Math.min(capexTotal, a.schemeCeiling)
  const excessOverCeiling = Math.max(0, capexTotal - admissibleCost)
  const subsidy = admissibleCost * a.subsidyRate
  const upStateSubsidy = admissibleCost * (a.upStateSubsidyRate ?? 0)
  const totalSubsidy = subsidy + upStateSubsidy
  const ownContribution = admissibleCost * a.ownContributionRate
  const loan = Math.max(0, admissibleCost - totalSubsidy - ownContribution)
  const monthlyEmi = emi(loan, a.interestRatePa, a.tenureMonths)

  // ------------------------------------------------------------- CASHFLOW
  const monthlyRevenue = monthlyVolume * effectiveWholesalePrice
  const monthlyVariableCost = monthlyVolume * variablePerBottle
  const monthlyOpex = monthlyVariableCost + fixedTotal
  const ebitda = monthlyRevenue - monthlyOpex

  // ------------------------------------------------------------ BREAK-EVEN
  const contributionPerBottle = effectiveWholesalePrice - variablePerBottle
  const beUnits =
    contributionPerBottle > 0 ? (fixedTotal + monthlyEmi) / contributionPerBottle : Infinity

  // ------------------------------------------------------------------ SKU
  const packagesPerMonth = casePack > 0 ? monthlyVolume / casePack : 0
  const skuRow = (pricePerBottle: number): SkuRevenue => {
    const pricePerPack = pricePerBottle * casePack
    return { pricePerBottle, pricePerPack, packagesPerMonth, monthlyRevenue: packagesPerMonth * pricePerPack }
  }

  return {
    capex: {
      machinery,
      solar: solarCapex,
      civil,
      statutoryOneTime,
      workingCapital,
      total: capexTotal,
      lines: [
        { label: 'Plant & machinery', amount: machinery },
        ...(solarCapex > 0 ? [{ label: 'Solar plant', amount: solarCapex }] : []),
        { label: 'Civil, lab & infrastructure', amount: civil },
        { label: 'Licences (one-time)', amount: statutoryOneTime },
        { label: 'Working capital', amount: workingCapital },
      ],
    },
    production: {
      fillerBph,
      lineRateBph,
      bottleneck,
      effectiveBph,
      dailyOutput,
      monthlyCapacity,
      monthlyVolume,
      utilisation,
    },
    power: {
      connectedKw,
      runningKw,
      derivedRunningKw,
      manualLoadUsed,
      costPerHour: powerCostPerHour,
      costPerBottle: powerPerBottle,
      solarHoursPerDay,
      gridHoursPerDay,
      monthlyGridCost,
      monthlySolarSaving,
      solarPaybackMonths,
    },
    unit: {
      consumablesPerBottle,
      powerPerBottle,
      freightPerBottle,
      breakagePerBottle,
      variablePerBottle,
      fixedPerBottle,
      landedPerBottle: variablePerBottle + fixedPerBottle,
      variableLines,
    },
    fixed: {
      labour: labourMonthly,
      statutoryRecurring,
      maintenance,
      insurance,
      depreciation,
      testing: a.monthlyTesting,
      admin: a.monthlyAdmin,
      total: fixedTotal,
      lines: fixedLines,
    },
    funding: {
      admissibleCost,
      excessOverCeiling,
      ownContribution,
      subsidy,
      upStateSubsidy,
      totalSubsidy,
      loan,
      emi: monthlyEmi,
      totalOwnCash: ownContribution + excessOverCeiling,
    },
    cashflow: {
      monthlyRevenue,
      monthlyVariableCost,
      monthlyFixedCost: fixedTotal,
      monthlyOpex,
      ebitda,
      emi: monthlyEmi,
      netMonthly: ebitda - monthlyEmi,
      ebitdaMarginPct: monthlyRevenue > 0 ? ebitda / monthlyRevenue : 0,
    },
    breakeven: {
      contributionPerBottle,
      monthlyUnits: beUnits,
      dailyUnits: a.workingDays > 0 ? beUnits / a.workingDays : Infinity,
      utilisationAtBreakeven: monthlyCapacity > 0 ? beUnits / monthlyCapacity : Infinity,
    },
    sku: {
      casePack,
      packagesPerMonth,
      ml300: skuRow(effectiveWholesalePrice),
      ml600: skuRow(a.sellingPrice600 ?? effectiveWholesalePrice),
      ml1200: skuRow(a.sellingPrice1200 ?? effectiveWholesalePrice),
    },
  }
}
