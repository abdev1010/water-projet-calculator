import type { Assumptions, Scenario } from './types'
import { SCHEMA_VERSION } from './types'
import { uid } from './format'

export const defaultAssumptions: Assumptions = {
  // Production
  fillerBpm: 60,
  lineEfficiency: 0.85,
  shiftHours: 8,
  shiftsPerDay: 1,
  workingDays: 25,
  volumeMode: 'capacityLed',
  monthlySalesTarget: 0,

  // Power
  tariffPerKwh: 8.0,
  diversityFactor: 0.8,

  // Commercial
  wholesalePrice: 5.50,         // ₹5.50/bottle (600 ml, 24-pack → ₹132/pack)
  sellingPrice600: 5.50,
  sellingPrice1200: 14.0,
  breakagePct: 1,

  // Fixed overheads
  monthlyAdmin: 0,
  monthlyTesting: 0,
  monthlyMaintenance: 15000,    // plant maintenance & misc fixed per spec
  maintenancePctOfMachineryPa: 3,
  insurancePctOfCapexPa: 0.5,
  depreciationYears: 10,

  // Finance (PMEGP rural women, Dec 2023 guidelines)
  subsidyRate: 0.35,
  ownContributionRate: 0.10,    // 10% promoter margin per spec
  interestRatePa: 10.5,
  tenureMonths: 60,             // 5 years (tenure not stated in spec)
  schemeCeiling: 5000000,

  // Overrides
  runningLoadKw: 35,
  casePackSize: 24,
  monthlySalaries: 90000,

  // Section A: Plant & Solar CAPEX
  // RO Plant
  capexRoPlant: 850000,
  // PET Blow Molding (800k) + Air Compressor + Chiller (340k)
  capexBlowerUnit: 1140000,
  // RFC Monoblock (1400k) + BOPP Labeling (350k) + Batch Coding (120k) + Shrink Wrap (180k)
  capexMonoblockUnit: 2050000,
  capexMolds: 100000,
  capexSolar: 0,                // no solar in this spec

  // Section B: Infrastructure
  // Shed (1350k) + Flooring (180k) + Chem/Microbio Lab (300k)
  capexCivil: 1830000,
  // Borewell drilling (50k) + HDPE raw-water tank (40k)
  capexBorewell: 90000,
  capexLicensing: 275000,
  // 2-week raw material stock (850k) + operating WC — salaries/power (250k)
  capexWorkingCap: 1100000,

  // Section C: Operations
  solarHours: 0,

  // Section D: Raw materials (600 ml defaults per spec)
  preformCostPb: 1.80,          // 29/25 short-neck preform 14g
  capCostPb: 0.25,              // 29/25 virgin cap
  labelCostPb: 0.22,            // BOPP wrap-around label
  inkCostPb: 0.06,              // ink, ozone & filter depreciation
  shrinkCostPp: 4.80,           // shrink film per 24-pack

  // Section E: Revenue & logistics (per packet)
  sellingPricePp: 132,          // ₹5.50/bottle × 24 = ₹132/pack
  logisticCostPp: 7.20,

  // Section E: Subsidies
  upStateSubsidyRate: 0,        // UP ODOP/MSME state subsidy — set if applicable
}

export function blankScenario(name = 'New scenario'): Scenario {
  const now = Date.now()
  return {
    id: uid('sc'),
    name,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    machinery: [],
    civil: [],
    workingCapital: [],
    consumables: [],
    labour: [],
    routes: [],
    statutory: [],
    assumptions: { ...defaultAssumptions },
  }
}

export function cloneScenario(s: Scenario, name: string): Scenario {
  const now = Date.now()
  return {
    ...s,
    id: uid('sc'),
    name,
    createdAt: now,
    updatedAt: now,
    machinery: s.machinery.map((x) => ({ ...x, id: uid('m') })),
    civil: s.civil.map((x) => ({ ...x, id: uid('c') })),
    workingCapital: s.workingCapital.map((x) => ({ ...x, id: uid('w') })),
    consumables: s.consumables.map((x) => ({ ...x, id: uid('r') })),
    labour: s.labour.map((x) => ({ ...x, id: uid('l') })),
    routes: s.routes.map((x) => ({ ...x, id: uid('rt') })),
    statutory: s.statutory.map((x) => ({ ...x, id: uid('s') })),
    assumptions: { ...s.assumptions },
  }
}
