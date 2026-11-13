import { PRODUCTS, cloneProducts, findProductByVariant } from "./catalog.js";
const SHIPPING_FEE = 65;
const FREE_SHIPPING_THRESHOLD = 2e3;
const SHIPPING_NOTICE = "\u73FE\u8CA8\u8207\u9810\u8CFC\u6DF7\u55AE\uFF0C\u7B49\u9810\u8CFC\u5230\u9F4A\u5F8C\u6574\u55AE\u5BC4\u51FA\uFF0C\u4E00\u6B21\u904B\u8CBB\u3002";
const PROTOTYPE_NOTICE = "\u5C55\u793A\u7248\uFF5C\u5047\u5546\u54C1\u8207\u6A21\u64EC\u4ED8\u6B3E\uFF0C\u4E0D\u6703\u6263\u6B3E\u6216\u5BC4\u51FA\u5546\u54C1\u3002";
const ORDER_STATUS_LABELS = { preparing: "\u5099\u8CA8\u4E2D", shipped: "\u5DF2\u51FA\u8CA8", completed: "\u5DF2\u5B8C\u6210", cancelled: "\u5DF2\u53D6\u6D88" };
const PAYMENT_STATUS_LABELS = { simulated_paid: "\u6A21\u64EC\u4ED8\u6B3E\u6210\u529F", cod_pending: "\u53D6\u8CA8\u6642\u4ED8\u6B3E", simulated_refunded: "\u6A21\u64EC\u9000\u6B3E\u5B8C\u6210", cancelled: "\u5DF2\u53D6\u6D88\u4ED8\u6B3E" };
class StoreModelError extends Error {
  constructor(message) {
    super(message);
    this.name = "StoreModelError";
  }
}
function validQuantity(quantity) {
  return Number.isSafeInteger(quantity) && quantity > 0;
}
function normalizeCart(cart) {
  if (!Array.isArray(cart)) throw new StoreModelError("\u8CFC\u7269\u8ECA\u8CC7\u6599\u683C\u5F0F\u4E0D\u6B63\u78BA\uFF0C\u8ACB\u91CD\u8A2D\u5C55\u793A\u8CC7\u6599\u3002");
  const merged = /* @__PURE__ */ new Map();
  for (const line of cart) {
    if (!line || typeof line.variantId !== "string" || !line.variantId.trim() || !validQuantity(line.quantity)) {
      throw new StoreModelError("\u5546\u54C1\u6578\u91CF\u5FC5\u9808\u70BA\u5927\u65BC\u96F6\u7684\u6574\u6578\u3002");
    }
    const quantity = (merged.get(line.variantId) ?? 0) + line.quantity;
    if (!Number.isSafeInteger(quantity)) throw new StoreModelError("\u5546\u54C1\u6578\u91CF\u8D85\u51FA\u53EF\u8655\u7406\u7BC4\u570D\u3002");
    merged.set(line.variantId, quantity);
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}
function getCartSummary(cart, products = PRODUCTS) {
  const result = { lines: [], subtotal: 0, shipping: 0, total: 0, itemCount: 0, isMixed: false, hasPreorder: false, leadDays: 0, issues: [], canCheckout: false };
  let normalized;
  try {
    normalized = normalizeCart(cart);
  } catch (error) {
    result.issues.push(error instanceof Error ? error.message : "\u8CFC\u7269\u8ECA\u8CC7\u6599\u4E0D\u6B63\u78BA\u3002");
    return result;
  }
  let hasInStock = false;
  for (const line of normalized) {
    const found = findProductByVariant(line.variantId, products);
    if (!found) {
      result.issues.push("\u6709\u5546\u54C1\u5DF2\u4E0D\u5B58\u5728\uFF0C\u8ACB\u79FB\u9664\u5F8C\u518D\u7D50\u5E33\u3002");
      continue;
    }
    const { product, variant } = found;
    const validStock = Number.isSafeInteger(variant.stock) && variant.stock >= 0;
    const available = validStock && line.quantity <= variant.stock;
    if (!available) result.issues.push(`${product.name}\uFF08${variant.color}\uFF0F${variant.size}\uFF09\u53EF\u8CFC\u8CB7\u6578\u91CF\u4E0D\u8DB3\u3002`);
    if (!Number.isSafeInteger(product.price) || product.price < 0) {
      result.issues.push(`${product.name}\u7684\u793A\u610F\u50F9\u683C\u8CC7\u6599\u4E0D\u6B63\u78BA\u3002`);
      continue;
    }
    const lineTotal = product.price * line.quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(result.subtotal + lineTotal)) {
      result.issues.push("\u8A02\u55AE\u91D1\u984D\u8D85\u51FA\u53EF\u8655\u7406\u7BC4\u570D\u3002");
      continue;
    }
    if (!Number.isSafeInteger(result.itemCount + line.quantity)) {
      result.issues.push("\u8A02\u55AE\u5546\u54C1\u7E3D\u6578\u8D85\u51FA\u53EF\u8655\u7406\u7BC4\u570D\u3002");
      continue;
    }
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
function updateQuantity(cart, variantId, quantity, products = PRODUCTS) {
  const normalized = normalizeCart(cart);
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new StoreModelError("\u5546\u54C1\u6578\u91CF\u5FC5\u9808\u70BA\u96F6\u6216\u6B63\u6574\u6578\u3002");
  if (quantity === 0) return normalized.filter((line) => line.variantId !== variantId);
  const found = findProductByVariant(variantId, products);
  if (!found) throw new StoreModelError("\u627E\u4E0D\u5230\u9019\u500B\u5546\u54C1\u898F\u683C\u3002");
  if (!Number.isSafeInteger(found.variant.stock) || quantity > found.variant.stock) throw new StoreModelError(`\u6B64\u898F\u683C\u6700\u591A\u53EF\u8CFC\u8CB7 ${Math.max(0, found.variant.stock)} \u4EF6\u3002`);
  const index = normalized.findIndex((line) => line.variantId === variantId);
  return index < 0 ? [...normalized, { variantId, quantity }] : normalized.map((line, i) => i === index ? { variantId, quantity } : line);
}
function addToCart(cart, variantId, quantity = 1, products = PRODUCTS) {
  if (!validQuantity(quantity)) throw new StoreModelError("\u52A0\u5165\u6578\u91CF\u5FC5\u9808\u70BA\u6B63\u6574\u6578\u3002");
  const normalized = normalizeCart(cart);
  const current = normalized.find((line) => line.variantId === variantId)?.quantity ?? 0;
  return updateQuantity(normalized, variantId, current + quantity, products);
}
function validateCheckout(details) {
  const errors = {};
  if (!details || typeof details !== "object") return { valid: false, errors: { name: "\u8ACB\u586B\u5BEB\u6536\u4EF6\u8CC7\u6599\u3002" } };
  if (typeof details.name !== "string" || !details.name.trim() || details.name.trim().length > 60) errors.name = "\u8ACB\u586B\u5BEB\u6536\u4EF6\u4EBA\u59D3\u540D\uFF0860 \u5B57\u4EE5\u5167\uFF09\u3002";
  if (typeof details.phone !== "string" || !/^09\d{8}$/.test(details.phone.replace(/[\s-]/g, ""))) errors.phone = "\u8ACB\u586B\u5BEB\u6B63\u78BA\u7684\u53F0\u7063\u624B\u6A5F\u865F\u78BC\uFF0C\u4F8B\u5982 0912345678\u3002";
  if (typeof details.email !== "string" || details.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) errors.email = "\u8ACB\u586B\u5BEB\u6B63\u78BA\u7684 Email\uFF0C\u4F5C\u70BA\u5C55\u793A\u7528\u8A02\u55AE\u8CC7\u6599\u3002";
  if (typeof details.store !== "string" || !details.store.trim() || details.store.trim().length > 120) errors.store = "\u8ACB\u9078\u64C7\u6216\u586B\u5BEB\u53D6\u8CA8\u9580\u5E02\u3002";
  if (details.method !== "card" && details.method !== "cod") errors.method = "\u8ACB\u9078\u64C7\u6A21\u64EC\u4FE1\u7528\u5361\u6216\u8D85\u5546\u53D6\u8CA8\u4ED8\u6B3E\u3002";
  return { valid: Object.keys(errors).length === 0, errors };
}
function createMockOrder(cart, details, products = PRODUCTS, meta) {
  if (!meta || typeof meta.id !== "string" || !meta.id.trim() || typeof meta.createdAt !== "string" || Number.isNaN(Date.parse(meta.createdAt))) throw new StoreModelError("\u5C55\u793A\u8A02\u55AE\u8B58\u5225\u6216\u6642\u9593\u4E0D\u6B63\u78BA\u3002");
  const orderId = meta.id.trim();
  const existing = meta.existingOrders?.find((order2) => order2.id === orderId);
  if (existing) return { order: existing, products: cloneProducts(products) };
  const validation = validateCheckout(details);
  if (!validation.valid) throw new StoreModelError(Object.values(validation.errors)[0] ?? "\u8ACB\u78BA\u8A8D\u6536\u4EF6\u8CC7\u6599\u3002");
  const summary = getCartSummary(cart, products);
  if (!summary.canCheckout) throw new StoreModelError(summary.issues[0] ?? "\u8CFC\u7269\u8ECA\u5C1A\u672A\u52A0\u5165\u5546\u54C1\u3002");
  const nextProducts = cloneProducts(products);
  for (const line of summary.lines) {
    const variant = findProductByVariant(line.variantId, nextProducts).variant;
    variant.stock -= line.quantity;
  }
  const order = {
    id: orderId,
    createdAt: meta.createdAt,
    status: "preparing",
    paymentStatus: details.method === "cod" ? "cod_pending" : "simulated_paid",
    method: details.method,
    customer: { ...details, name: details.name.trim(), phone: details.phone.replace(/[\s-]/g, ""), email: details.email.trim(), store: details.store.trim() },
    items: summary.lines.map((line) => ({ variantId: line.variantId, productId: line.product.id, name: line.product.name, image: line.product.image, color: line.variant.color, size: line.variant.size, price: line.product.price, unitPrice: line.product.price, quantity: line.quantity, lineTotal: line.lineTotal, preorder: line.variant.preorder, leadDays: line.variant.leadDays })),
    subtotal: summary.subtotal,
    shipping: summary.shipping,
    total: summary.total,
    itemCount: summary.itemCount,
    leadDays: summary.leadDays,
    isMixed: summary.isMixed,
    hasPreorder: summary.hasPreorder,
    notice: SHIPPING_NOTICE,
    stockRestored: false,
    simulated: true
  };
  return { order, products: nextProducts };
}
function cancelMockOrder(order, products = PRODUCTS) {
  if (order.status === "cancelled" || order.stockRestored) return { order, products: cloneProducts(products), restocked: false };
  if (order.status !== "preparing") throw new StoreModelError("\u5DF2\u51FA\u8CA8\u6216\u5DF2\u5B8C\u6210\u7684\u8A02\u55AE\uFF0C\u8ACB\u5148\u8D70\u9000\u8CA8\u6D41\u7A0B\uFF0C\u4E0D\u80FD\u76F4\u63A5\u56DE\u88DC\u5EAB\u5B58\u3002");
  const items = normalizeCart(order.items);
  for (const item of items) {
    const found = findProductByVariant(item.variantId, products);
    if (!found || !Number.isSafeInteger(found.variant.stock + item.quantity)) throw new StoreModelError("\u5546\u54C1\u8CC7\u6599\u5DF2\u8B8A\u66F4\uFF0C\u8ACB\u5148\u6838\u5C0D\u5F8C\u518D\u53D6\u6D88\u3002");
  }
  const nextProducts = cloneProducts(products);
  for (const item of items) findProductByVariant(item.variantId, nextProducts).variant.stock += item.quantity;
  return { order: { ...order, status: "cancelled", paymentStatus: order.method === "card" ? "simulated_refunded" : "cancelled", stockRestored: true }, products: nextProducts, restocked: true };
}
export {
  FREE_SHIPPING_THRESHOLD,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PROTOTYPE_NOTICE,
  SHIPPING_FEE,
  SHIPPING_NOTICE,
  StoreModelError,
  addToCart,
  cancelMockOrder,
  createMockOrder,
  getCartSummary,
  normalizeCart,
  updateQuantity,
  validateCheckout
};
//# sourceMappingURL=model.js.map
