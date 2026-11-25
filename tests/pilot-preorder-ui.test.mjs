import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

// Browser-facing DOM checks with API substitutes, not database transaction verification.
const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
  .replace(/<script\b[^>]*src=[^>]*><\/script>/g, '')
  .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, '');
const bundle = await build({ entryPoints: ['src/app.ts'], bundle: true, format: 'iife', target: 'es2022', write: false });
const STORAGE_KEY = 'xk-apparel-pilot-v1:http://localhost:5175/api/v1';
const ARRIVAL_NOTE = '測試交期：預計 2026/12/20 到齊，實際依店家確認';
const policy = { shippingFee: 65, freeShippingThreshold: 2000, currency: 'TWD', notice: '本機示意運費，不收款、不出貨。' };
const product = { id: 11, styleNo: 'LM-MIX-011', name: 'API 混單測試上衣', description: '本機混單驗收資料。', photoUrl: '', price: 680, currency: 'TWD', variants: [{ id: 101, sku: 'LM-MIX-011-S', color: '米白', size: 'S', available: true, preorderEnabled: true, preorderAvailable: true, preorderArrivalNote: ARRIVAL_NOTE }] };
const draft = { name: '示意收件人', phone: '0900000000', email: 'demo@example.com', store: '本機示意門市', note: '本機預購混單測試' };
const line = { variantId: 101, quantity: 1, productName: product.name, styleNo: product.styleNo, color: '米白', size: 'S', unitPrice: 680, photoUrl: '' };
const item = { variantId: 101, sku: 'LM-MIX-011-S', styleNo: product.styleNo, productName: product.name, color: '米白', size: 'S', quantity: 1, unitPrice: 680, lineTotal: 680 };
const mixedOrder = { id: 51, orderNo: 'LM-MIXED-TEST-051', status: 'CONFIRMED', source: 'STOREFRONT', currency: 'TWD', subtotal: 1360, shippingFee: 65, total: 1425, paymentStatus: 'TEST_ONLY', shippingNotice: '預購到齊後整單寄出，一次運費。交期為本機測試示意。', createdAt: '2026-11-25T18:00:00+08:00', items: [{ ...item, fulfillmentType: 'STOCK', preorderArrivalNote: '' }, { ...item, fulfillmentType: 'PREORDER', preorderArrivalNote: ARRIVAL_NOTE }] };
const response = (data, status = 200, code = '0000', message = '成功') => ({ ok: status >= 200 && status < 300, status, json: async () => ({ code, message, data, timestamp: '2026-11-25T18:00:00+08:00' }) });

function fixture(t, { products = [product], storage = [], hash = '#shop', submit = async () => response(mixedOrder) } = {}) {
  const window = new Window({ url: `http://localhost:5175/${hash}`, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true, enableImageFileLoading: false } });
  const requests = [];
  for (const [key, value] of storage) window.localStorage.setItem(key, value);
  window.__APPAREL_PILOT_API_BASE__ = '/api/v1';
  window.fetch = async (input, init = {}) => {
    const url = new URL(String(input), window.location.href);
    requests.push({ path: url.pathname, method: init.method || 'GET', headers: Object.fromEntries([...new window.Headers(init.headers || {}).entries()].map(([name, value]) => [name.toLowerCase(), value])), body: init.body });
    if (url.pathname.endsWith('/auth/csrf')) return response({ token: 'test-csrf-token', headerName: 'X-CSRF-TOKEN' });
    if (url.pathname.endsWith('/storefront/products')) return response(typeof products === 'function' ? products() : products);
    if (url.pathname.endsWith('/storefront/shipping-policy')) return response(policy);
    if (url.pathname.endsWith('/storefront/checkout')) return submit(requests.at(-1));
    throw new Error(`Unexpected API request ${url.pathname}`);
  };
  window.document.write(html);
  window.eval(bundle.outputFiles[0].text);
  t.after(() => window.happyDOM.close());
  return { window, requests };
}
function get(window, selector) { const element = window.document.querySelector(selector); assert.ok(element, `Expected ${selector}`); return element; }
function click(window, selector) { get(window, selector).click(); }
function text(window, selector) { return get(window, selector).textContent.replace(/\s+/g, ' ').trim(); }
async function until(check, name = 'condition') { for (let i = 0; i < 100; i++) { if (check()) return; await delay(10); } assert.fail(`Timed out waiting for ${name}`); }
function snapshot(window) { return Array.from({ length: window.localStorage.length }, (_, index) => { const key = window.localStorage.key(index); return [key, window.localStorage.getItem(key)]; }); }
function submissions(requests) { return requests.filter(request => request.path.endsWith('/storefront/checkout')); }
async function openProduct(window) { await until(() => window.document.querySelector('[data-product="11"]'), 'API catalog'); click(window, '[data-product="11"]'); }
async function add(window, type = 'STOCK') { await openProduct(window); if (type === 'PREORDER') click(window, '[data-fulfillment="PREORDER"]'); click(window, '[data-action="add"]'); }
async function checkout(window) { click(window, '#header [data-action="cart"]'); click(window, '[data-action="checkout"]'); await until(() => window.document.querySelector('#checkout-form'), 'checkout'); }
function submit(window) { click(window, '#checkout-form button[type="submit"]'); }
const unavailableCatalog = () => [{ ...product, variants: product.variants.map(variant => ({ ...variant, available: false, preorderEnabled: false, preorderAvailable: false, preorderArrivalNote: '新版交期，不應覆寫已成立快照' })) }];

