import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
  .replace(/<script\b[^>]*src=[^>]*><\/script>/g, '')
  .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, '');
const bundle = await build({ entryPoints: ['src/app.ts'], bundle: true, format: 'iife', target: 'es2022', write: false });
const policy = { shippingFee: 65, freeShippingThreshold: 2000, notice: '本機測試運費示意，不會收款或出貨。', currency: 'TWD' };
const catalog = [{ id: 11, styleNo: 'LM-PILOT-011', name: 'API 測試棉上衣', description: '只提供本機測試。', photoUrl: '', price: 680, currency: 'TWD', variants: [{ id: 101, sku: 'LM-PILOT-011-S', color: '米白', size: 'S', available: true }, { id: 102, sku: 'LM-PILOT-011-M', color: '米白', size: 'M', available: false }] }];
const order = { id: 21, orderNo: 'LM-SF-TEST-021', source: 'STOREFRONT', status: 'CONFIRMED', currency: 'TWD', subtotal: 680, shippingFee: 65, total: 745, paymentStatus: 'TEST_ONLY', createdAt: '2026-11-25T12:00:00+08:00', items: [{ variantId: 101, sku: 'LM-PILOT-011-S', styleNo: 'LM-PILOT-011', productName: 'API 測試棉上衣', color: '米白', size: 'S', quantity: 1, unitPrice: 680, lineTotal: 680 }] };
const response = (data, status = 200, code = '0000', message = '成功') => ({ ok: status >= 200 && status < 300, status, json: async () => ({ code, message, data, timestamp: '2026-11-25T12:00:00+08:00' }) });

function fixture(t, { storage = [], products = catalog, submit = async () => response(order), hash = '#shop', pilot = true, catalogFailure = false } = {}) {
  const window = new Window({ url: `http://localhost:5175/${hash}`, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true, enableImageFileLoading: false } });
  const requests = [];
  for (const [key, value] of storage) window.localStorage.setItem(key, value);
  if (pilot) window.__APPAREL_PILOT_API_BASE__ = '/api/v1';
  window.fetch = async (input, init = {}) => {
    const url = new URL(String(input), window.location.href);
    requests.push({ path: url.pathname, method: init.method || 'GET', headers: Object.fromEntries([...new window.Headers(init.headers || {}).entries()].map(([name,value])=>[name.toLowerCase(),value])), body: init.body });
    if (url.pathname.endsWith('/auth/csrf')) return response({ token: 'test-csrf-token', headerName: 'X-CSRF-TOKEN' });
    if (url.pathname.endsWith('/storefront/products')) { if (catalogFailure) throw new TypeError('catalog offline'); return response(products); }
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
async function until(check, message = 'condition') { for (let i = 0; i < 100; i++) { if (check()) return; await delay(10); } assert.fail(`Timed out waiting for ${message}`); }
function snapshot(window) { return Array.from({ length: window.localStorage.length }, (_, index) => { const key = window.localStorage.key(index); return [key, window.localStorage.getItem(key)]; }); }
function setField(window, name, value) { const input = get(window, `#checkout-form [name="${name}"]`); input.value = value; input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true })); }
function submissions(requests) { return requests.filter(request => request.path.endsWith('/storefront/checkout')); }
async function beginCheckout(window) {
  await until(() => window.document.querySelector('[data-product="11"]'), 'API catalog');
  click(window, '[data-product="11"]');
  click(window, '[data-action="add"]');
  click(window, '#header [data-action="cart"]');
  click(window, '[data-action="checkout"]');
  await until(() => window.document.querySelector('#checkout-form'), 'checkout');
  click(window, '[data-action="fill-demo"]');
}
function submit(window) { click(window, '#checkout-form button[type="submit"]'); }

