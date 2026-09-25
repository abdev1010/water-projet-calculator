/**
 * Schema for the Sitapur water venture financial model.
 *
 * Design rule: this file describes INPUTS ONLY.
 * Anything that can be computed from these inputs lives in engine.ts as part of
 * `Derived` and is never stored. That rule is what stops the model from drifting
 * against itself (e.g. a typed-in "total connected load" disagreeing with the
 * sum of the individual machine loads).
 */

export type Confidence = 'verified' | 'indicative' | 'assumption'

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  verified: 'Verified',
  indicative: 'Indicative',
  assumption: 'Assumption',
}

/** A capital line item: machinery, civil work, working capital. */
export interface CostItem {
  id: string
  name: string
  /** Rupees, per unit. */
  cost: number
  qty: number
  confidence: Confidence
  note?: string
}

export interface MachineryItem extends CostItem {
  /** Electrical draw in kW, per unit. Feeds the connected-load calculation. */
  powerKw?: number
  /**
   * Rated throughput in bottles per hour, if this machine sits in the
   * production line. Feeds the bottleneck check: the line runs at the
   * speed of its slowest machine, not at the filler's rating.
   */
  ratedBph?: number
  vendor?: string
}

/** A per-bottle or per-pack consumable: preform, cap, label, shrink film. */
export interface ConsumableItem {
  id: string
  name: string
  costPerUnit: number
  unit: 'bottle' | 'pack'
  /** Bottles per pack — required when unit === 'pack'. */
  packSize?: number
  /** Unchecked items are kept in the list but excluded from the cost. */
  enabled: boolean
  confidence: Confidence
  note?: string
}

export interface LabourRole {
  id: string
  title: string
  count: number
  monthlySalary: number
  /**
   * 'fixed'    — one of these regardless of how many shifts you run
   * 'perShift' — you need one per shift; a second shift doubles this cost
   */
  shiftScaling: 'fixed' | 'perShift'
}

export interface LogisticsRoute {
  id: string
  name: string
  /** Percentage of monthly volume that travels this route. Should total 100. */
  sharePct: number
  oneWayKm: number
  bottlesPerTrip: number
  fuelCostPerKm: number
  tollsPerTrip: number
}

export interface RecurringCost {
  id: string
  name: string
  amount: number
  recurrence: 'oneTime' | 'annual' | 'monthly'
  confidence: Confidence
  note?: string
}

export interface Assumptions {
  // ---- Production ----
  /** Rated speed of the filling machine, bottles per minute. */
  fillerBpm: number
  /** 0–1. Real lines lose 25–40% of nominal time to jams, changeovers, cleaning. */
  lineEfficiency: number
  shiftHours: number
  shiftsPerDay: number
  workingDays: number

  /**
   * 'salesLed'    — volume is what you expect to sell, capped by capacity
   * 'capacityLed' — volume is whatever the plant can physically make
   */
  volumeMode: 'salesLed' | 'capacityLed'
  monthlySalesTarget: number

  // ---- Power ----
  tariffPerKwh: number
  /** 0–1. Not every machine draws full load at the same instant. */
  diversityFactor: number

  // ---- Commercial ----
  /** Price you receive, i.e. trade/wholesale, not MRP. Used for P&L and break-even. */
  wholesalePrice: number
  /** Per-SKU wholesale prices for the revenue comparison table. */
  sellingPrice600?: number
  sellingPrice1200?: number
  /** Percentage of production lost to breakage and spoilage. */
  breakagePct: number

  // ---- Fixed overheads not itemised elsewhere ----
  monthlyAdmin: number
  monthlyTesting: number
  maintenancePctOfMachineryPa: number
  insurancePctOfCapexPa: number
  depreciationYears: number

  // ---- Finance ----
  subsidyRate: number
  ownContributionRate: number
  interestRatePa: number
  tenureMonths: number
  /** PMEGP admissible ceiling for manufacturing. */
  schemeCeiling: number

  /* ------------------------------------------------------------------
   * DIRECT-ENTRY OVERRIDES
   *
   * Each of these replaces a derived figure when set above zero. Leave at
   * zero and the engine works it out from the detailed lists instead.
   * The calculator shows the derived value beside each field so a
   * disagreement between the two is visible rather than silent.
   * ------------------------------------------------------------------ */

