import { PRODUCTS, cloneProducts, findProductByVariant, type Product, type Variant } from './catalog.js';

export type { Product, Variant } from './catalog.js';

/** 運費與免運門檻是可調整的原型假設，尚未經店家確認。 */
export const SHIPPING_FEE = 65;
export const FREE_SHIPPING_THRESHOLD = 2000;
export const SHIPPING_NOTICE = '現貨與預購混單，等預購到齊後整單寄出，一次運費。';
export const PROTOTYPE_NOTICE = '展示版｜假商品與模擬付款，不會扣款或寄出商品。';

export interface CartLine { variantId: string; quantity: number }
export interface ResolvedCartLine extends CartLine {
  product: Product;
  variant: Variant;
  lineTotal: number;
  available: boolean;
  stockLimit: number;
}
export interface CartSummary {
  lines: ResolvedCartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  itemCount: number;
  isMixed: boolean;
  hasPreorder: boolean;
  leadDays: number;
  issues: string[];
  canCheckout: boolean;
}
export type PaymentMethod = 'card' | 'cod';
export interface CheckoutDetails { name: string; phone: string; email: string; store: string; method: PaymentMethod }
export interface CheckoutValidation { valid: boolean; errors: Partial<Record<keyof CheckoutDetails, string>> }
export interface OrderItem extends CartLine {
  productId: string;
  name: string;
  image: string;
  color: string;
  size: string;
  price: number;
  unitPrice: number;
  lineTotal: number;
  preorder: boolean;
  leadDays: number;
}
export type OrderStatus = 'preparing' | 'shipped' | 'completed' | 'cancelled';
export type PaymentStatus = 'simulated_paid' | 'cod_pending' | 'simulated_refunded' | 'cancelled';
export interface MockOrder {
  id: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  method: PaymentMethod;
  customer: CheckoutDetails;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  itemCount: number;
  leadDays: number;
  isMixed: boolean;
  hasPreorder: boolean;
  notice: string;
  stockRestored: boolean;
  simulated: true;
}
export interface OrderMeta { id: string; createdAt: string; existingOrders?: readonly MockOrder[] }

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = { preparing: '備貨中', shipped: '已出貨', completed: '已完成', cancelled: '已取消' };
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = { simulated_paid: '模擬付款成功', cod_pending: '取貨時付款', simulated_refunded: '模擬退款完成', cancelled: '已取消付款' };

export class StoreModelError extends Error {
  constructor(message: string) { super(message); this.name = 'StoreModelError'; }
}

function validQuantity(quantity: number): boolean {
  return Number.isSafeInteger(quantity) && quantity > 0;
}

