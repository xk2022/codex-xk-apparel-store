import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, cloneProducts, findProductByVariant } from '../dist/assets/catalog.js';
import { normalizeCart, getCartSummary, addToCart, updateQuantity, validateCheckout, createMockOrder, cancelMockOrder } from '../dist/assets/model.js';

const details = { name:'展示收件人', phone:'0912345678', email:'demo@example.com', store:'7-ELEVEN 示意門市', method:'card' };
const meta = (id='DEMO-001') => ({ id, createdAt:'2026-11-13T03:00:00.000Z' });
const fixture = (price=1000,stock=3) => [{ id:'p',slug:'p',name:'示意商品',category:'上身',price,image:'assets/product-01.jpg',images:[],description:'',material:'',fit:'',variants:[{id:'sku',color:'白',colorHex:'#fff',size:'M',stock,preorder:false,leadDays:2}] }];

test('cart merges duplicate SKU and rejects invalid quantities', () => {
  assert.deepEqual(normalizeCart([{variantId:'sku',quantity:1},{variantId:'sku',quantity:2}]),[{variantId:'sku',quantity:3}]);
  for (const quantity of [0,-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>normalizeCart([{variantId:'sku',quantity}]));
  assert.throws(()=>normalizeCart([{variantId:'sku',quantity:Number.MAX_SAFE_INTEGER},{variantId:'sku',quantity:1}]));
});

test('shipping is once per order, zero for empty cart and at the free-shipping threshold', () => {
  assert.equal(getCartSummary([]).shipping,0);
  assert.equal(getCartSummary([{variantId:'sku',quantity:1}],fixture(1999)).shipping,65);
  assert.equal(getCartSummary([{variantId:'sku',quantity:1}],fixture(2000)).shipping,0);
});

test('total item count cannot overflow even when zero-price lines have safe quantities', () => {
  const products=fixture(0,Number.MAX_SAFE_INTEGER);
  products.push({...products[0],id:'p2',slug:'p2',variants:[{...products[0].variants[0],id:'sku2'}]});
  const cart=[{variantId:'sku',quantity:Number.MAX_SAFE_INTEGER},{variantId:'sku2',quantity:Number.MAX_SAFE_INTEGER}];
  const summary=getCartSummary(cart,products);
  assert.equal(summary.canCheckout,false);
  assert.ok(Number.isSafeInteger(summary.itemCount));
  assert.ok(summary.issues.some(issue=>issue.includes('商品總數')));
  assert.throws(()=>createMockOrder(cart,details,products,meta()));
  assert.ok(products.every(product=>product.variants[0].stock===Number.MAX_SAFE_INTEGER));
});

test('mixed cart waits for longest preorder lead time and ships once', () => {
  const summary=getCartSummary([{variantId:'p01-ivory-s',quantity:1},{variantId:'p04-white-f',quantity:1},{variantId:'p01-oat-s',quantity:1}]);
  assert.equal(summary.isMixed,true);
  assert.equal(summary.hasPreorder,true);
  assert.equal(summary.leadDays,14);
  assert.equal(summary.shipping,0);
  assert.equal(summary.itemCount,3);
});

test('invalid SKU and unavailable variants prevent checkout, including repeated SKU over stock', () => {
  assert.equal(getCartSummary([{variantId:'not-real',quantity:1}]).canCheckout,false);
  assert.equal(getCartSummary([{variantId:'p07-black-f',quantity:1}]).canCheckout,false);
  assert.equal(getCartSummary([{variantId:'sku',quantity:2},{variantId:'sku',quantity:2}],fixture(1000,3)).canCheckout,false);
});

test('add and quantity update enforce finite stock for preorder too', () => {
  const cart=addToCart([], 'p01-oat-s',8);
  assert.throws(()=>addToCart(cart,'p01-oat-s',1));
  assert.deepEqual(updateQuantity(cart,'p01-oat-s',0),[]);
  assert.throws(()=>updateQuantity(cart,'p01-oat-s',-1));
});

test('guest checkout validates contact and payment details without requiring an account', () => {
  assert.equal(validateCheckout(details).valid,true);
  assert.equal(validateCheckout({...details,method:'cod'}).valid,true);
  const invalid=validateCheckout({...details,phone:'123',email:'no-email',store:''});
  assert.equal(invalid.valid,false);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.store);
});

