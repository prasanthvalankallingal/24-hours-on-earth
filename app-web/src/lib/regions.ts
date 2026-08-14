// Business-style world regions (APAC, MENA, NA…) keyed by ISO3 country code.
// Every country in metrics.json is mapped exactly once. Grouping follows the
// common corporate segmentation: North America, Latin America (incl. the
// Caribbean), Europe (incl. the Caucasus), MENA (Middle East & North Africa),
// APAC (East/South/SE/Central Asia + Oceania), and Sub-Saharan Africa.

export type Region =
  | "North America"
  | "Latin America"
  | "Europe"
  | "MENA"
  | "APAC"
  | "Sub-Saharan Africa";

// Display order + short chips used in the filter bar and CSV.
export const REGION_ORDER: Region[] = [
  "North America",
  "Latin America",
  "Europe",
  "MENA",
  "APAC",
  "Sub-Saharan Africa",
];

export const REGION_SHORT: Record<Region, string> = {
  "North America": "NA",
  "Latin America": "LATAM",
  Europe: "EU",
  MENA: "MENA",
  APAC: "APAC",
  "Sub-Saharan Africa": "SSA",
};

const REGION_BY_CODE: Record<string, Region> = {
  // North America (5)
  BMU: "North America", CAN: "North America", GRL: "North America", SPM: "North America",
  USA: "North America",
  // Latin America (51)
  ABW: "Latin America", AIA: "Latin America", ANT: "Latin America", ARG: "Latin America",
  ATG: "Latin America", BES: "Latin America", BHS: "Latin America", BLM: "Latin America",
  BLZ: "Latin America", BOL: "Latin America", BRA: "Latin America", BRB: "Latin America",
  CHL: "Latin America", COL: "Latin America", CRI: "Latin America", CUB: "Latin America",
  CUW: "Latin America", CYM: "Latin America", DMA: "Latin America", DOM: "Latin America",
  ECU: "Latin America", FLK: "Latin America", GLP: "Latin America", GRD: "Latin America",
  GTM: "Latin America", GUF: "Latin America", GUY: "Latin America", HND: "Latin America",
  HTI: "Latin America", JAM: "Latin America", KNA: "Latin America", LCA: "Latin America",
  MAF: "Latin America", MEX: "Latin America", MSR: "Latin America", MTQ: "Latin America",
  NIC: "Latin America", PAN: "Latin America", PER: "Latin America", PRI: "Latin America",
  PRY: "Latin America", SLV: "Latin America", SUR: "Latin America", SXM: "Latin America",
  TCA: "Latin America", TTO: "Latin America", URY: "Latin America", VCT: "Latin America",
  VEN: "Latin America", VGB: "Latin America", VIR: "Latin America",
  // Europe (54)
  ALB: "Europe", AND: "Europe", ARM: "Europe", AUT: "Europe", AZE: "Europe", BEL: "Europe", BGR: "Europe",
  BIH: "Europe", BLR: "Europe", CHE: "Europe", CYP: "Europe", CZE: "Europe", DEU: "Europe", DNK: "Europe",
  ESP: "Europe", EST: "Europe", FIN: "Europe", FRA: "Europe", FRO: "Europe", GBR: "Europe", GEO: "Europe",
  GGY: "Europe", GIB: "Europe", GRC: "Europe", HRV: "Europe", HUN: "Europe", IMN: "Europe", IRL: "Europe",
  ISL: "Europe", ITA: "Europe", JEY: "Europe", LIE: "Europe", LTU: "Europe", LUX: "Europe", LVA: "Europe",
  MCO: "Europe", MDA: "Europe", MKD: "Europe", MLT: "Europe", MNE: "Europe", NLD: "Europe", NOR: "Europe",
  POL: "Europe", PRT: "Europe", ROU: "Europe", RUS: "Europe", SMR: "Europe", SRB: "Europe", SVK: "Europe",
  SVN: "Europe", SWE: "Europe", TUR: "Europe", UKR: "Europe", VAT: "Europe",
  // MENA (20)
  ARE: "MENA", BHR: "MENA", DZA: "MENA", EGY: "MENA", ESH: "MENA", IRN: "MENA", IRQ: "MENA", ISR: "MENA",
  JOR: "MENA", KWT: "MENA", LBN: "MENA", LBY: "MENA", MAR: "MENA", OMN: "MENA", PSE: "MENA", QAT: "MENA",
  SAU: "MENA", SYR: "MENA", TUN: "MENA", YEM: "MENA",
  // APAC (55)
  AFG: "APAC", ASM: "APAC", AUS: "APAC", BGD: "APAC", BRN: "APAC", BTN: "APAC", CHN: "APAC", COK: "APAC",
  FJI: "APAC", FSM: "APAC", GUM: "APAC", HKG: "APAC", IDN: "APAC", IND: "APAC", JPN: "APAC", KAZ: "APAC",
  KGZ: "APAC", KHM: "APAC", KIR: "APAC", KOR: "APAC", LAO: "APAC", LKA: "APAC", MAC: "APAC", MDV: "APAC",
  MHL: "APAC", MMR: "APAC", MNG: "APAC", MNP: "APAC", MYS: "APAC", NCL: "APAC", NIU: "APAC", NPL: "APAC",
  NRU: "APAC", NZL: "APAC", PAK: "APAC", PHL: "APAC", PLW: "APAC", PNG: "APAC", PRK: "APAC", PYF: "APAC",
  SGP: "APAC", SLB: "APAC", THA: "APAC", TJK: "APAC", TKL: "APAC", TKM: "APAC", TLS: "APAC", TON: "APAC",
  TUV: "APAC", TWN: "APAC", UZB: "APAC", VNM: "APAC", VUT: "APAC", WLF: "APAC", WSM: "APAC",
  // Sub-Saharan Africa (52)
  AGO: "Sub-Saharan Africa", BDI: "Sub-Saharan Africa", BEN: "Sub-Saharan Africa",
  BFA: "Sub-Saharan Africa", BWA: "Sub-Saharan Africa", CAF: "Sub-Saharan Africa",
  CIV: "Sub-Saharan Africa", CMR: "Sub-Saharan Africa", COD: "Sub-Saharan Africa",
  COG: "Sub-Saharan Africa", COM: "Sub-Saharan Africa", CPV: "Sub-Saharan Africa",
  DJI: "Sub-Saharan Africa", ERI: "Sub-Saharan Africa", ETH: "Sub-Saharan Africa",
  GAB: "Sub-Saharan Africa", GHA: "Sub-Saharan Africa", GIN: "Sub-Saharan Africa",
  GMB: "Sub-Saharan Africa", GNB: "Sub-Saharan Africa", GNQ: "Sub-Saharan Africa",
  KEN: "Sub-Saharan Africa", LBR: "Sub-Saharan Africa", LSO: "Sub-Saharan Africa",
  MDG: "Sub-Saharan Africa", MLI: "Sub-Saharan Africa", MOZ: "Sub-Saharan Africa",
  MRT: "Sub-Saharan Africa", MUS: "Sub-Saharan Africa", MWI: "Sub-Saharan Africa",
  MYT: "Sub-Saharan Africa", NAM: "Sub-Saharan Africa", NER: "Sub-Saharan Africa",
  NGA: "Sub-Saharan Africa", REU: "Sub-Saharan Africa", RWA: "Sub-Saharan Africa",
  SDN: "Sub-Saharan Africa", SEN: "Sub-Saharan Africa", SHN: "Sub-Saharan Africa",
  SLE: "Sub-Saharan Africa", SOM: "Sub-Saharan Africa", SSD: "Sub-Saharan Africa",
  STP: "Sub-Saharan Africa", SWZ: "Sub-Saharan Africa", SYC: "Sub-Saharan Africa",
  TCD: "Sub-Saharan Africa", TGO: "Sub-Saharan Africa", TZA: "Sub-Saharan Africa",
  UGA: "Sub-Saharan Africa", ZAF: "Sub-Saharan Africa", ZMB: "Sub-Saharan Africa",
  ZWE: "Sub-Saharan Africa",
};

/** Region for an ISO3 code, or null if unmapped (kept out of the table). */
export function regionFor(code: string): Region | null {
  return REGION_BY_CODE[code] ?? null;
}
