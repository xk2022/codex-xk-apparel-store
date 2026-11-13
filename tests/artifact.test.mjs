import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { setTimeout as delay } from 'node:timers/promises';
import { Window } from 'happy-dom';

const review = await readFile(new URL('../review.html', import.meta.url), 'utf8');

test('offline review contains runnable classic scripts and no external styles or scripts', () => {
  assert.doesNotMatch(review, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(review, /<script\b[^>]*\btype\s*=\s*["']module["']/i);
  assert.doesNotMatch(review, /<link\b[^>]*\brel\s*=\s*["']stylesheet["']/i);
  const scripts = [...review.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 2, 'asset map and application scripts must be embedded');
  for (const [, script] of scripts) assert.doesNotThrow(() => new Script(script));
  assert.match(review, /<style>[\s\S]+<\/style>/);
});

test('all nine local JPEGs are embedded byte for byte in the offline deliverable', async () => {
  const assetMap = /window\.__DEMO_ASSETS__\s*=\s*(\{[\s\S]*?\});/.exec(review);
  assert.ok(assetMap, 'offline image lookup must be present');
  const images = JSON.parse(assetMap[1]);
  const expected = ['hero.jpg', ...Array.from({ length: 8 }, (_, index) => `product-${String(index + 1).padStart(2, '0')}.jpg`)];
  assert.equal(Object.keys(images).length, expected.length);
  for (const filename of expected) {
    const dataUrl = images[`assets/${filename}`];
    assert.match(dataUrl, /^data:image\/jpeg;base64,/);
    const embedded = Buffer.from(dataUrl.split(',')[1], 'base64');
    const local = await readFile(new URL(`../assets/${filename}`, import.meta.url));
    assert.deepEqual(embedded, local, `${filename} must be available without network access`);
  }
});

test('delivered source has no remote resource or transaction client', async () => {
  const app = await readFile(new URL('../src/app.ts', import.meta.url), 'utf8');
  const model = await readFile(new URL('../src/model.ts', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch([app, model, styles, html].join('\n'), /https?:\/\/|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\s*\(|\bsendBeacon\s*\(/);
  assert.match(html, /模擬交易/);
  assert.match(app, /不填卡號、不會扣款/);
});

test('file URL review executes embedded scripts and supports choosing a variant and adding to cart offline', async t => {
  const window = new Window({
    url: new URL('../review.html', import.meta.url).href,
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      enableImageFileLoading: false,
    },
  });
  t.after(() => window.happyDOM.close());
  window.fetch = () => assert.fail('offline review must not make fetch requests');
  window.XMLHttpRequest = class {
    constructor() { assert.fail('offline review must not make XMLHttpRequest requests'); }
  };
  const scripts = [...review.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  // Execute the actual delivered inline scripts once, in document order.
  window.document.write(review.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
  for (const [, script] of scripts) window.eval(script);
  assert.equal(window.location.protocol, 'file:');
  assert.equal(window.document.querySelectorAll('.product-card').length, 8);
  const assertEmbeddedImages = () => {
    const images = [...window.document.querySelectorAll('img')];
    assert.ok(images.length > 0);
    for (const image of images) assert.match(image.getAttribute('src'), /^data:image\/jpeg;base64,/);
  };
  assertEmbeddedImages();
  const get = selector => {
    const element = window.document.querySelector(selector);
    assert.ok(element, `Expected ${selector} in the offline review`);
    return element;
  };
  get('.product-card .product-photo').click();
  await delay(20); // happy-dom queues hash navigation.
  get('[data-variant="p01-ivory-m"]').click();
  assert.equal(get('[data-variant="p01-ivory-m"]').getAttribute('aria-pressed'), 'true');
  get('[data-qty="1"]').click();
  assert.equal(get('#detail-quantity').textContent.trim(), '2');
  get('[data-action="add"]').click();
  assert.equal(get('#header .count').textContent.trim(), '2');
  get('#header [data-action="cart"]').click();
  assert.equal(window.document.querySelectorAll('.cart-item').length, 1);
  assert.match(get('.cart-item').textContent, /奶油圓領針織/);
  assert.match(get('.cart-item').textContent, /奶油白\s*\/\s*M/);
  assert.equal(get('.cart-item .quantity span').textContent.trim(), '2');
  assertEmbeddedImages();
});
