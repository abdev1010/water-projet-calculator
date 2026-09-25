/**
 * The 100-point example model, transcribed as-is.
 *
 * This is a TEST FIXTURE, not a recommendation. It was supplied as an
 * illustration of the level of detail the calculator should handle, and it
 * contains four real defects that the validator is built to catch:
 *
 *   1. A 2-cavity blow moulder rated 1,200 BPH sitting behind a 60 BPM
 *      (3,600 BPH) filler — the line is a third of its assumed speed.
 *   2. ₹1,50,000 of one-time licence costs left out of the project total.
 *   3. Every non-labour fixed cost (maintenance, insurance, depreciation,
 *      NABL testing, admin) left at zero.
 *   4. Line efficiency set to 90%, well above what a new plant achieves.
 *
 * Its stated conclusions — 81,000 bottles/month, ₹0.08/bottle electricity,
 * ₹3.89 landed cost — do not survive contact with the engine. That is the point.
 */

import type { Scenario } from '../types'
import { SCHEMA_VERSION } from '../types'

export const exampleModel: Scenario = {
  id: 'fixture-example',
  name: 'Example — 2000 LPH / 60 BPM (illustrative)',
  createdAt: 0,
  updatedAt: 0,
  schemaVersion: SCHEMA_VERSION,
  notes: 'Illustrative figures only. Kept as a regression fixture.',

  machinery: [
    { id: 'm1', name: 'Raw water pump, 2 HP SS304', cost: 15000, qty: 1, confidence: 'indicative' },
    { id: 'm2', name: 'Dual media sand filter', cost: 40000, qty: 1, confidence: 'indicative' },
    { id: 'm3', name: 'Activated carbon filter', cost: 45000, qty: 1, confidence: 'indicative' },
    { id: 'm4', name: 'Anti-scalant dosing pump', cost: 12000, qty: 1, confidence: 'indicative' },
    { id: 'm5', name: 'Micron cartridge filters (5µ + 1µ)', cost: 20000, qty: 1, confidence: 'indicative' },
    { id: 'm6', name: 'High-pressure RO pump, 5 HP SS316', cost: 65000, qty: 1, powerKw: 3.7, confidence: 'indicative' },
    { id: 'm7', name: 'RO membranes, 4 × 8040', cost: 120000, qty: 1, confidence: 'indicative' },
    { id: 'm8', name: 'Product water tank, 2000 L SS316', cost: 80000, qty: 1, confidence: 'indicative' },
    { id: 'm9', name: 'Ozone generator, 2–3 g/hr', cost: 65000, qty: 1, confidence: 'indicative' },
    { id: 'm10', name: 'Absolute micron filter, 0.2µ', cost: 35000, qty: 1, confidence: 'indicative', note: 'Good practice. Does NOT support a "microplastic-free" claim — 0.2µ is 200nm and most particles found in bottled water are smaller.' },
    { id: 'm11', name: 'UV steriliser', cost: 25000, qty: 1, confidence: 'indicative' },
    { id: 'm12', name: 'RFC monoblock, 60 BPM', cost: 850000, qty: 1, powerKw: 2.2, ratedBph: 3600, confidence: 'indicative' },
    { id: 'm13', name: 'Inspection conveyor, backlit', cost: 30000, qty: 1, confidence: 'indicative' },
    { id: 'm14', name: 'Automatic BOPP labelling machine', cost: 350000, qty: 1, confidence: 'indicative' },
    { id: 'm15', name: 'Batch coding machine', cost: 120000, qty: 1, confidence: 'indicative' },
    { id: 'm16', name: 'Shrink wrapping machine', cost: 180000, qty: 1, powerKw: 6, confidence: 'indicative' },
    { id: 'm17', name: 'PET blowing machine, 2-cavity', cost: 800000, qty: 1, powerKw: 15, ratedBph: 1200, confidence: 'indicative', note: 'THE BOTTLENECK. 1,200 BPH behind a 3,600 BPH filler.' },
    { id: 'm18', name: 'HP air compressor, 20 bar 15 HP', cost: 250000, qty: 1, powerKw: 11, confidence: 'indicative' },
    { id: 'm19', name: 'Water chiller, 2 ton (+ lab AC)', cost: 90000, qty: 1, powerKw: 5, confidence: 'indicative' },
    { id: 'm20', name: 'Air dryer & filter', cost: 45000, qty: 1, confidence: 'indicative' },
    { id: 'm21', name: 'Custom square moulds, 600ml + 1200ml', cost: 80000, qty: 1, confidence: 'assumption', note: 'Low for custom-shape tooling — research suggests 2–4× a standard round mould.' },
  ],

  civil: [
    { id: 'c1', name: 'PEB factory shed, 1500 sq ft', cost: 600000, qty: 1, confidence: 'indicative' },
    { id: 'c2', name: 'Epoxy flooring, 600 sq ft clean room', cost: 90000, qty: 1, confidence: 'indicative' },
    { id: 'c3', name: 'Aluminium / glass partitions', cost: 120000, qty: 1, confidence: 'indicative' },
    { id: 'c4', name: 'Clean room HVAC, positive pressure', cost: 150000, qty: 1, confidence: 'indicative' },
    { id: 'c5', name: 'Drainage, SS304 covered trenches', cost: 40000, qty: 1, confidence: 'indicative' },
    { id: 'c6', name: 'Borewell sinking & piping, 150 ft', cost: 100000, qty: 1, confidence: 'assumption' },
    { id: 'c7', name: 'Microbiology lab', cost: 150000, qty: 1, confidence: 'indicative' },
    { id: 'c8', name: 'Chemistry lab', cost: 100000, qty: 1, confidence: 'indicative' },
    { id: 'c9', name: 'DG set, 30 KVA', cost: 250000, qty: 1, confidence: 'indicative', note: '30 KVA ≈ 24 kW, below the 34 kW running load — will not carry the whole plant.' },
  ],

  workingCapital: [
    { id: 'w1', name: 'Preform stock, 2 weeks', cost: 250000, qty: 1, confidence: 'assumption' },
    { id: 'w2', name: 'Labels, caps, shrink — 1 month', cost: 100000, qty: 1, confidence: 'assumption' },
    { id: 'w3', name: 'Cash buffer, 1 month payroll', cost: 100000, qty: 1, confidence: 'assumption' },
  ],

  consumables: [
    { id: 'r1', name: 'Preform, 29/25 short neck 12–14 g', costPerUnit: 1.5, unit: 'bottle', enabled: true, confidence: 'indicative' },
    { id: 'r2', name: 'Cap, 29/25', costPerUnit: 0.3, unit: 'bottle', enabled: true, confidence: 'indicative' },
    { id: 'r3', name: 'BOPP wrap-around label', costPerUnit: 0.2, unit: 'bottle', enabled: true, confidence: 'indicative' },
    { id: 'r4', name: 'Coding ink & make-up', costPerUnit: 0.02, unit: 'bottle', enabled: true, confidence: 'assumption' },
    { id: 'r5', name: 'Ozone & filtration consumables', costPerUnit: 0.05, unit: 'bottle', enabled: true, confidence: 'assumption' },
    { id: 'r6', name: 'Shrink film', costPerUnit: 5, unit: 'pack', packSize: 24, enabled: true, confidence: 'indicative' },
    { id: 'r7', name: 'Carton (premium HoReCa only)', costPerUnit: 0.15, unit: 'bottle', enabled: false, confidence: 'assumption', note: 'Disabled: a mass bottle does not carry both shrink film and a carton.' },
  ],

  labour: [
    { id: 'l1', title: 'Plant manager / supervisor', count: 1, monthlySalary: 20000, shiftScaling: 'fixed' },
    { id: 'l2', title: 'Lab chemist (B.Sc.)', count: 1, monthlySalary: 18000, shiftScaling: 'perShift' },
    { id: 'l3', title: 'Machine operator', count: 1, monthlySalary: 15000, shiftScaling: 'perShift' },
    { id: 'l4', title: 'Helpers / loaders', count: 3, monthlySalary: 8000, shiftScaling: 'perShift' },
    { id: 'l5', title: 'Driver', count: 1, monthlySalary: 12000, shiftScaling: 'fixed' },
  ],

  routes: [
    { id: 'rt1', name: 'Lucknow premium', sharePct: 30, oneWayKm: 30, bottlesPerTrip: 1200, fuelCostPerKm: 6, tollsPerTrip: 40 },
    { id: 'rt2', name: 'Local rural / dhaba', sharePct: 70, oneWayKm: 10, bottlesPerTrip: 1200, fuelCostPerKm: 6, tollsPerTrip: 0 },
  ],

  statutory: [
    { id: 's1', name: 'Land use conversion (Sec 80)', amount: 25000, recurrence: 'oneTime', confidence: 'assumption' },
    { id: 's2', name: 'UPGWD groundwater NOC', amount: 15000, recurrence: 'oneTime', confidence: 'assumption' },
    { id: 's3', name: 'Rainwater harvesting pit', amount: 40000, recurrence: 'oneTime', confidence: 'assumption' },
    { id: 's4', name: 'FSSAI state licence', amount: 5000, recurrence: 'annual', confidence: 'indicative' },
    { id: 's5', name: 'BIS marking fee (IS 14543)', amount: 120000, recurrence: 'annual', confidence: 'assumption', note: 'BIS is no longer mandatory for packaged water since 1 Jan 2026. Optional.' },
    { id: 's6', name: 'UPPCB consent to establish/operate', amount: 20000, recurrence: 'oneTime', confidence: 'assumption' },
    { id: 's7', name: 'Pre-operative, legal & travel', amount: 50000, recurrence: 'oneTime', confidence: 'assumption' },
  ],

  assumptions: {
    fillerBpm: 60,
    lineEfficiency: 0.9,
    shiftHours: 8,
    shiftsPerDay: 1,
    workingDays: 25,

    volumeMode: 'capacityLed',
    monthlySalesTarget: 200000,

    tariffPerKwh: 8,
    diversityFactor: 0.8,

    wholesalePrice: 5,
    breakagePct: 1,

    // All zero — exactly as the example left them. The validator flags this.
    monthlyAdmin: 0,
    monthlyTesting: 0,
    maintenancePctOfMachineryPa: 0,
    insurancePctOfCapexPa: 0,
    depreciationYears: 0,

    subsidyRate: 0.35,
    ownContributionRate: 0.15,
    interestRatePa: 10.5,
    tenureMonths: 60,
    schemeCeiling: 5000000,
  },
}
