import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

// This is a DOM interaction check, not a browser layout or backend integration test.
const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
  .replace(/<script\b[^>]*src=[^>]*><\/script>/g, '')
  .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, '');
const bundle = await build({ entryPoints: ['src/app.ts'], bundle: true, format: 'iife', target: 'es2022', write: false });

function fixture(t, { hash = '#shop', storage = [] } = {}) {
  const window = new Window({
    url: `https://prototype.example/${hash}`,
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      enableImageFileLoading: false,
    },
  });
  for (const [key, value] of storage) window.localStorage.setItem(key, value);
  window.confirm = () => true;
  window.document.write(html);
  window.eval(bundle.outputFiles[0].text);
  t.after(() => window.happyDOM.close());
  return window;
}

function get(window, selector) {
  const element = window.document.querySelector(selector);
  assert.ok(element, `Expected visible markup for ${selector}`);
  return element;
}
function click(window, selector) { get(window, selector).click(); }
function text(window, selector) { return get(window, selector).textContent.replace(/\s+/g, ' ').trim(); }
// Hash navigation is queued by happy-dom; do not wait for the 3.5-second toast timer.
async function settle() { await delay(20); }
function storageSnapshot(window) {
  return Array.from({ length: window.localStorage.length }, (_, index) => {
    const key = window.localStorage.key(index);
    return [key, window.localStorage.getItem(key)];
  });
}
function quota(window, sku) { return Number(get(window, `[data-stock-form="${sku}"] input`).value); }