test('sold-out stock never silently becomes preorder; an explicit preorder choice is required', async t => {
  const { window } = fixture(t, { products: [{ ...product, variants: product.variants.map(variant => ({ ...variant, available: false })) }] });
  await openProduct(window);
  assert.equal(get(window, '[data-fulfillment="STOCK"]').getAttribute('aria-pressed'), 'true');
  assert.equal(get(window, '[data-action="add"]').disabled, true);
  assert.match(text(window, '.availability'), /現貨|售罄|暫無/);
  click(window, '[data-action="add"]');
  assert.equal(text(window, '#header .count'), '0');
  click(window, '[data-fulfillment="PREORDER"]');
  assert.equal(get(window, '[data-action="add"]').disabled, false);
  assert.match(text(window, '#product-detail'), /預購/);
  assert.match(text(window, '#product-detail'), new RegExp(ARRIVAL_NOTE));
  click(window, '[data-action="add"]');
  click(window, '#header [data-action="cart"]');
  assert.equal(window.document.querySelectorAll('.cart-item').length, 1);
  assert.match(text(window, '.cart-item'), /預購/);
  assert.match(text(window, '.cart-item'), new RegExp(ARRIVAL_NOTE));
});

test('the same SKU can be stock and preorder as distinct lines; mixed receipt keeps one shipping fee and arrival snapshot', async t => {
  const { window, requests } = fixture(t);
  await add(window, 'STOCK');
  await add(window, 'PREORDER');
  click(window, '#header [data-action="cart"]');
  assert.equal(text(window, '#header .count'), '2');
  assert.equal(window.document.querySelectorAll('.cart-item').length, 2);
  assert.ok(window.document.querySelector('[data-cart-qty="101"][data-fulfillment-type="STOCK"]'));
  assert.ok(window.document.querySelector('[data-cart-qty="101"][data-fulfillment-type="PREORDER"]'));
  assert.match(text(window, '.dialog'), /現貨/);
  assert.match(text(window, '.dialog'), /預購/);
  assert.match(text(window, '.dialog'), /預購到齊後整單寄出/);
  assert.match(text(window, '.dialog .totals'), /65/);
  assert.match(text(window, '.dialog .grand'), /1,425/);
  click(window, '[data-action="checkout"]');
  await until(() => window.document.querySelector('#checkout-form'), 'mixed checkout');
  click(window, '[data-action="fill-demo"]');
  assert.match(text(window, '.checkout-summary'), /預購到齊後整單寄出/);
  assert.match(text(window, '.checkout-summary'), new RegExp(ARRIVAL_NOTE));
  submit(window);
  await until(() => submissions(requests).length === 1, 'mixed checkout request');
  const items = JSON.parse(submissions(requests)[0].body).items;
  assert.equal(items.length, 2);
  assert.deepEqual(items.map(({ variantId, quantity, fulfillmentType }) => ({ variantId, quantity, fulfillmentType })).sort((a, b) => a.fulfillmentType.localeCompare(b.fulfillmentType)), [{ variantId: 101, quantity: 1, fulfillmentType: 'PREORDER' }, { variantId: 101, quantity: 1, fulfillmentType: 'STOCK' }]);
  await until(() => window.document.querySelector('#main')?.textContent.includes(mixedOrder.orderNo), 'mixed receipt');
  const receipt = text(window, '#main');
  assert.match(receipt, /STOREFRONT/);
  assert.match(receipt, /現貨/);
  assert.match(receipt, /預購/);
  assert.match(receipt, /預購到齊後整單寄出/);
  assert.match(receipt, new RegExp(ARRIVAL_NOTE));
  assert.match(text(window, '#main .grand'), /1,425/);
  assert.equal((receipt.match(/本機測試運費/g) || []).length, 1);
});

