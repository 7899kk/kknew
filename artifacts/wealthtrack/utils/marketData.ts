/**
 * Market Data Utility — Pro Financier
 *
 * Data Sources (all free):
 * - Yahoo Finance: stocks (no key needed)
 * - Alpha Vantage: gold/silver via XAU/XAG forex, crypto, USD/INR rate
 * - CoinGecko: crypto fallback (no key needed)
 *
 * Alpha Vantage free tier: 25 calls/day, 5 calls/min
 * Key is stored in EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY env var
 */

const AV_KEY = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY ?? "";
const AV_BASE = "https://www.alphavantage.co/query";

export interface PriceResult {
  symbol: string;
  price: number;
  currency: string;
  change?: number;
  changePercent?: number;
  name?: string;
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

/**
 * Fetch stock price from Yahoo Finance (free, no key)
 * For Indian stocks: "RELIANCE.NS" (NSE), "TCS.BO" (BSE)
 */
export async function fetchStockPrice(symbol: string): Promise<PriceResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
    const prevClose = meta?.previousClose ?? null;
    const change = price && prevClose ? price - prevClose : undefined;
    const changePercent = prevClose && change ? (change / prevClose) * 100 : undefined;
    return {
      symbol,
      price: price ?? 0,
      currency: meta?.currency ?? "INR",
      change,
      changePercent,
      name: meta?.shortName ?? symbol,
    };
  } catch {
    return null;
  }
}

export async function fetchMultipleStockPrices(
  symbols: string[]
): Promise<Record<string, PriceResult>> {
  const results = await Promise.all(symbols.map(async (sym) => {
    const res = await fetchStockPrice(sym);
    return [sym, res] as [string, PriceResult | null];
  }));
  const map: Record<string, PriceResult> = {};
  results.forEach(([sym, res]) => { if (res) map[sym] = res; });
  return map;
}

// ─── Alpha Vantage helpers ────────────────────────────────────────────────────

/**
 * Fetch real-time exchange rate via Alpha Vantage CURRENCY_EXCHANGE_RATE
 * Works for: USD/INR, XAU/USD (gold), XAG/USD (silver), BTC/INR, ETH/INR…
 */
