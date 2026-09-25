// Alpha Vantage OVERVIEW의 Sector 값 → 해당 섹터 SPDR ETF
const SECTOR_ETF: Record<string, string> = {
  TECHNOLOGY: "XLK",
  "FINANCIAL SERVICES": "XLF",
  FINANCE: "XLF",
  HEALTHCARE: "XLV",
  "LIFE SCIENCES": "XLV",
  ENERGY: "XLE",
  "ENERGY & TRANSPORTATION": "XLE",
  "CONSUMER CYCLICAL": "XLY",
  "TRADE & SERVICES": "XLY",
  "CONSUMER DEFENSIVE": "XLP",
  INDUSTRIALS: "XLI",
  MANUFACTURING: "XLI",
  UTILITIES: "XLU",
  "REAL ESTATE": "XLRE",
  "REAL ESTATE & CONSTRUCTION": "XLRE",
  "BASIC MATERIALS": "XLB",
  "COMMUNICATION SERVICES": "XLC",
};

export function sectorEtf(sector: string): string | undefined {
  return SECTOR_ETF[sector.trim().toUpperCase()];
}
