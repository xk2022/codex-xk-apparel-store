export type FulfillmentType = "STOCK" | "PREORDER";
export const fulfillmentType = (value?: FulfillmentType): FulfillmentType => value === "PREORDER" ? "PREORDER" : "STOCK";
export interface PilotVariant {
  id: number;
  sku: string;
  color: string;
  size: string;
  available: boolean;
  preorderEnabled?: boolean;
  preorderAvailable?: boolean;
  preorderArrivalNote?: string;
}
export interface PilotProduct {
  id: number;
  styleNo: string;
  name: string;
  description: string;
  photoUrl: string;
  price: number;
  currency: "TWD";
  variants: PilotVariant[];
}
export interface ShippingPolicy {
  currency: "TWD";
  shippingFee: number;
  freeShippingThreshold: number;
  notice: string;
}
export interface PilotCustomer {
  name: string;
  phone: string;
  email: string;
  store: string;
}
export interface PilotDraft extends PilotCustomer {
  note: string;
}
export interface PilotRequest {
  customer: PilotCustomer;
  note: string;
  items: { variantId: number; quantity: number; fulfillmentType?: FulfillmentType }[];
}
export interface PendingCheckout {
  key: string;
  body: string;
}
export interface PilotOrder {
  id: number;
  orderNo: string;
  status: string;
  source: "STOREFRONT";
  currency: "TWD";
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentStatus: "TEST_ONLY";
  createdAt: string;
  shippingNotice?: string;
  items: {
    variantId: number;
    sku: string;
    styleNo: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    fulfillmentType?: FulfillmentType;
    preorderArrivalNote?: string;
  }[];
}
export class PilotApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "OFFLINE",
  ) {
    super(message);
    this.name = "PilotApiError";
  }
}
async function api<T>(
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      credentials: "same-origin",
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.code !== "0000")
      throw new PilotApiError(
        result?.message || "服務暫時無法使用，請稍後重試。",
        response.status,
        result?.code,
      );
    return result.data as T;
  } catch (error) {
    if (error instanceof PilotApiError) throw error;
    throw new PilotApiError(
      "連線中斷，尚未確認接單結果。購物袋與資料已保留，請重試原送出。",
    );
  } finally {
    clearTimeout(timeout);
  }
}
export async function loadCatalog(base: string) {
  const [products, policy] = await Promise.all([
    api<PilotProduct[]>(base, "/storefront/products"),
    api<ShippingPolicy>(base, "/storefront/shipping-policy"),
  ]);
  if (
    !Array.isArray(products) ||
    policy?.currency !== "TWD" ||
    !Number.isFinite(policy.shippingFee) ||
    !Number.isFinite(policy.freeShippingThreshold)
  )
    throw new PilotApiError("商品或運費資料格式不正確，請稍後再試。");
  return { products, policy };
}
export async function checkout(
  base: string,
  pending: PendingCheckout,
): Promise<PilotOrder> {
  const csrf = await api<{ token: string; headerName: string }>(
    base,
    "/auth/csrf",
  );
  const order = await api<PilotOrder>(base, "/storefront/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
      "Idempotency-Key": pending.key,
    },
    body: pending.body,
  });
  if (
    !order?.orderNo ||
    order.source !== "STOREFRONT" ||
    order.paymentStatus !== "TEST_ONLY" ||
    !Array.isArray(order.items)
  )
    throw new PilotApiError(
      "接單回應無法確認。請以原資料重試，系統會使用同一個識別碼。",
    );
  return order;
}
export function pendingCheckout(
  request: PilotRequest,
  existing?: PendingCheckout,
): PendingCheckout {
  const body = JSON.stringify(request);
  if (existing && sameCheckoutRequest(request, existing)) return existing;
  return { key: crypto.randomUUID(), body };
}

/** Missing fulfillment type in earlier pilot requests means STOCK. Never rewrite saved request bytes. */
export function sameCheckoutRequest(request: PilotRequest, existing?: PendingCheckout): boolean {
  if (!existing) return false;
  const canonical = (value: PilotRequest) => JSON.stringify({
    customer: { name: value.customer.name, phone: value.customer.phone, email: value.customer.email, store: value.customer.store },
    note: value.note,
    items: value.items.map(item => ({ variantId: item.variantId, quantity: item.quantity, fulfillmentType: fulfillmentType(item.fulfillmentType) }))
      .sort((a, b) => a.variantId - b.variantId || a.fulfillmentType.localeCompare(b.fulfillmentType))
  });
  try { return canonical(request) === canonical(JSON.parse(existing.body)); }
  catch { return false; }
}