test('order creation is atomic and never mutates input inventory', () => {
  const products=cloneProducts();
  const before=JSON.stringify(products);
  assert.throws(()=>createMockOrder([{variantId:'p01-ivory-s',quantity:1},{variantId:'p07-black-f',quantity:1}],details,products,meta()));
  assert.equal(JSON.stringify(products),before);
  const result=createMockOrder([{variantId:'p01-ivory-s',quantity:1},{variantId:'p01-ivory-s',quantity:1}],details,products,meta());
  assert.equal(findProductByVariant('p01-ivory-s',products).variant.stock,6);
  assert.equal(findProductByVariant('p01-ivory-s',result.products).variant.stock,4);
  assert.equal(result.order.items.length,1);
  assert.equal(result.order.items[0].quantity,2);
  assert.equal(result.order.simulated,true);
});

test('a second sequential order cannot purchase the last unit after the first order', () => {
  const products=fixture(1000,1);
  const first=createMockOrder([{variantId:'sku',quantity:1}],details,products,meta('first'));
  assert.equal(first.products[0].variants[0].stock,0);
  assert.throws(()=>createMockOrder([{variantId:'sku',quantity:1}],details,first.products,meta('second')));
});

test('order preserves price and variant snapshots after catalog changes', () => {
  const result=createMockOrder([{variantId:'sku',quantity:1}],details,fixture(990,2),meta());
  result.products[0].price=9999;
  result.products[0].name='改名';
  assert.equal(result.order.items[0].unitPrice,990);
  assert.equal(result.order.items[0].name,'示意商品');
  assert.equal(result.order.total,1055);
});

test('retrying an existing mock order ID does not deduct inventory again', () => {
  const first=createMockOrder([{variantId:'sku',quantity:1}],details,fixture(1000,2),meta(' DEMO-001 '));
  assert.equal(first.order.id,'DEMO-001');
  const retry=createMockOrder([{variantId:'sku',quantity:1}],details,first.products,{...meta(' DEMO-001 '),existingOrders:[first.order]});
  assert.equal(retry.order,first.order);
  assert.equal(retry.products[0].variants[0].stock,1);
});

test('cancellation restocks once and simulates refund without actual payment', () => {
  const first=createMockOrder([{variantId:'sku',quantity:1}],details,fixture(1000,2),meta());
  const cancelled=cancelMockOrder(first.order,first.products);
  assert.equal(cancelled.restocked,true);
  assert.equal(cancelled.products[0].variants[0].stock,2);
  assert.equal(cancelled.order.paymentStatus,'simulated_refunded');
  const again=cancelMockOrder(cancelled.order,cancelled.products);
  assert.equal(again.restocked,false);
  assert.equal(again.products[0].variants[0].stock,2);
});

test('COD remains unpaid while preparing and shipped orders cannot cancel as unshipped', () => {
  const result=createMockOrder([{variantId:'sku',quantity:1}],{...details,method:'cod'},fixture(1000,2),meta());
  assert.equal(result.order.paymentStatus,'cod_pending');
  assert.equal(result.order.status,'preparing');
  assert.equal(result.products[0].variants[0].stock,1);
  assert.throws(()=>cancelMockOrder({...result.order,status:'shipped'},result.products));
  const cancelled=cancelMockOrder(result.order,result.products);
  assert.equal(cancelled.order.paymentStatus,'cancelled');
});

test('cancellation with a missing SKU leaves every other SKU unchanged', () => {
  const first=createMockOrder([{variantId:'p01-ivory-s',quantity:1},{variantId:'p08-gold-f',quantity:1}],details,cloneProducts(),meta());
  const changed=first.products.filter(product=>product.id!=='p08');
  const before=JSON.stringify(changed);
  assert.throws(()=>cancelMockOrder(first.order,changed));
  assert.equal(JSON.stringify(changed),before);
  assert.equal(first.order.status,'preparing');
  assert.equal(first.order.stockRestored,false);
});

test('every demo product and variant has stable distinct IDs and bounded stock', () => {
  assert.equal(PRODUCTS.length,8);
  const ids=PRODUCTS.flatMap(product=>product.variants.map(variant=>variant.id));
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(PRODUCTS.every(product=>product.variants.every(variant=>Number.isSafeInteger(variant.stock)&&variant.stock>=0)));
});