test('API mode uses server catalog and sellable states without exposing mock inventory or orders', async t => {
  const { window, requests } = fixture(t, { storage: [['xk-apparel-demo-v1', JSON.stringify({ products: [], cart: [], orders: [{ id: 'DEMO-PRIVATE' }], member: true })]] });
  await until(() => window.document.querySelector('[data-product="11"]'), 'API catalog');
  assert.equal(window.document.querySelectorAll('.product-card').length, 1);
  assert.match(text(window, '.demo-banner'), /本機.*(?:測試|試跑)/);
  assert.doesNotMatch(text(window, '#main'), /奶油圓領針織|DEMO-PRIVATE|可購買 99/);
  click(window, '[data-product="11"]');
  click(window, '[data-variant="102"]');
  assert.equal(get(window, '[data-action="add"]').disabled, true);
  assert.ok(requests.some(request => request.path.endsWith('/storefront/shipping-policy')));
  assert.equal(submissions(requests).length, 0);
});

test('checkout API rejection keeps bag and demo recipient input; never creates a mock success', async t => {
  const sentinel = '{"keep":"demo-only"}';
  const { window, requests } = fixture(t, { storage: [['xk-apparel-demo-v1', sentinel]], submit: async () => response(null, 400, 'E1001', 'API 測試棉上衣 S 數量不足') });
  await beginCheckout(window);
  setField(window, 'note', '請保留這次測試輸入');
  submit(window);
  await until(() => window.document.querySelector('#checkout-error')?.textContent.includes('數量不足'), 'API rejection');
  assert.equal(get(window, '#checkout-form [name="name"]').value, '示意收件人');
  assert.equal(get(window, '#checkout-form [name="email"]').value, 'demo@example.com');
  assert.equal(get(window, '#checkout-form [name="note"]').value, '請保留這次測試輸入');
  assert.match(text(window, '#header .count'), /1/);
  assert.equal(window.localStorage.getItem('xk-apparel-demo-v1'), sentinel);
  assert.doesNotMatch(text(window, '#main'), /模擬訂單已建立|付款成功/);
  assert.equal(submissions(requests).length, 1);
  const reloaded = fixture(t, { storage: snapshot(window), hash: '#checkout' });
  await until(() => reloaded.window.document.querySelector('#checkout-form'), 'saved checkout');
  assert.equal(get(reloaded.window, '#checkout-form [name="note"]').value, '請保留這次測試輸入');
  assert.equal(get(reloaded.window, '#checkout-form [name="email"]').value, 'demo@example.com');
  assert.match(text(reloaded.window, '#header .count'), /1/);
});

test('lost response retries exact body and Idempotency-Key after reload even when last unit is no longer sellable', async t => {
  const first = fixture(t, { submit: async () => { throw new TypeError('network response lost'); } });
  await beginCheckout(first.window);
  setField(first.window, 'note', '同一份內容重送');
  submit(first.window);
  await until(() => submissions(first.requests).length === 1 && first.window.document.querySelector('#checkout-error')?.textContent.trim(), 'network error');
  const original = submissions(first.requests)[0];
  assert.ok(original.headers['idempotency-key']);
  const afterCommit = catalog.map(product => ({ ...product, variants: product.variants.map(variant => ({ ...variant, available: false })) }));
  const retry = fixture(t, { products: afterCommit, storage: snapshot(first.window), hash: '#checkout' });
  await until(() => retry.window.document.querySelector('#checkout-form'), 'recover pending checkout');
  assert.equal(get(retry.window, '#checkout-form [name="note"]').value, '同一份內容重送');
  submit(retry.window);
  await until(() => submissions(retry.requests).length === 1, 'same request retry');
  const replay = submissions(retry.requests)[0];
  assert.equal(replay.headers['idempotency-key'], original.headers['idempotency-key']);
  assert.equal(replay.body, original.body);
  await until(() => retry.window.document.querySelector('#main')?.textContent.includes(order.orderNo), 'server order receipt');
  assert.match(text(retry.window, '#main'), /STOREFRONT/);
  assert.match(text(retry.window, '#main'), /745/);
  assert.match(text(retry.window, '#main .definition'), /TEST_ONLY.*本機測試，不收款/);
  assert.doesNotMatch(text(retry.window, '#main'), /simulated_paid/);
  assert.equal(text(retry.window, '#header .count'), '0');
});

