'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArray,
  normalizeMarket,
  flattenEvents,
  rankMarkets,
  fetchActiveEvents,
} = require('../public-scout.cjs');

test('parseArray accepts arrays and JSON-encoded arrays', () => {
  assert.deepEqual(parseArray(['Yes', 'No']), ['Yes', 'No']);
  assert.deepEqual(parseArray('["Yes","No"]'), ['Yes', 'No']);
  assert.deepEqual(parseArray('bad'), []);
});

test('normalizeMarket preserves implied probabilities without inventing edge', () => {
  const row = normalizeMarket({
    id: 7,
    question: 'Will X happen?',
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.62","0.38"]',
    clobTokenIds: '["a","b"]',
    liquidityNum: '12000',
    volumeNum: '45000',
    endDate: '2099-01-01T00:00:00Z',
  }, {
    id: 3,
    title: 'Event',
  }, Date.parse('2026-10-08T00:00:00Z'));

  assert.equal(row.yesPrice, 0.62);
  assert.equal(row.noPrice, 0.38);
  assert.equal(row.liquidity, 12000);
  assert.equal(row.readOnly, true);
  assert.equal(row.paperOnly, true);
  assert.equal('edge' in row, false);
  assert.equal('fairValue' in row, false);
});

test('normalizeMarket rejects ended and non-binary markets', () => {
  assert.equal(normalizeMarket({
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.5","0.5"]',
    endDate: '2020-01-01T00:00:00Z',
  }, {}, Date.parse('2026-10-08T00:00:00Z')), null);

  assert.equal(normalizeMarket({
    outcomes: '["A","B","C"]',
    outcomePrices: '["0.2","0.3","0.5"]',
    endDate: '2099-01-01T00:00:00Z',
  }, {}, Date.parse('2026-10-08T00:00:00Z')), null);
});

test('flatten + rank applies liquidity gate deterministically', () => {
  const events = [{
    id: 1,
    markets: [
      { id: 1, outcomes: '["Yes","No"]', outcomePrices: '["0.5","0.5"]', liquidityNum: '2000', volumeNum: '4', endDate: '2099-01-01T00:00:00Z' },
      { id: 2, outcomes: '["Yes","No"]', outcomePrices: '["0.4","0.6"]', liquidityNum: '5000', volumeNum: '2', endDate: '2099-01-01T00:00:00Z' },
      { id: 3, outcomes: '["Yes","No"]', outcomePrices: '["0.3","0.7"]', liquidityNum: '20', volumeNum: '999', endDate: '2099-01-01T00:00:00Z' },
    ],
  }];

  const rows = rankMarkets(flattenEvents(events, {
    now: Date.parse('2026-10-08T00:00:00Z'),
    minLiquidity: 1000,
  }));

  assert.deepEqual(rows.map((x) => x.marketId), ['2', '1']);
});

test('fetchActiveEvents paginates public active/closed filters', async () => {
  const seen = [];

  const fetchImpl = async (url) => {
    seen.push(String(url));
    const offset = Number(new URL(url).searchParams.get('offset'));

    return {
      ok: true,
      status: 200,
      json: async () => offset === 0 ? [{ id: 1 }, { id: 2 }] : [],
    };
  };

  const rows = await fetchActiveEvents({ fetchImpl, pageSize: 2, maxEvents: 4 });

  assert.equal(rows.length, 2);
  assert.match(seen[0], /active=true/);
  assert.match(seen[0], /closed=false/);
  assert.equal(seen.length, 2);
});