test('mixed checkout response loss keeps exact typed payload and key after refresh even if both options are now unavailable', async t => {
  const first = fixture(t, { submit: async () => { throw new TypeError('response lost'); } });
  await add(first.window, 'STOCK');
  await add(first.window, 'PREORDER');
  await checkout(first.window);
  click(first.window, '[data-action="fill-demo"]');
  submit(first.window);
  await until(() => submissions(first.requests).length === 1 && first.window.document.querySelector('#checkout-error')?.textContent.trim(), 'mixed lost response');
  const original = submissions(first.requests)[0];
  assert.equal(JSON.parse(original.body).items.filter(item => item.fulfillmentType === 'PREORDER').length, 1);
  const retry = fixture(t, { products: unavailableCatalog(), storage: snapshot(first.window), hash: '#checkout' });
  await until(() => retry.window.document.querySelector('#checkout-form'), 'pending mixed checkout');
  submit(retry.window);
  await until(() => submissions(retry.requests).length === 1, 'mixed retry request');
  const replay = submissions(retry.requests)[0];
  assert.equal(replay.body, original.body);
  assert.equal(replay.headers['idempotency-key'], original.headers['idempotency-key']);
  await until(() => retry.window.document.querySelector('#main')?.textContent.includes(mixedOrder.orderNo), 'retried mixed receipt');
  assert.match(text(retry.window, '#main'), new RegExp(ARRIVAL_NOTE));
  assert.doesNotMatch(text(retry.window, '#main'), /新版交期/);
});

test('changing fulfillment intent from stock to preorder creates a new key', async t => {
  const { window, requests } = fixture(t, { submit: async () => { throw new TypeError('offline'); } });
  await add(window, 'STOCK');
  await checkout(window);
  click(window, '[data-action="fill-demo"]');
  submit(window);
  await until(() => submissions(requests).length === 1 && window.document.querySelector('#checkout-error')?.textContent.trim(), 'stock failed response');
  click(window, '#main [data-action="cart"]');
  click(window, '[data-cart-qty="101"][data-fulfillment-type="STOCK"][data-value="0"]');
  click(window, '[data-action="close"]');
  window.location.hash = '#shop';
  await until(() => window.document.querySelector('[data-product="11"]'), 'return catalog');
  await add(window, 'PREORDER');
  await checkout(window);
  assert.equal(get(window, '#checkout-form [name="email"]').value, 'demo@example.com');
  submit(window);
  await until(() => submissions(requests).length === 2, 'new preorder request');
  const [stock, preorder] = submissions(requests);
  assert.notEqual(stock.headers['idempotency-key'], preorder.headers['idempotency-key']);
  assert.deepEqual(JSON.parse(stock.body).items, [{ variantId: 101, quantity: 1, fulfillmentType: 'STOCK' }]);
  assert.deepEqual(JSON.parse(preorder.body).items, [{ variantId: 101, quantity: 1, fulfillmentType: 'PREORDER' }]);
});

test('legacy pending checkout keeps its byte-identical body without fulfillmentType and its key', async t => {
  const originalBody = JSON.stringify({ customer: { name: draft.name, phone: draft.phone, email: draft.email, store: draft.store }, note: draft.note, items: [{ variantId: 101, quantity: 1 }] });
  const originalKey = '2364af59-46bc-4d32-91ee-d08cb848324f';
  const legacyState = { cart: [{ ...line }], draft, orders: [], pending: { key: originalKey, body: originalBody } };
  const legacyOrder = { ...mixedOrder, subtotal: 680, total: 745, items: [{ ...item }] };
  const { window, requests } = fixture(t, { products: unavailableCatalog(), hash: '#checkout', storage: [[STORAGE_KEY, JSON.stringify(legacyState)]], submit: async () => response(legacyOrder) });
  await until(() => window.document.querySelector('#checkout-form'), 'legacy pending form');
  assert.match(text(window, '.checkout-summary'), /現貨/);
  submit(window);
  await until(() => submissions(requests).length === 1, 'legacy replay');
  const replay = submissions(requests)[0];
  assert.equal(replay.body, originalBody);
  assert.equal(replay.headers['idempotency-key'], originalKey);
  assert.equal('fulfillmentType' in JSON.parse(replay.body).items[0], false);
  await until(() => window.document.querySelector('#main')?.textContent.includes(legacyOrder.orderNo), 'legacy receipt');
  assert.match(text(window, '#main'), /現貨/);
});