test('recipient edits replace the idempotency key instead of replaying a changed payload', async t => {
  const { window, requests } = fixture(t, { submit: async () => { throw new TypeError('offline'); } });
  await beginCheckout(window);
  submit(window);
  await until(() => submissions(requests).length === 1 && window.document.querySelector('#checkout-error')?.textContent.trim(), 'first failed submit');
  setField(window, 'name', '第二次示意收件人');
  submit(window);
  await until(() => submissions(requests).length === 2, 'edited submit');
  const [first, changed] = submissions(requests);
  assert.notEqual(changed.headers['idempotency-key'], first.headers['idempotency-key']);
  assert.notEqual(changed.body, first.body);
  assert.equal(JSON.parse(changed.body).customer.name, '第二次示意收件人');
});

test('ordinary public build stays in eight-product mock mode with zero API requests', async t => {
  const { window, requests } = fixture(t, { pilot: false });
  assert.equal(window.document.querySelectorAll('.product-card').length, 8);
  assert.equal(requests.length, 0);
  assert.match(text(window, '.demo-banner'), /假商品／模擬交易/);
});

test('checkout refuses to send when a retry key cannot be persisted for refresh recovery', async t => {
  const { window, requests } = fixture(t);
  await beginCheckout(window);
  Object.defineProperty(window.localStorage, 'setItem', { value: () => { throw new Error('storage disabled'); }, configurable: true });
  submit(window);
  await until(() => window.document.querySelector('#checkout-error')?.textContent.trim(), 'persistence failure feedback');
  assert.equal(submissions(requests).length, 0, 'without a persisted retry key the checkout must not reach the server');
  assert.equal(text(window, '#header .count'), '1');
  assert.equal(get(window, '#checkout-form [name="email"]').value, 'demo@example.com');
});

test('repeated submit while a checkout is in flight sends only one request', async t => {
  let release;
  const submitted = new Promise(resolve => { release = resolve; });
  const { window, requests } = fixture(t, { submit: async () => { await submitted; return response(order); } });
  await beginCheckout(window);
  submit(window);
  await until(() => submissions(requests).length === 1, 'in-flight request');
  const form = get(window, '#checkout-form');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(submissions(requests).length, 1);
  release();
  await until(() => window.document.querySelector('#main')?.textContent.includes(order.orderNo), 'server receipt');
});

test('editing shopping bag quantity replaces the retry key and preserves recipient draft', async t => {
  const { window, requests } = fixture(t, { submit: async () => { throw new TypeError('offline'); } });
  await beginCheckout(window);
  submit(window);
  await until(() => submissions(requests).length === 1 && window.document.querySelector('#checkout-error')?.textContent.trim(), 'first failed checkout');
  click(window, '#main [data-action="cart"]');
  click(window, '[data-cart-qty="101"][data-value="2"]');
  click(window, '[data-action="close"]');
  assert.equal(get(window, '#checkout-form [name="email"]').value, 'demo@example.com');
  submit(window);
  await until(() => submissions(requests).length === 2, 'quantity-edited checkout');
  const [first, changed] = submissions(requests);
  assert.notEqual(first.headers['idempotency-key'], changed.headers['idempotency-key']);
  assert.deepEqual(JSON.parse(changed.body).items, [{ variantId: 101, quantity: 2, fulfillmentType: 'STOCK' }]);
  assert.equal(JSON.parse(changed.body).customer.email, 'demo@example.com');
});

test('catalog connection failure shows an API error and never substitutes the original mock products', async t => {
  const { window, requests } = fixture(t, { catalogFailure: true });
  await until(() => window.document.querySelector('#main [role="alert"]'), 'catalog error');
  assert.equal(window.document.querySelectorAll('.product-card').length, 0);
  assert.doesNotMatch(text(window, '#main'), /奶油圓領針織|淺杏直筒長褲/);
  assert.match(text(window, '#main'), /未切換成示意商品/);
  assert.equal(submissions(requests).length, 0);
});