test('guest mixes stock and preorder, validates checkout, creates COD order and retains it after reload', async t => {
  const window = fixture(t);
  assert.equal(window.document.querySelectorAll('.product-card').length, 8);
  assert.match(text(window, '.demo-banner'), /假商品／模擬交易/);

  click(window, '[data-product="p01"]');
  click(window, '[data-variant="p01-ivory-m"]');
  assert.equal(get(window, '[data-variant="p01-ivory-m"]').getAttribute('aria-pressed'), 'true');
  click(window, '[data-qty="1"]');
  assert.equal(text(window, '#detail-quantity'), '2');
  click(window, '[data-qty="-1"]');
  click(window, '[data-action="add"]');

  click(window, '[data-product="p01"]');
  click(window, '[data-color="燕麥"]');
  click(window, '[data-variant="p01-oat-m"]');
  assert.match(text(window, '.availability'), /預購.*14 天/);
  click(window, '[data-action="add"]');
  assert.equal(text(window, '#header .count'), '2');
  click(window, '#header [data-action="cart"]');
  assert.equal(window.document.querySelectorAll('.cart-item').length, 2);
  assert.match(text(window, '.dialog .notice'), /包含現貨與預購.*到齊後整單寄出.*14 天/);
  assert.match(text(window, '.dialog .grand'), /1,845/);

  click(window, '[data-cart-qty="p01-ivory-m"][data-value="2"]');
  assert.equal(text(window, '#header .count'), '3');
  assert.match(text(window, '.dialog .grand'), /2,670/);
  assert.match(text(window, '.dialog .totals'), /免運/);
  click(window, '[data-cart-qty="p01-ivory-m"][data-value="1"]');
  assert.equal(text(window, '#header .count'), '2');
  click(window, '[data-action="checkout"]');
  await settle();
  assert.equal(window.location.hash, '#checkout');

  click(window, '#checkout-form button[type="submit"]');
  assert.match(text(window, '[data-error="name"]'), /姓名/);
  assert.match(text(window, '[data-error="phone"]'), /手機/);
  assert.match(text(window, '[data-error="store"]'), /門市/);
  assert.equal(get(window, '#checkout-form [name="name"]').getAttribute('aria-invalid'), 'true');
  assert.equal(text(window, '#header .count'), '2');

  click(window, '[data-action="fill-demo"]');
  assert.equal(get(window, '#checkout-form [name="email"]').value, 'demo@example.com');
  click(window, '#checkout-form [name="method"][value="cod"]');
  click(window, '#checkout-form button[type="submit"]');
  await settle();
  assert.match(window.location.hash, /^#order\/DEMO-/);
  assert.match(text(window, '#main h1'), /模擬訂單已建立/);
  assert.match(text(window, '#main .definition'), /備貨中.*取貨時付款/);
  assert.match(text(window, '#main .notice'), /到齊後整單寄出.*14 天/);
  assert.equal(text(window, '#header .count'), '0');
  const orderHash = window.location.hash;
  const orderId = orderHash.slice('#order/'.length);

  click(window, '#header [data-action="member"]');
  assert.match(text(window, '.member-dialog'), /沒有真實帳號.*身分驗證/);
  assert.ok(text(window, '.member-dialog').includes(orderId));
  click(window, '[data-action="demo-login"]');
  assert.equal(get(window, '#header [data-action="member"]').getAttribute('aria-label'), '展示會員');

  const reloaded = fixture(t, { hash: orderHash, storage: storageSnapshot(window) });
  assert.match(text(reloaded, '#main h1'), /模擬訂單已建立/);
  assert.ok(text(reloaded, '#main .definition').includes(orderId));
  assert.equal(text(reloaded, '#header .count'), '0');
  assert.equal(get(reloaded, '#header [data-action="member"]').getAttribute('aria-label'), '展示會員');

  click(reloaded, '#main a[href="#admin"]');
  await settle();
  click(reloaded, '[data-admin-tab="inventory"]');
  assert.equal(quota(reloaded, 'p01-ivory-m'), 3);
  assert.equal(quota(reloaded, 'p01-oat-m'), 7);
  click(reloaded, '[data-admin-tab="orders"]');
  reloaded.confirm = () => false;
  click(reloaded, `[data-cancel="${orderId}"]`);
  assert.match(text(reloaded, '.admin-table tbody'), /備貨中.*取貨時付款/);
  assert.equal(get(reloaded, `[data-cancel="${orderId}"]`).disabled, false);
  reloaded.confirm = () => true;
  click(reloaded, `[data-cancel="${orderId}"]`);
  assert.match(text(reloaded, '.admin-table tbody'), /已取消/);
  assert.equal(get(reloaded, `[data-cancel="${orderId}"]`).disabled, true);
  click(reloaded, `[data-cancel="${orderId}"]`);
  click(reloaded, '[data-admin-tab="inventory"]');
  assert.equal(quota(reloaded, 'p01-ivory-m'), 4);
  assert.equal(quota(reloaded, 'p01-oat-m'), 8);

  get(reloaded, '[data-stock-form="p08-gold-f"] input').value = '0';
  click(reloaded, '[data-stock-form="p08-gold-f"] button[type="submit"]');
  assert.match(text(reloaded, '#toast'), /配額已儲存/);
  assert.equal(quota(reloaded, 'p08-gold-f'), 0);

  const edited = fixture(t, { hash: '#shop', storage: storageSnapshot(reloaded) });
  click(edited, '[data-product="p08"]');
  click(edited, '[data-color="金色"]');
  assert.match(text(edited, '.availability'), /售罄/);
  assert.equal(get(edited, '[data-action="add"]').disabled, true);
  click(edited, '[data-action="close"]');
  click(edited, '#header [data-action="member"]');
  assert.ok(text(edited, '.member-dialog').includes(`${orderId} · 已取消`));
  click(edited, '[data-action="demo-login"]');
  assert.equal(get(edited, '#header [data-action="member"]').getAttribute('aria-label'), '會員登入展示');
});

test('inventory changes prevent checkout of an unavailable cart and a cart item can be removed', async t => {
  const window = fixture(t);
  click(window, '[data-product="p08"]');
  assert.match(text(window, '.availability'), /可購買 1 件/);
  click(window, '[data-action="add"]');
  click(window, '[data-product="p08"]');
  click(window, '[data-action="add"]');
  assert.match(text(window, '#toast'), /最多可購買 1 件/);
  assert.equal(text(window, '#header .count'), '1');
  click(window, '[data-action="close"]');
  click(window, '#footer a[href="#admin"]');
  await settle();
  click(window, '[data-admin-tab="inventory"]');
  get(window, '[data-stock-form="p08-gold-f"] input').value = '0';
  click(window, '[data-stock-form="p08-gold-f"] button[type="submit"]');
  click(window, '#header [data-action="cart"]');
  assert.match(text(window, '.dialog .error'), /可購買數量不足/);
  assert.equal(get(window, '[data-action="checkout"]').disabled, true);
  click(window, '[data-cart-qty="p08-gold-f"][data-value="0"]');
  assert.match(text(window, '.dialog .empty'), /購物袋還空著/);
  assert.equal(text(window, '#header .count'), '0');
});

test('checkout keeps recipient and COD draft when the shopping bag quantity changes', async t => {
  const window = fixture(t);
  click(window, '[data-product="p01"]');
  click(window, '[data-action="add"]');
  click(window, '#header [data-action="cart"]');
  click(window, '[data-action="checkout"]');
  await settle();
  click(window, '[data-action="fill-demo"]');
  click(window, '#checkout-form [name="method"][value="cod"]');
  click(window, '.checkout-summary [data-action="cart"]');
  click(window, '[data-cart-qty="p01-ivory-s"][data-value="2"]');
  click(window, '[data-action="close"]');
  assert.equal(get(window, '#checkout-form [name="name"]').value, '示意收件人');
  assert.equal(get(window, '#checkout-form [name="email"]').value, 'demo@example.com');
  assert.match(get(window, '#checkout-form [name="store"]').value, /衣序示意門市/);
  assert.equal(get(window, '#checkout-form [name="method"][value="cod"]').checked, true);
  assert.match(text(window, '.checkout-summary .grand'), /1,845/);
});

test('a lowered inventory quota lets a shopper reduce an excessive cart to the available amount', async t => {
  const window = fixture(t);
  click(window, '[data-product="p01"]');
  for (let quantity = 1; quantity < 5; quantity++) click(window, '[data-qty="1"]');
  click(window, '[data-action="add"]');
  click(window, '#footer a[href="#admin"]');
  await settle();
  click(window, '[data-admin-tab="inventory"]');
  get(window, '[data-stock-form="p01-ivory-s"] input').value = '1';
  click(window, '[data-stock-form="p01-ivory-s"] button[type="submit"]');
  click(window, '#header [data-action="cart"]');
  click(window, '[data-cart-qty="p01-ivory-s"][aria-label^="減少"]');
  assert.equal(text(window, '#header .count'), '1');
  assert.equal(get(window, '[data-action="checkout"]').disabled, false);
});

test('successive product deep links display the requested product and keep its URL', async t => {
  const window = fixture(t, { hash: '#product/p01' });
  assert.match(text(window, '.dialog h2'), /奶油圓領針織/);
  window.location.hash = '#product/p02';
  await settle();
  assert.equal(window.location.hash, '#product/p02');
  assert.match(text(window, '.dialog h2'), /淺杏直筒長褲/);
  window.location.hash = '#product/p03';
  await settle();
  assert.equal(window.location.hash, '#product/p03');
  assert.match(text(window, '.dialog h2'), /米白半開襟襯衫/);
  click(window, '[data-action="close"]');
  assert.equal(window.location.hash, '#shop');
  assert.equal(window.document.querySelector('[role="dialog"]'), null);
});

test('product dialog traps keyboard focus and preserves the focused control after choosing options', t => {
  const window = fixture(t);
  const trigger = get(window, '[data-product="p01"]');
  trigger.focus();
  trigger.click();
  assert.equal(window.document.activeElement, get(window, '[role="dialog"]'));
  const key = (name, shiftKey = false) => {
    const event = new window.KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
    window.document.dispatchEvent(event);
    return event;
  };
  assert.equal(key('Tab', true).defaultPrevented, true);
  assert.equal(window.document.activeElement, get(window, '.dialog summary'));
  assert.equal(key('Tab').defaultPrevented, true);
  assert.equal(window.document.activeElement, get(window, '.dialog [data-action="close"]'));
  assert.equal(key('Tab', true).defaultPrevented, true);
  assert.equal(window.document.activeElement, get(window, '.dialog summary'));

  get(window, '[data-color="燕麥"]').focus();
  click(window, '[data-color="燕麥"]');
  assert.equal(window.document.activeElement, get(window, '[data-color="燕麥"]'));
  get(window, '[data-variant="p01-oat-m"]').focus();
  click(window, '[data-variant="p01-oat-m"]');
  assert.equal(window.document.activeElement, get(window, '[data-variant="p01-oat-m"]'));
  get(window, '[data-qty="1"]').focus();
  click(window, '[data-qty="1"]');
  assert.equal(text(window, '#detail-quantity'), '2');
  assert.equal(window.document.activeElement, get(window, '[data-qty="1"]'));
  key('Escape');
  assert.equal(window.document.querySelector('[role="dialog"]'), null);
  assert.equal(window.document.activeElement, trigger);
});
