import type { Scenario } from './types'
import { SCHEMA_VERSION } from './types'
import { uid } from './format'

/**
 * Prefilled values for the one-page calculator, grouped as specified:
 * machinery · civil & lab · operations · raw material · utilities/labour/
 * logistics · financing.
 *
 * All figures are INDICATIVE — triangulated from the research in the
 * Sitapur-Water-Venture folder and from marketplace pricing. Every one of them
 * is a starting point for a written quote, not a number to budget against.
 *
 * Three deliberate choices worth knowing about:
 *
 *  1. The 2-cavity blow moulder is rated 2,000 BPH against a 60 BPM (3,600 BPH)
 *     filler. That is realistic for a 2-cavity machine and it means the line
 *     runs at 2,000 BPH, not 3,600. The calculator flags it on load with a
 *     one-click fix. This is the single most consequential thing on the page.
 *
 *  2. The compressor is labelled 20 bar because that is what was specified,
 *     with a warning attached: PET stretch-blow moulding needs 30–40 bar and
 *     oil-free air. A 20-bar machine will not blow a bottle properly.
 *
 *  3. Six cost lines absent from the original list are included and marked:
 *     conveyors, depreciation, insurance, NABL testing, statutory licences and
 *     selling cost. Leaving them out makes every margin look better than it is.
 */