async function avExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (!AV_KEY) return 0;
  try {
    const url = `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${AV_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const rate = json?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
    return rate ? parseFloat(rate) : 0;
  } catch {
    return 0;
  }
}

// ─── Gold & Silver ────────────────────────────────────────────────────────────

/**
 * Fetch gold and silver prices in ₹/gram
 *
 * Strategy:
 * 1. Alpha Vantage: XAU/USD and XAG/USD + USD/INR rate (most accurate)
 * 2. Yahoo Finance fallback: GC=F (gold futures), SI=F (silver futures)
 *
 * 1 troy oz = 31.1035 grams
 */
export async function fetchGoldSilverPrices(): Promise<{
  goldPerGram: number;
  silverPerGram: number;
  usdInr: number;
  source: "alphavantage" | "yahoo";
}> {
  // Try Alpha Vantage first
  if (AV_KEY) {
    try {
      const [xauUsd, xagUsd, usdInrRate] = await Promise.all([
        avExchangeRate("XAU", "USD"),  // Gold in USD per troy oz
        avExchangeRate("XAG", "USD"),  // Silver in USD per troy oz
        avExchangeRate("USD", "INR"),  // USD to INR
      ]);

      if (xauUsd > 0 && usdInrRate > 0) {
        const goldPerGram = (xauUsd * usdInrRate) / 31.1035;
        const silverPerGram = xagUsd > 0 ? (xagUsd * usdInrRate) / 31.1035 : 0;
        return { goldPerGram, silverPerGram, usdInr: usdInrRate, source: "alphavantage" };
      }
    } catch {
      // fall through to Yahoo Finance
    }
  }

  // Yahoo Finance fallback
  const [goldRes, silverRes, usdInrRes] = await Promise.all([
    fetchStockPrice("GC=F"),
    fetchStockPrice("SI=F"),
    fetchStockPrice("INR=X"),
  ]);
  const usdInr = usdInrRes?.price ?? 84;
  const goldPerGram = goldRes ? (goldRes.price * usdInr) / 31.1035 : 0;
  const silverPerGram = silverRes ? (silverRes.price * usdInr) / 31.1035 : 0;
  return { goldPerGram, silverPerGram, usdInr, source: "yahoo" };
}

// ─── Cryptocurrency ───────────────────────────────────────────────────────────

/**
 * Fetch crypto prices in INR
 *
 * Strategy:
 * 1. Alpha Vantage: CURRENCY_EXCHANGE_RATE for each coin vs INR
 * 2. CoinGecko fallback (free, no key) for batch fetching
 */
export async function fetchCryptoPrices(
  coinIds: string[]
): Promise<Record<string, number>> {
  if (coinIds.length === 0) return {};

  // Alpha Vantage path — map CoinGecko IDs to AV symbols
  if (AV_KEY) {
    try {
      const geckoToSymbol: Record<string, string> = {
        bitcoin: "BTC", ethereum: "ETH", solana: "SOL", cardano: "ADA",
        dogecoin: "DOGE", polkadot: "DOT", chainlink: "LINK", binancecoin: "BNB",
        ripple: "XRP", "matic-network": "MATIC", "avalanche-2": "AVAX",
        tron: "TRX", litecoin: "LTC", "shiba-inu": "SHIB", pepe: "PEPE",
        sui: "SUI", aptos: "APT",
      };

      const avResults: Record<string, number> = {};
      const unknown: string[] = [];

      await Promise.all(coinIds.map(async (id) => {
        const sym = geckoToSymbol[id];
        if (!sym) { unknown.push(id); return; }
        const rate = await avExchangeRate(sym, "INR");
        if (rate > 0) avResults[id] = rate;
        else unknown.push(id);
      }));

      // Fallback CoinGecko for unknowns or failed AV lookups
      if (unknown.length > 0) {
        const cgPrices = await fetchCoinGeckoPrices(unknown);
        Object.assign(avResults, cgPrices);
      }

      if (Object.keys(avResults).length > 0) return avResults;
    } catch {
      // fall through
    }
  }

  // CoinGecko fallback
  return fetchCoinGeckoPrices(coinIds);
}

async function fetchCoinGeckoPrices(coinIds: string[]): Promise<Record<string, number>> {
  if (coinIds.length === 0) return {};
  try {
    const ids = coinIds.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=inr`;
    const res = await fetch(url);
    const json = await res.json();
    const result: Record<string, number> = {};
    coinIds.forEach((id) => { if (json[id]?.inr) result[id] = json[id].inr; });
    return result;
  } catch {
    return {};
  }
}

// ─── USD/INR Rate ─────────────────────────────────────────────────────────────

/**
 * Fetch live USD/INR exchange rate
 * Uses Alpha Vantage (with key) or Yahoo Finance fallback
 */
export async function fetchUsdInr(): Promise<number> {
  if (AV_KEY) {
    const rate = await avExchangeRate("USD", "INR");
    if (rate > 0) return rate;
  }
  const res = await fetchStockPrice("INR=X");
  return res?.price ?? 84;
}

// ─── Coin name mapping ────────────────────────────────────────────────────────

export function coinNameToGeckoId(name: string): string {
  const map: Record<string, string> = {
    bitcoin: "bitcoin", btc: "bitcoin",
    ethereum: "ethereum", eth: "ethereum",
    solana: "solana", sol: "solana",
    cardano: "cardano", ada: "cardano",
    dogecoin: "dogecoin", doge: "dogecoin",
    polkadot: "polkadot", dot: "polkadot",
    chainlink: "chainlink", link: "chainlink",
    bnb: "binancecoin", binance: "binancecoin",
    xrp: "ripple", ripple: "ripple",
    polygon: "matic-network", matic: "matic-network",
    avalanche: "avalanche-2", avax: "avalanche-2",
    tron: "tron", trx: "tron",
    litecoin: "litecoin", ltc: "litecoin",
    shiba: "shiba-inu", "shiba inu": "shiba-inu", shib: "shiba-inu",
    pepe: "pepe", sui: "sui", aptos: "aptos", apt: "aptos",
  };
  return map[name.toLowerCase()] ?? name.toLowerCase().replace(/\s+/g, "-");
}