/** 合併重複 SKU，並拒絕會使庫存檢查失真的非法數量。 */
export function normalizeCart(cart: readonly CartLine[]): CartLine[] {
  if (!Array.isArray(cart)) throw new StoreModelError('購物車資料格式不正確，請重設展示資料。');
  const merged = new Map<string, number>();
  for (const line of cart) {
    if (!line || typeof line.variantId !== 'string' || !line.variantId.trim() || !validQuantity(line.quantity)) {
      throw new StoreModelError('商品數量必須為大於零的整數。');
    }
    const quantity = (merged.get(line.variantId) ?? 0) + line.quantity;
    if (!Number.isSafeInteger(quantity)) throw new StoreModelError('商品數量超出可處理範圍。');
    merged.set(line.variantId, quantity);
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function getCartSummary(cart: readonly CartLine[], products: readonly Product[] = PRODUCTS): CartSummary {
  const result: CartSummary = { lines: [], subtotal: 0, shipping: 0, total: 0, itemCount: 0, isMixed: false, hasPreorder: false, leadDays: 0, issues: [], canCheckout: false };
  let normalized: CartLine[];
  try { normalized = normalizeCart(cart); }
  catch (error) { result.issues.push(error instanceof Error ? error.message : '購物車資料不正確。'); return result; }
  let hasInStock = false;
  for (const line of normalized) {
    const found = findProductByVariant(line.variantId, products);
    if (!found) { result.issues.push('有商品已不存在，請移除後再結帳。'); continue; }
    const { product, variant } = found;
    const validStock = Number.isSafeInteger(variant.stock) && variant.stock >= 0;
    const available = validStock && line.quantity <= variant.stock;
    if (!available) result.issues.push(`${product.name}（${variant.color}／${variant.size}）可購買數量不足。`);
    if (!Number.isSafeInteger(product.price) || product.price < 0) { result.issues.push(`${product.name}的示意價格資料不正確。`); continue; }
    const lineTotal = product.price * line.quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(result.subtotal + lineTotal)) { result.issues.push('訂單金額超出可處理範圍。'); continue; }
    if (!Number.isSafeInteger(result.itemCount + line.quantity)) { result.issues.push('訂單商品總數超出可處理範圍。'); continue; }
    result.lines.push({ ...line, product, variant, lineTotal, available, stockLimit: validStock ? variant.stock : 0 });
    result.subtotal += lineTotal;
    result.itemCount += line.quantity;
    if (available) {
      result.hasPreorder ||= variant.preorder;
      hasInStock ||= !variant.preorder;
      result.leadDays = Math.max(result.leadDays, Number.isFinite(variant.leadDays) ? Math.max(0, variant.leadDays) : 0);
    }
  }
  result.isMixed = result.hasPreorder && hasInStock;
  result.shipping = result.lines.length > 0 && result.subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  result.total = result.subtotal + result.shipping;
  result.canCheckout = normalized.length > 0 && result.issues.length === 0 && result.lines.length === normalized.length;
  return result;
}

export function updateQuantity(cart: readonly CartLine[], variantId: string, quantity: number, products: readonly Product[] = PRODUCTS): CartLine[] {
  const normalized = normalizeCart(cart);
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new StoreModelError('商品數量必須為零或正整數。');
  if (quantity === 0) return normalized.filter((line) => line.variantId !== variantId);
  const found = findProductByVariant(variantId, products);
  if (!found) throw new StoreModelError('找不到這個商品規格。');
  if (!Number.isSafeInteger(found.variant.stock) || quantity > found.variant.stock) throw new StoreModelError(`此規格最多可購買 ${Math.max(0, found.variant.stock)} 件。`);
  const index = normalized.findIndex((line) => line.variantId === variantId);
  return index < 0 ? [...normalized, { variantId, quantity }] : normalized.map((line, i) => i === index ? { variantId, quantity } : line);
}

export function addToCart(cart: readonly CartLine[], variantId: string, quantity = 1, products: readonly Product[] = PRODUCTS): CartLine[] {
  if (!validQuantity(quantity)) throw new StoreModelError('加入數量必須為正整數。');
  const normalized = normalizeCart(cart);
  const current = normalized.find((line) => line.variantId === variantId)?.quantity ?? 0;
  return updateQuantity(normalized, variantId, current + quantity, products);
}

export function validateCheckout(details: CheckoutDetails): CheckoutValidation {
  const errors: CheckoutValidation['errors'] = {};
  if (!details || typeof details !== 'object') return { valid: false, errors: { name: '請填寫收件資料。' } };
  if (typeof details.name !== 'string' || !details.name.trim() || details.name.trim().length > 60) errors.name = '請填寫收件人姓名（60 字以內）。';
  if (typeof details.phone !== 'string' || !/^09\d{8}$/.test(details.phone.replace(/[\s-]/g, ''))) errors.phone = '請填寫正確的台灣手機號碼，例如 0912345678。';
  if (typeof details.email !== 'string' || details.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) errors.email = '請填寫正確的 Email，作為展示用訂單資料。';
  if (typeof details.store !== 'string' || !details.store.trim() || details.store.trim().length > 120) errors.store = '請選擇或填寫取貨門市。';
  if (details.method !== 'card' && details.method !== 'cod') errors.method = '請選擇模擬信用卡或超商取貨付款。';
  return { valid: Object.keys(errors).length === 0, errors };
}

/** 單次呼叫內先完整驗證再建立新快照；不提供跨分頁或真實後端交易保證。 */
export function createMockOrder(cart: readonly CartLine[], details: CheckoutDetails, products: readonly Product[] = PRODUCTS, meta: OrderMeta): { order: MockOrder; products: Product[] } {
  if (!meta || typeof meta.id !== 'string' || !meta.id.trim() || typeof meta.createdAt !== 'string' || Number.isNaN(Date.parse(meta.createdAt))) throw new StoreModelError('展示訂單識別或時間不正確。');
  const orderId = meta.id.trim();
  const existing = meta.existingOrders?.find((order) => order.id === orderId);
  if (existing) return { order: existing, products: cloneProducts(products) };
  const validation = validateCheckout(details);
  if (!validation.valid) throw new StoreModelError(Object.values(validation.errors)[0] ?? '請確認收件資料。');
  const summary = getCartSummary(cart, products);
  if (!summary.canCheckout) throw new StoreModelError(summary.issues[0] ?? '購物車尚未加入商品。');
  const nextProducts = cloneProducts(products);
  for (const line of summary.lines) {
    const variant = findProductByVariant(line.variantId, nextProducts)!.variant;
    variant.stock -= line.quantity;
  }
  const order: MockOrder = {
    id: orderId, createdAt: meta.createdAt, status: 'preparing',
    paymentStatus: details.method === 'cod' ? 'cod_pending' : 'simulated_paid', method: details.method,
    customer: { ...details, name: details.name.trim(), phone: details.phone.replace(/[\s-]/g, ''), email: details.email.trim(), store: details.store.trim() },
    items: summary.lines.map((line) => ({ variantId: line.variantId, productId: line.product.id, name: line.product.name, image: line.product.image, color: line.variant.color, size: line.variant.size, price: line.product.price, unitPrice: line.product.price, quantity: line.quantity, lineTotal: line.lineTotal, preorder: line.variant.preorder, leadDays: line.variant.leadDays })),
    subtotal: summary.subtotal, shipping: summary.shipping, total: summary.total, itemCount: summary.itemCount,
    leadDays: summary.leadDays, isMixed: summary.isMixed, hasPreorder: summary.hasPreorder,
    notice: SHIPPING_NOTICE, stockRestored: false, simulated: true,
  };
  return { order, products: nextProducts };
}

/** 只允許未出貨訂單取消，回補可購買配額一次；COD 未付款不會觸發自動取消。 */
export function cancelMockOrder(order: MockOrder, products: readonly Product[] = PRODUCTS): { order: MockOrder; products: Product[]; restocked: boolean } {
  if (order.status === 'cancelled' || order.stockRestored) return { order, products: cloneProducts(products), restocked: false };
  if (order.status !== 'preparing') throw new StoreModelError('已出貨或已完成的訂單，請先走退貨流程，不能直接回補庫存。');
  const items = normalizeCart(order.items);
  for (const item of items) {
    const found = findProductByVariant(item.variantId, products);
    if (!found || !Number.isSafeInteger(found.variant.stock + item.quantity)) throw new StoreModelError('商品資料已變更，請先核對後再取消。');
  }
  const nextProducts = cloneProducts(products);
  for (const item of items) findProductByVariant(item.variantId, nextProducts)!.variant.stock += item.quantity;
  return { order: { ...order, status: 'cancelled', paymentStatus: order.method === 'card' ? 'simulated_refunded' : 'cancelled', stockRestored: true }, products: nextProducts, restocked: true };
}