test('legacy cart defaults to stock and cannot silently check out as preorder when stock is sold out', async t => {
  const legacyState = { cart: [{ ...line }], draft, orders: [] };
  const soldOut = [{ ...product, variants: product.variants.map(variant => ({ ...variant, available: false })) }];
  const { window, requests } = fixture(t, { products: soldOut, hash: '#checkout', storage: [[STORAGE_KEY, JSON.stringify(legacyState)]] });
  await until(() => window.document.querySelector('#checkout-form'), 'legacy cart');
  await delay(20);
  assert.match(text(window, '.checkout-summary'), /現貨/);
  submit(window);
  await until(() => window.document.querySelector('#checkout-error')?.textContent.trim(), 'legacy stock error');
  assert.equal(submissions(requests).length, 0);
  assert.equal(text(window, '#header .count'), '1');
});

test('quantity controls target SKU plus fulfillment type and free shipping uses the mixed subtotal', async t => {
  const { window, requests } = fixture(t, { submit: async () => { throw new TypeError('offline'); } });
  await add(window, 'STOCK');
  await add(window, 'PREORDER');
  click(window, '#header [data-action="cart"]');
  click(window, '[data-cart-qty="101"][data-fulfillment-type="PREORDER"][data-value="2"]');
  assert.equal(text(window, '#header .count'), '3');
  const rows = [...window.document.querySelectorAll('.cart-item')];
  assert.equal(rows.length, 2);
  const stockRow = rows.find(row => row.querySelector('[data-fulfillment-type="STOCK"]'));
  const preorderRow = rows.find(row => row.querySelector('[data-fulfillment-type="PREORDER"]'));
  assert.ok(stockRow);
  assert.ok(preorderRow);
  assert.equal(stockRow.querySelector('.quantity span').textContent.trim(), '1');
  assert.equal(preorderRow.querySelector('.quantity span').textContent.trim(), '2');
  assert.match(text(window, '.dialog .grand'), /2,040/);
  assert.match(text(window, '.dialog .totals'), /免運|NT\$ 0/);
  click(window, '[data-action="checkout"]');
  await until(() => window.document.querySelector('#checkout-form'), 'quantity edited mixed checkout');
  click(window, '[data-action="fill-demo"]');
  submit(window);
  await until(() => submissions(requests).length === 1, 'typed quantities');
  const items = JSON.parse(submissions(requests)[0].body).items;
  assert.equal(items.find(item => item.fulfillmentType === 'STOCK').quantity, 1);
  assert.equal(items.find(item => item.fulfillmentType === 'PREORDER').quantity, 2);
});

test('preorder quota exhaustion or disabled preorder cannot fall back into a stock purchase', async t => {
  const fullPreorder = [{ ...product, variants: product.variants.map(variant => ({ ...variant, preorderAvailable: false })) }];
  const full = fixture(t, { products: fullPreorder });
  await openProduct(full.window);
  click(full.window, '[data-fulfillment="PREORDER"]');
  assert.equal(get(full.window, '[data-action="add"]').disabled, true);
  click(full.window, '[data-action="add"]');
  assert.equal(text(full.window, '#header .count'), '0');
  const disabledPreorder = [{ ...product, variants: product.variants.map(variant => ({ ...variant, preorderEnabled: false, preorderAvailable: false })) }];
  const disabled = fixture(t, { products: disabledPreorder });
  await openProduct(disabled.window);
  assert.equal(get(disabled.window, '[data-fulfillment="PREORDER"]').disabled, true);
  assert.equal(get(disabled.window, '[data-fulfillment="STOCK"]').getAttribute('aria-pressed'), 'true');
});

test('a legacy stored order with no fulfillmentType renders as stock without inventing preorder details', async t => {
  const legacyOrder = { ...mixedOrder, subtotal: 680, total: 745, shippingNotice: undefined, items: [{ ...item }] };
  const legacyState = { cart: [], draft: { ...draft }, orders: [legacyOrder] };
  const { window, requests } = fixture(t, { hash: `#order/${legacyOrder.orderNo}`, storage: [[STORAGE_KEY, JSON.stringify(legacyState)]] });
  await until(() => window.document.querySelector('#main')?.textContent.includes(legacyOrder.orderNo), 'stored legacy receipt');
  await delay(20); // Let initial catalog reload settle before the fixture closes its window.
  assert.match(text(window, '#main'), /現貨/);
  assert.equal(window.document.querySelector('.pilot-arrival-note'), null);
  assert.doesNotMatch(text(window, '#main'), /預購到齊後整單寄出/);
  assert.equal(submissions(requests).length, 0);
});