  /** Bottles per master pack / case. Used for freight and shrink film. */
  casePackSize?: number
  /** Running electrical load in kW. 0 → derive from machinery[].powerKw. */
  runningLoadKw?: number
  /** Diesel generator fuel, averaged per bottle over the month. */
  dgFuelPerBottle?: number
  /** Total monthly wage bill. 0 → derive from labour[]. */
  monthlySalaries?: number
  /** Whether that wage bill scales with the number of shifts run. */
  salariesPerShift?: boolean
  /** Flat monthly maintenance. 0 → derive from maintenancePctOfMachineryPa. */
  monthlyMaintenance?: number
  /** Flat monthly insurance. 0 → derive from insurancePctOfCapexPa. */
  monthlyInsurance?: number
  /** Freight per master pack. 0 → derive from routes[]. */
  freightPerCase?: number
  /** Selling, distribution and marketing cost carried per bottle. */
  sellingCostPerBottle?: number
  /** Repayment holiday before EMIs start. Display only — does not change EMI. */
  moratoriumMonths?: number

  /* ------------------------------------------------------------------
   * SECTION-SPECIFIC CAPEX INPUTS
   * When capexRoPlant > 0 the engine uses these instead of summing
   * the generic machinery[] / civil[] / workingCapital[] arrays.
   * ------------------------------------------------------------------ */
  capexRoPlant?: number        // Section A: RO Filter Plant
  capexBlowerUnit?: number     // Section A: Blower + Compressor + Chiller (combined)
  capexMonoblockUnit?: number  // Section A: Monoblock + Labeler + Coder + Shrink (combined)
  capexMolds?: number          // Section A: Custom moulds
  capexSolar?: number          // Section A: Solar plant (on-grid, kW)
  capexCivil?: number          // Section B: Civil shed, clean room & lab
  capexBorewell?: number       // Section B: Borewell drilling + motor + HDPE storage tank
  capexLicensing?: number      // Section B: BIS IS:14543 + FSSAI + state NOC one-time fees
  capexWorkingCap?: number     // Section B: Working capital reserve

  /* ------------------------------------------------------------------
   * SOLAR ELECTRICITY
   * ------------------------------------------------------------------ */
  /** Hours per day the solar plant supplies free power (9 AM – 4 PM ≈ 7 hrs). */
  solarHours?: number

  /* ------------------------------------------------------------------
   * RAW MATERIAL COSTS PER BOTTLE
   * When preformCostPb > 0 the engine uses these instead of consumables[].
   * ------------------------------------------------------------------ */
  preformCostPb?: number   // Preform (raw plastic tube)
  capCostPb?: number       // Virgin plastic cap
  labelCostPb?: number     // Brand sticker
  inkCostPb?: number       // Printer ink & gas
  shrinkCostPp?: number    // Shrink film cost per PACKET (divided by casePackSize)

  /* ------------------------------------------------------------------
   * PER-PACKET SELLING & LOGISTICS
   * ------------------------------------------------------------------ */
  /** Wholesale price per PACKET (e.g. ₹95 for a 24-bottle pack). */
  sellingPricePp?: number
  /** Freight/logistics cost per PACKET (diesel + tolls for one delivery pack). */
  logisticCostPp?: number

  /** UP State ODOP / MSME capital subsidy rate (applied to same admissible cost as PMEGP). */
  upStateSubsidyRate?: number

  /* ------------------------------------------------------------------
   * INLINE NOTES — free-text annotations per CAPEX line item
   * ------------------------------------------------------------------ */
  noteRoPlant?: string
  noteBlowerUnit?: string
  noteMonoblockUnit?: string
  noteMolds?: string
  noteSolar?: string
  noteCivil?: string
  noteBorewell?: string
  noteLicensing?: string
  noteWorkingCap?: string
}

export interface Scenario {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  schemaVersion: number
  notes?: string

  machinery: MachineryItem[]
  civil: CostItem[]
  workingCapital: CostItem[]
  consumables: ConsumableItem[]
  labour: LabourRole[]
  routes: LogisticsRoute[]
  statutory: RecurringCost[]
  assumptions: Assumptions
}

export const SCHEMA_VERSION = 1
