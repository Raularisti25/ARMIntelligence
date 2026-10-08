'use strict';

const DEFAULT_BASE = 'https://gamma-api.polymarket.com';

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMarket(market, event = {}, now = Date.now()) {
  if (!market || typeof market !== 'object') return null;

  const outcomes = parseArray(market.outcomes);
  const prices = parseArray(market.outcomePrices).map(Number);
  const tokenIds = parseArray(market.clobTokenIds);

  if (
    outcomes.length !== 2 ||
    prices.length !== 2 ||
    prices.some((p) => !Number.isFinite(p))
  ) return null;

  const endDate = market.endDate || event.endDate || null;
  if (endDate) {
    const endMs = Date.parse(endDate);
    if (Number.isFinite(endMs) && endMs <= now) return null;
  }

  const yesIndex = outcomes.findIndex((x) => String(x).toLowerCase() === 'yes');
  const noIndex = outcomes.findIndex((x) => String(x).toLowerCase() === 'no');
  const primaryIndex = yesIndex >= 0 ? yesIndex : 0;

  return {
    source: 'polymarket-gamma-public',
    readOnly: true,
    paperOnly: true,
    eventId: String(event.id ?? ''),
    eventTitle: event.title || null,
    marketId: String(market.id ?? ''),
    question: market.question || event.title || null,
    slug: market.slug || event.slug || null,
    endDate,
    resolutionSource: market.resolutionSource || event.resolutionSource || null,
    outcomes,
    outcomePrices: prices,
    yesPrice: yesIndex >= 0 ? prices[yesIndex] : null,
    noPrice: noIndex >= 0 ? prices[noIndex] : null,
    primaryOutcome: outcomes[primaryIndex],
    primaryImpliedProbability: prices[primaryIndex],
    clobTokenIds: tokenIds,
    liquidity: finiteNumber(market.liquidityNum ?? market.liquidity),
    volume: finiteNumber(market.volumeNum ?? market.volume),
    volume24hr: finiteNumber(market.volume24hr ?? market.volume24hrClob),
    bestBid: Number.isFinite(Number(market.bestBid)) ? Number(market.bestBid) : null,
    bestAsk: Number.isFinite(Number(market.bestAsk)) ? Number(market.bestAsk) : null,
    spread: Number.isFinite(Number(market.spread)) ? Number(market.spread) : null,
    description: market.description || event.description || null,
  };
}

function flattenEvents(events, { now = Date.now(), minLiquidity = 0 } = {}) {
  const out = [];
  for (const event of Array.isArray(events) ? events : []) {
    for (const market of Array.isArray(event?.markets) ? event.markets : []) {
      const row = normalizeMarket(market, event, now);
      if (!row || row.liquidity < minLiquidity) continue;
      out.push(row);
    }
  }
  return out;
}

function rankMarkets(markets) {
  return [...markets].sort((a, b) =>
    finiteNumber(b.liquidity) - finiteNumber(a.liquidity) ||
    finiteNumber(b.volume24hr) - finiteNumber(a.volume24hr) ||
    finiteNumber(b.volume) - finiteNumber(a.volume) ||
    String(a.marketId).localeCompare(String(b.marketId))
  );
}

async function fetchActiveEvents({
  fetchImpl = globalThis.fetch,
  baseUrl = DEFAULT_BASE,
  pageSize = 100,
  maxEvents = 500,
  timeoutMs = 15000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable');

  const events = [];
  for (let offset = 0; offset < maxEvents; offset += pageSize) {
    const url = new URL('/events', baseUrl);
    url.searchParams.set('active', 'true');
    url.searchParams.set('closed', 'false');
    url.searchParams.set('limit', String(Math.min(pageSize, maxEvents - offset)));
    url.searchParams.set('offset', String(offset));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetchImpl(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'ARMIntelligence-prediction-market-research/1.0' },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res?.ok) {
      throw new Error(`Polymarket Gamma HTTP ${res?.status ?? 'unknown'}`);
    }

    const page = await res.json();
    if (!Array.isArray(page)) {
      throw new Error('Unexpected Polymarket Gamma response shape');
    }

    events.push(...page);
    if (page.length < pageSize) break;
  }

  return events.slice(0, maxEvents);
}

async function buildPublicSnapshot(options = {}) {
  const events = await fetchActiveEvents(options);
  const markets = rankMarkets(flattenEvents(events, options));

  return {
    generatedAt: new Date().toISOString(),
    source: 'Polymarket Gamma public API',
    readOnly: true,
    paperOnly: true,
    warning: 'Market prices are implied probabilities, not model fair values or verified trading edges.',
    eventCount: events.length,
    marketCount: markets.length,
    markets,
  };
}

function arg(name, fallback) {
  const hit = process.argv.find((x) => x.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

if (require.main === module) {
  (async () => {
    const maxEvents = Math.max(1, Math.min(1000, Number(arg('max-events', '200')) || 200));
    const top = Math.max(1, Math.min(200, Number(arg('top', '25')) || 25));
    const minLiquidity = Math.max(0, Number(arg('min-liquidity', '1000')) || 0);

    const snapshot = await buildPublicSnapshot({ maxEvents, minLiquidity });
    process.stdout.write(JSON.stringify(
      { ...snapshot, markets: snapshot.markets.slice(0, top) },
      null,
      2,
    ) + '\n');
  })().catch((err) => {
    process.stderr.write(
      `prediction-market-scout: ${err?.name || 'Error'}: ${err?.message || 'failed'}\n`
    );
    process.exit(1);
  });
}

module.exports = {
  parseArray,
  normalizeMarket,
  flattenEvents,
  rankMarkets,
  fetchActiveEvents,
  buildPublicSnapshot,
};