export function calculatorDefaults(name = 'Alaipur — 2000 LPH / 60 BPM'): Scenario {
  const now = Date.now()
  return {
    id: uid('sc'),
    name,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    notes: 'Indicative values. Replace each with a written quote.',

    // ---------------------------------------- 1 · PLANT MACHINERY (CAPEX)
    machinery: [
      {
        id: uid('m'),
        name: 'RO Plant — 2000 LPH, SS316, ozone, 0.2µ',
        cost: 650000,
        qty: 1,
        powerKw: 6,
        confidence: 'indicative',
        note: 'Consolidated train: raw pump, sand + carbon filters, softener, dosing, micron, HP pump, membranes, SS316 tank, ozone + venturi, UV, 0.2µ polish.',
      },
      {
        id: uid('m'),
        name: 'Automatic PET Blow Moulding Machine — 2-cavity',
        cost: 800000,
        qty: 1,
        powerKw: 15,
        ratedBph: 2000,
        confidence: 'indicative',
        note: 'THE BOTTLENECK. 2,000 BPH behind a 3,600 BPH filler. A 4-cavity machine (~₹12–16 L) matches the line.',
      },
      {
        id: uid('m'),
        name: 'HP Air Compressor (20 bar) + 2T Chiller',
        cost: 340000,
        qty: 1,
        powerKw: 16,
        confidence: 'indicative',
        note: '⚠ 20 bar is too low. PET stretch-blow needs 30–40 bar, oil-free (air touches the inside of the bottle). Budget ₹5–8 L for a correct unit.',
      },
      {
        id: uid('m'),
        name: '60 BPM Automatic RFC Monoblock Line',
        cost: 850000,
        qty: 1,
        powerKw: 2.2,
        ratedBph: 3600,
        confidence: 'indicative',
      },
      {
        id: uid('m'),
        name: 'BOPP Hot-Melt Labelling Machine',
        cost: 350000,
        qty: 1,
        powerKw: 1.5,
        ratedBph: 4000,
        confidence: 'indicative',
      },
      {
        id: uid('m'),
        name: 'CIJ Batch Coding Machine — MRP / date / batch',
        cost: 120000,
        qty: 1,
        powerKw: 0.3,
        confidence: 'indicative',
      },
      {
        id: uid('m'),
        name: 'Automatic Shrink Wrapping Web-Sealer + tunnel',
        cost: 180000,
        qty: 1,
        powerKw: 6,
        ratedBph: 4000,
        confidence: 'indicative',
      },
      {
        id: uid('m'),
        name: 'Custom Square Bottle Moulds — 600ml + 1200ml',
        cost: 160000,
        qty: 1,
        confidence: 'assumption',
        note: 'Custom square tooling runs 2–4× a standard round mould. ₹80,000 is a round-bottle price.',
      },
      {
        id: uid('m'),
        name: '+ Air conveyor & bottle conveyors',
        cost: 150000,
        qty: 1,
        powerKw: 1.5,
        confidence: 'assumption',
        note: 'ADDED — not in the original list. Without a neck/air conveyor linking blower to filler, bottles are carried by hand and the line is not automatic.',
      },
    ],

    // ------------------------------- 2 · CIVIL, LAB & INFRASTRUCTURE
    civil: [
      {
        id: uid('c'),
        name: 'Civil shed — 1500 sq ft, epoxy floor, partitions',
        cost: 810000,
        qty: 1,
        confidence: 'indicative',
        note: 'PEB shed ₹6.0 L + epoxy ₹0.9 L + aluminium/glass partitions ₹1.2 L.',
      },
      {
        id: uid('c'),
        name: 'BIS IS 14543 in-house testing lab',
        cost: 250000,
        qty: 1,
        confidence: 'indicative',
        note: 'Micro bench (laminar flow, autoclave, incubator, membrane filtration) + chemistry (pH, TDS, turbidity, spectrophotometer).',
      },
      {
        id: uid('c'),
        name: '+ Borewell, pump & water source piping',
        cost: 100000,
        qty: 1,
        confidence: 'assumption',
        note: 'ADDED — gated by the groundwater NOC, so do not drill before it lands.',
      },
      {
        id: uid('c'),
        name: '+ DG set, 30 KVA',
        cost: 250000,
        qty: 1,
        confidence: 'indicative',
        note: 'ADDED — 30 KVA ≈ 24 kW, below a 35 kW running load. Sized for critical loads only, not the whole plant.',
      },
      {
        id: uid('c'),
        name: '+ Electrical panel, MCC, wiring & earthing',
        cost: 150000,
        qty: 1,
        confidence: 'assumption',
        note: 'ADDED — excludes the UPPCL connection and transformer charge, which are separate.',
      },
      {
        id: uid('c'),
        name: '+ Clean room HVAC & drainage',
        cost: 190000,
        qty: 1,
        confidence: 'assumption',
        note: 'ADDED — positive-pressure filling room and SS304 trenched drainage. FSSAI high-risk category expects both.',
      },
    ],

    workingCapital: [
      {
        id: uid('w'),
        name: 'Working capital reserve & pre-operative',
        cost: 500000,
        qty: 1,
        confidence: 'assumption',
        note: 'Preform stock, caps/labels/film, one month payroll, legal and travel.',
      },
    ],

    // ---------------------------- 4 · VARIABLE RAW MATERIAL (per 600ml)
    consumables: [
      { id: uid('r'), name: '29/25 short-neck preform, 14 g', costPerUnit: 1.47, unit: 'bottle', enabled: true, confidence: 'indicative', note: '14 g × ~₹105/kg. Every gram removed saves ₹0.105.' },
      { id: uid('r'), name: '29/25 virgin cap', costPerUnit: 0.3, unit: 'bottle', enabled: true, confidence: 'indicative' },
      { id: uid('r'), name: 'BOPP wrap-around label', costPerUnit: 0.22, unit: 'bottle', enabled: true, confidence: 'indicative' },
      { id: uid('r'), name: 'Shrink film (per 24-pack)', costPerUnit: 5, unit: 'pack', packSize: 24, enabled: true, confidence: 'indicative' },
      { id: uid('r'), name: 'Ink, ozone & filter depreciation', costPerUnit: 0.07, unit: 'bottle', enabled: true, confidence: 'assumption' },
      { id: uid('r'), name: 'Carton — premium / HoReCa only', costPerUnit: 0.15, unit: 'bottle', enabled: false, confidence: 'assumption', note: 'Off by default: a mass bottle does not carry both shrink film and a carton.' },
    ],

    // Role list kept for the detailed page. The calculator uses the single
    // monthly salary figure in assumptions instead.
    labour: [],
    routes: [],

    // Licences — absent from the original list, and real money.
    statutory: [
      { id: uid('s'), name: 'FSSAI state manufacturing licence', amount: 5000, recurrence: 'annual', confidence: 'indicative' },
      { id: uid('s'), name: 'UPPCB consent — CTE + CTO', amount: 20000, recurrence: 'oneTime', confidence: 'assumption' },
      { id: uid('s'), name: 'Groundwater NOC + recharge pit', amount: 55000, recurrence: 'oneTime', confidence: 'assumption' },
      { id: uid('s'), name: 'Land use conversion (Sec 80, year 2)', amount: 25000, recurrence: 'oneTime', confidence: 'assumption' },
      { id: uid('s'), name: 'Legal Metrology, trademark, Udyam', amount: 25000, recurrence: 'oneTime', confidence: 'assumption' },
      { id: uid('s'), name: 'BIS IS 14543 marking — optional since Jan 2026', amount: 0, recurrence: 'annual', confidence: 'verified' },
    ],

    assumptions: {
      // ------------------------------- 3 · OPERATIONAL PARAMETERS
      fillerBpm: 60,
      lineEfficiency: 0.65,
      shiftHours: 8,
      shiftsPerDay: 1,
      workingDays: 25,
      casePackSize: 24,

      volumeMode: 'salesLed',
      monthlySalesTarget: 120000,

      // --------------------- 5 · UTILITIES, LABOUR & LOGISTICS
      runningLoadKw: 35,
      tariffPerKwh: 8,
      diversityFactor: 0.8,
      dgFuelPerBottle: 0.03,
      monthlySalaries: 95000,
      salariesPerShift: true,
      monthlyMaintenance: 15000,
      freightPerCase: 9,

      // Added, not in the original list
      monthlyTesting: 6000,
      monthlyInsurance: 3000,
      monthlyAdmin: 10000,
      sellingCostPerBottle: 0.1,
      depreciationYears: 10,
      breakagePct: 1.5,

      // Fallbacks — unused while the direct entries above are non-zero
      maintenancePctOfMachineryPa: 3,
      insurancePctOfCapexPa: 0.5,

      // ------------------------------------ 6 · FINANCING & PRICING
      wholesalePrice: 5.5,
      subsidyRate: 0.35,
      ownContributionRate: 0.15,
      interestRatePa: 10.5,
      tenureMonths: 60,
      moratoriumMonths: 6,
      schemeCeiling: 5000000,
    },
  }
}
