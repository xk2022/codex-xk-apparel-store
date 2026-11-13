import {
  PRODUCTS,
  cloneProducts,
  findProduct,
  type Product,
} from "./catalog.js";
import {
  addToCart,
  updateQuantity,
  getCartSummary,
  createMockOrder,
  cancelMockOrder,
  validateCheckout,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_NOTICE,
  type CartLine,
  type MockOrder,
  type CheckoutDetails,
  type CartSummary,
} from "./model.js";

declare global {
  interface Window {
    __DEMO_ASSETS__?: Record<string, string>;
  }
}
type DemoState = {
  products: Product[];
  cart: CartLine[];
  orders: MockOrder[];
  member: boolean;
};
const KEY = "xk-apparel-demo-v1";
const fresh = (): DemoState => ({
  products: cloneProducts(),
  cart: [],
  orders: [],
  member: false,
});
let state = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (
    saved &&
    Array.isArray(saved.products) &&
    Array.isArray(saved.cart) &&
    Array.isArray(saved.orders)
  )
    state = { ...saved, member: !!saved.member };
} catch {
  /* file:// or private browsing can disable persistence */
}
let persistenceFailed = false;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    if (!persistenceFailed) {
      persistenceFailed = true;
      toast("此瀏覽器無法儲存，展示資料僅保留於這次開啟期間。");
    }
  }
}
const $ = <T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null => root.querySelector<T>(selector);
const esc = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const money = (n: number) => `NT$ ${n.toLocaleString("en-US")}`;
const asset = (path: string) => esc(window.__DEMO_ASSETS__?.[path] ?? path);
const icon = (name: string) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${({ search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>', bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>' } as Record<string, string>)[name]}</svg>`;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  const el = $("#toast")!;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}
let filter = "all",
  category = "全部",
  query = "",
  sort = "featured";
let selectedProduct: Product | undefined,
  selectedVariant = "",
  quantity = 1;
let previousFocus: HTMLElement | null = null;
let modalType = "";
let adminTab = "orders";
let orderSubmitting = false;
let checkoutDraft: CheckoutDetails | null = null;

function header() {
  const count = getCartSummary(state.cart, state.products).itemCount;
  $("#header")!.innerHTML =
    `<div class="header-inner"><a class="brand" href="#home" aria-label="衣序 SELECT 首頁"><strong>衣序</strong><span>SELECT</span></a><nav class="main-nav" aria-label="主要導覽">${nav()}</nav><div class="header-tools"><button class="icon-button" data-action="search" aria-label="搜尋商品">${icon("search")}</button><button class="icon-button" data-action="member" aria-label="${state.member ? "展示會員" : "會員登入展示"}">${icon("user")}</button><button class="icon-button" data-action="cart" aria-label="購物車，${count} 件">${icon("bag")}<span class="count">${count}</span></button></div></div><nav class="mobile-nav" aria-label="商品導覽">${nav()}</nav>`;
}
function nav() {
  return [
    ["all", "本週選品"],
    ["stock", "現貨日常"],
    ["preorder", "預購新品"],
  ]
    .map(
      ([id, label]) =>
        `<a class="nav-link ${filter === id ? "active" : ""}" href="#shop" data-filter="${id}">${label}</a>`,
    )
    .join("");
}
function footer() {
  $("#footer")!.innerHTML =
    `<div class="page-width"><div class="footer-inner"><div><div class="footer-brand">衣序 SELECT</div><p>Less, but a little more you.</p><p class="fineprint">品牌暫名 · 示意素材，不代表實際商品</p></div><div class="footer-links"><button data-action="shipping" class="inline-link">購物與出貨說明</button><button data-action="member" class="inline-link">展示會員</button><a href="#admin" class="inline-link">店主後台試作</a></div><p class="fineprint">XK SYSTEM · DEMO PROTOTYPE<br>不會收款、不會寄出商品<br>所有訂單僅儲存於本機瀏覽器</p></div><p class="copyright">© 2026 YI XU SELECT · CONCEPT BY XK SYSTEM · 示意運費 NT$65，滿 NT$2,000 免運，待店家確認。</p></div>`;
}
function summaryHtml(s: CartSummary | MockOrder) {
  return `<div class="totals"><div><span>商品小計</span><span>${money(s.subtotal)}</span></div><div><span>超商運費（示意）</span><span>${s.shipping ? money(s.shipping) : "免運"}</span></div><div class="grand"><span>合計</span><span>${money(s.total)}</span></div></div>`;
}
function shippingHtml(s: {
  hasPreorder: boolean;
  isMixed: boolean;
  leadDays: number;
}) {
  return `<div class="notice"><strong>${s.isMixed ? "這張訂單包含現貨與預購" : s.hasPreorder ? "這張訂單包含預購商品" : "現貨商品 · 一起寄送"}</strong>${s.hasPreorder ? `等預購到齊後整單寄出，一次運費。示意備貨約 ${s.leadDays} 天；實際交期待店家確認。` : "示意備貨約 2 天；實際交期待店家確認。"}</div>`;
}
function home() {
  const hero = location.hash !== "#shop";
  $("#main")!.innerHTML =
    `${hero ? `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">THE EVERYDAY EDIT / NOV. 2026</p><h1 id="hero-title">把日常，<br>穿成喜歡的樣子。</h1><p class="english">A quiet kind of beautiful.</p><p class="intro">在柔和的色彩與自在的輪廓之間，<br>挑選剛剛好的自己。</p><a class="text-link" href="#shop">探索本週選品 <span>⟶</span></a></div><div class="hero-photo"><img src="${asset("assets/hero.jpg")}" alt="暖色調服飾與極簡衣架的示意陳列" fetchpriority="high"><span class="photo-caption">A WARDROBE FOR SLOWER DAYS</span></div></section>` : ""}<div class="page-width"><div class="service-strip"><div><strong>自在挑選</strong>不登入也能結帳</div><div><strong>現貨 × 預購</strong>到齊整單寄送</div><div><strong>台灣超商取貨</strong>模擬付款流程</div></div><section class="collection" id="collection" aria-labelledby="collection-title"><div class="section-heading"><div><p class="eyebrow">CURATED FOR YOUR EVERYDAY</p><h2 id="collection-title">${filter === "preorder" ? "預購新品" : filter === "stock" ? "現貨日常" : "本週選品"}</h2></div><p class="sub">一點柔軟，一點留白。<br>讓喜歡的單品回到日常。</p></div><div class="collection-tools"><div class="tabs" role="group" aria-label="商品分類">${["全部", ...new Set(state.products.map((p) => p.category))].map((c) => `<button class="tab ${category === c ? "active" : ""}" data-category="${esc(c)}">${esc(c)}</button>`).join("")}</div><div class="search-tools"><input class="search" id="product-search" type="search" placeholder="搜尋想找的單品" aria-label="搜尋商品" value="${esc(query)}"><select class="sort" id="product-sort" aria-label="商品排序"><option value="featured">精選排序</option><option value="low">價格由低至高</option><option value="high">價格由高至低</option></select></div></div><div class="product-grid" id="product-grid"></div></section><section class="editorial"><div><p class="eyebrow">OUR LITTLE PHILOSOPHY</p><h2>衣櫥裡，留一點呼吸。</h2></div><p>不用追趕每一個流行。從一件喜歡的針織、一抹舒服的米白開始，讓穿搭成為生活裡輕鬆的小事。這是一份風格試作，期待與你一起慢慢調整。</p></section></div>`;
  $<HTMLSelectElement>("#product-sort")!.value = sort;
  renderGrid();
}
function renderGrid() {
  let products = state.products.filter(
    (p) =>
      (category === "全部" || p.category === category) &&
      (!query || p.name.includes(query) || p.category.includes(query)) &&
      (filter === "all" ||
        p.variants.some(
          (v) =>
            v.stock > 0 && (filter === "preorder" ? v.preorder : !v.preorder),
        )),
  );
  if (sort !== "featured")
    products = [...products].sort((a, b) =>
      sort === "low" ? a.price - b.price : b.price - a.price,
    );
  $("#product-grid")!.innerHTML = products.length
    ? products
        .map((p, i) => {
          const variants = p.variants.filter((v) => v.stock > 0),
            pre = variants.some((v) => v.preorder),
            stock = variants.some((v) => !v.preorder);
          return `<article class="product-card"><a href="#product/${esc(p.id)}" class="product-photo" aria-label="查看${esc(p.name)}"><img src="${asset(p.image)}" alt="${esc(p.name)}示意照片" loading="lazy"><span class="product-badge">${!variants.length ? "暫時售罄" : stock && pre ? "現貨／預購" : pre ? "PRE-ORDER 預購" : "IN STOCK 現貨"}</span><span class="photo-index">0${i + 1} / THE EDIT</span></a><div class="product-meta"><div><h3><a href="#product/${esc(p.id)}">${esc(p.name)}</a></h3><p>${money(p.price)}</p><div class="swatches" aria-label="示意顏色">${[...new Map(p.variants.map((v) => [v.color, v])).values()].map((v) => `<span class="swatch" style="background:${esc(v.colorHex)}" title="${esc(v.color)}"></span>`).join("")}</div></div><button class="quick-add" data-product="${esc(p.id)}" aria-label="選擇${esc(p.name)}規格">＋</button></div></article>`;
        })
        .join("")
    : `<p class="empty" style="grid-column:1/-1">沒有符合條件的單品。試試其他分類或關鍵字。</p>`;
}
function openModal(content: string, kind: string, drawer = false) {
  if (!modalType) previousFocus = document.activeElement as HTMLElement;
  modalType = kind;
  $("#overlay-root")!.innerHTML =
    `<div class="overlay ${drawer ? "drawer-overlay" : ""}" data-backdrop="true"><section class="dialog ${drawer ? "drawer" : ""}" role="dialog" aria-modal="true" aria-label="${esc(kind)}" tabindex="-1"><button class="close" data-action="close" aria-label="關閉">×</button>${content}</section></div>`;
  document.body.classList.add("overlay-open");
  $(".dialog")?.focus();
}
function closeModal(navigate = true) {
  const wasProduct = modalType === "商品規格";
  $("#overlay-root")!.innerHTML = "";
  document.body.classList.remove("overlay-open");
  modalType = "";
  previousFocus?.focus();
  if (navigate && wasProduct && location.hash.startsWith("#product/"))
    history.replaceState(null, "", "#shop");
}
function openProduct(id: string) {
  selectedProduct = findProduct(id, state.products);
  if (!selectedProduct) {
    toast("找不到這件商品。");
    return;
  }
  selectedVariant = (
    selectedProduct.variants.find((v) => v.stock > 0) ??
    selectedProduct.variants[0]
  ).id;
  quantity = 1;
  openModal('<div id="product-detail"></div>', "商品規格");
  renderDetail();
}
function renderDetail() {
  const active = document.activeElement as HTMLElement | null;
  const focusKey = active?.closest('#product-detail')
    ? (['color', 'variant', 'qty'] as const).find(key => active.dataset[key] !== undefined)
    : undefined;
  const focusValue = focusKey ? active!.dataset[focusKey] : undefined;
  const p = selectedProduct!;
  const v = p.variants.find((v) => v.id === selectedVariant)!;
  const colors = [
    ...new Map(p.variants.map((item) => [item.color, item])).values(),
  ];
  $("#product-detail")!.innerHTML =
    `<div class="product-dialog"><div class="detail-photo"><img src="${asset(p.image)}" alt="${esc(p.name)}示意照片"><span class="fineprint">示意素材 · 顏色不隨規格變換</span></div><div class="detail-copy"><p class="eyebrow">THE EVERYDAY ESSENTIALS / ${esc(p.category)}</p><h2>${esc(p.name)}</h2><p class="detail-price">${money(p.price)}</p><p class="description">${esc(p.description)}</p><span class="field-label">顏色：${esc(v.color)}</span><div class="options">${colors.map((c) => `<button class="option ${c.color === v.color ? "selected" : ""}" data-color="${esc(c.color)}" aria-pressed="${c.color === v.color}"><span class="swatch" style="background:${esc(c.colorHex)}"></span>${esc(c.color)}</button>`).join("")}</div><span class="field-label">尺寸</span><div class="options">${p.variants
      .filter((item) => item.color === v.color)
      .map(
        (item) =>
          `<button class="option ${item.id === v.id ? "selected" : ""}" data-variant="${esc(item.id)}" aria-pressed="${item.id === v.id}">${esc(item.size)}${!item.stock ? " · 售罄" : ""}</button>`,
      )
      .join(
        "",
      )}</div><div class="availability">${!v.stock ? "此規格暫時售罄" : v.preorder ? `預購 · 示意備貨約 ${v.leadDays} 天` : "現貨 · 示意備貨約 2 天"}${v.stock ? ` ／ 可購買 ${v.stock} 件（示意）` : ""}</div><div class="purchase-row"><div class="quantity"><button data-qty="-1" aria-label="減少數量" ${quantity <= 1 ? "disabled" : ""}>−</button><span id="detail-quantity">${quantity}</span><button data-qty="1" aria-label="增加數量" ${quantity >= v.stock ? "disabled" : ""}>＋</button></div><button class="primary" data-action="add" ${!v.stock ? "disabled" : ""}>${v.stock ? "加入購物車" : "暫時售罄"}</button></div><p class="fineprint">${SHIPPING_NOTICE}</p><details class="detail-notes"><summary>材質與尺寸說明</summary><p>${esc(p.material)}<br>${esc(p.fit)}</p></details><p class="fineprint" style="margin-top:12px">所有價格、材質、顏色與交期皆為展示資料。</p></div></div>`;
  if (focusKey) {
    const controls = [...document.querySelectorAll<HTMLElement>("#product-detail button")];
    const replacement = controls.find(el => el.dataset[focusKey] === focusValue && !el.hasAttribute("disabled"));
    (replacement ?? controls.find(el => el.classList.contains("selected")))?.focus();
  }
}
function cart() {
  const s = getCartSummary(state.cart, state.products);
  openModal(
    `<h2>購物袋 <span class="eyebrow">(${s.itemCount})</span></h2><div class="cart-lines">${s.lines.length ? s.lines.map((l) => `<div class="cart-item"><img src="${asset(l.product.image)}" alt="${esc(l.product.name)}"><div><h3>${esc(l.product.name)}</h3><p>${esc(l.variant.color)} / ${esc(l.variant.size)} · ${l.variant.preorder ? "預購" : "現貨"}</p><p>${money(l.product.price)}</p><div class="cart-item-bottom"><div class="quantity"><button data-cart-qty="${esc(l.variantId)}" data-value="${Math.min(l.quantity - 1, l.stockLimit)}" aria-label="減少${esc(l.product.name)}數量">−</button><span>${l.quantity}</span><button data-cart-qty="${esc(l.variantId)}" data-value="${l.quantity + 1}" aria-label="增加${esc(l.product.name)}數量" ${l.quantity >= l.stockLimit ? "disabled" : ""}>＋</button></div><button class="remove" data-cart-qty="${esc(l.variantId)}" data-value="0">移除</button></div></div></div>`).join("") : '<p class="empty">購物袋還空著。<br>先找一件喜歡的單品吧。</p>'}</div>${s.lines.length ? `${shippingHtml(s)}${s.issues.map((i) => `<p class="error">${esc(i)}</p>`).join("")}${summaryHtml(s)}<p class="fineprint">示意運費 NT$65，滿 NT$2,000 免運，待店家確認。</p><button class="primary wide" data-action="checkout" ${!s.canCheckout ? "disabled" : ""}>前往模擬結帳 ⟶</button>` : '<button class="primary wide" data-action="close">繼續挑選</button>'}`,
    "購物袋",
    true,
  );
}
function checkout() {
  const previousForm = $<HTMLFormElement>('#checkout-form');
  if (previousForm) {
    const data = new FormData(previousForm);
    checkoutDraft = {
      name: String(data.get('name') ?? ''),
      phone: String(data.get('phone') ?? ''),
      email: String(data.get('email') ?? ''),
      store: String(data.get('store') ?? ''),
      method: data.get('method') === 'cod' ? 'cod' : 'card',
    };
  }
  const s = getCartSummary(state.cart, state.products);
  if (!s.canCheckout) {
    $("#main")!.innerHTML =
      `<div class="page-width"><div class="page-title"><h1>購物袋尚未準備好</h1></div><p>${esc(s.issues[0] ?? "先加入一件喜歡的單品，再來模擬結帳。")}</p><a href="#shop" class="text-link">回到選品 ⟶</a></div>`;
    return;
  }
  $("#main")!.innerHTML =
    `<div class="page-width"><p class="breadcrumbs"><a href="#shop">本週選品</a> / 模擬結帳</p><div class="page-title"><p class="eyebrow">A LITTLE SOMETHING FOR YOU</p><h1>把喜歡，帶回日常。</h1><p class="fineprint">訪客結帳 · 不必建立帳號 · 請只使用示意資料</p></div><div class="checkout-layout"><form id="checkout-form" novalidate><div class="panel"><h2>取貨資料</h2><button class="inline-link" type="button" data-action="fill-demo">填入示意資料</button><div class="form-grid" style="margin-top:22px"><label>收件人姓名<input name="name" maxlength="60" autocomplete="off" placeholder="示意收件人" value="${state.member ? "示意會員" : ""}" required><span class="error" data-error="name"></span></label><label>手機號碼<input name="phone" inputmode="tel" autocomplete="off" placeholder="0900000000" required><span class="error" data-error="phone"></span></label><label class="full">Email<input name="email" type="email" autocomplete="off" placeholder="demo@example.com" required><span class="error" data-error="email"></span></label><label class="full">超商取貨門市（展示選單）<select name="store" required><option value="">選擇示意門市</option><option>7-ELEVEN 衣序示意門市（非真實門市）</option><option>全家 日常示意門市（非真實門市）</option></select><span class="error" data-error="store"></span></label></div><div class="form-block"><h3>付款方式</h3><label class="payment-choice"><input type="radio" name="method" value="card" checked> 信用卡模擬付款 · 不填卡號、不會扣款</label><label class="payment-choice"><input type="radio" name="method" value="cod"> 超商取貨付款 · 模擬流程</label><span class="error" data-error="method"></span></div><p class="fineprint">門市、付款及寄送皆未串接。送出只建立此瀏覽器內的示意訂單；重新整理會保留展示資料。可在店主後台重設。</p><p class="error" id="checkout-error" role="alert"></p><button class="primary wide" type="submit" style="margin-top:20px">建立模擬訂單 · ${money(s.total)}</button></div></form><aside class="panel checkout-summary"><h2>訂單摘要 <span class="eyebrow">${s.itemCount} ITEMS</span></h2><div class="cart-preview">${miniLines(s.lines.map((l) => ({ name: l.product.name, image: l.product.image, color: l.variant.color, size: l.variant.size, quantity: l.quantity, lineTotal: l.lineTotal, preorder: l.variant.preorder })))}</div>${shippingHtml(s)}${summaryHtml(s)}<p class="fineprint">示意運費 NT$65，滿 NT$2,000 免運，待店家確認。</p><button class="inline-link" data-action="cart">修改購物袋</button></aside></div></div>`;

  if (checkoutDraft) {
    const form = $<HTMLFormElement>('#checkout-form')!;
    for (const key of ['name', 'phone', 'email', 'store'] as const) {
      (form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement).value = checkoutDraft[key];
    }
    const radio = form.querySelector<HTMLInputElement>(`input[name="method"][value="${checkoutDraft.method}"]`);
    if (radio) radio.checked = true;
  }
}
function miniLines(
  items: {
    name: string;
    image: string;
    color: string;
    size: string;
    quantity: number;
    lineTotal: number;
    preorder: boolean;
  }[],
) {
  return items
    .map(
      (i) =>
        `<div class="order-mini"><img src="${asset(i.image)}" alt="${esc(i.name)}"><div>${esc(i.name)}<p>${esc(i.color)} / ${esc(i.size)} × ${i.quantity} · ${i.preorder ? "預購" : "現貨"}</p></div><span>${money(i.lineTotal)}</span></div>`,
    )
    .join("");
}
function orderPage(id: string) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    $("#main")!.innerHTML =
      '<div class="page-width"><div class="page-title"><h1>此瀏覽器找不到這張示意訂單</h1></div><a href="#shop" class="text-link">回到選品 ⟶</a></div>';
    return;
  }
  $("#main")!.innerHTML =
    `<div class="page-width"><section class="success"><div class="success-header"><div class="success-symbol">✓</div><p class="eyebrow">THANK YOU FOR TRYING</p><h1>模擬訂單已建立</h1><p class="fineprint" style="margin-top:12px">未收款、不會出貨 · 僅供流程確認</p></div><div class="panel"><dl class="definition"><dt>訂單編號</dt><dd>${esc(order.id)}</dd><dt>訂單狀態</dt><dd>${ORDER_STATUS_LABELS[order.status]}</dd><dt>付款狀態</dt><dd>${PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd><dt>示意收件人</dt><dd>${esc(order.customer.name)}</dd><dt>取貨門市</dt><dd>${esc(order.customer.store)}</dd></dl>${miniLines(order.items)}${shippingHtml(order)}${summaryHtml(order)}<p class="fineprint">${esc(order.notice)}所有日期與金額均為示意，請勿用於實際交易。</p></div><div class="actions"><a class="primary" href="#shop">繼續挑選</a><a class="secondary" href="#admin">查看展示後台</a></div></section></div>`;
}
function member() {
  openModal(
    `<div class="member-dialog"><p class="eyebrow">YOUR EVERYDAY WARDROBE</p><h2>留一個位置給喜歡。</h2><p>這是會員介面示意，沒有真實帳號、密碼或身分驗證。所有展示訂單都能在此瀏覽器查看。</p><button class="primary wide" data-action="demo-login">${state.member ? "離開展示會員" : "以示意會員體驗"}</button><p class="fineprint">${state.member ? "目前為示意會員。" : ""}也可以不登入，直接以訪客完成模擬結帳。</p>${state.orders.length ? `<div class="detail-notes"><p>本機示意訂單</p>${state.orders.map((o) => `<p><a class="inline-link" href="#order/${esc(o.id)}" data-action="close-link">${esc(o.id)} · ${ORDER_STATUS_LABELS[o.status]}</a></p>`).join("")}</div>` : ""}</div>`,
    "展示會員",
  );
}
function admin() {
  const total = state.orders
    .filter((o) => o.status !== "cancelled")
    .reduce((n, o) => n + o.total, 0);
  $("#main")!.innerHTML =
    `<div class="page-width"><div class="page-title admin-head"><div><p class="eyebrow">OWNER'S DESK / DEMO</p><h1>店主的小工作桌</h1></div><button class="secondary" data-action="reset">重設全部示意資料</button></div><div class="notice"><strong>後台試作 · 沒有正式權限驗證</strong>只調整此瀏覽器的示意資料。商品 ${state.products.length} 款、訂單 ${state.orders.length} 筆、未取消示意金額 ${money(total)}。庫存是可購買配額；正式系統需由後端交易處理。</div><div class="admin-tabs"><button class="tab ${adminTab === "orders" ? "active" : ""}" data-admin-tab="orders">訂單管理</button><button class="tab ${adminTab === "inventory" ? "active" : ""}" data-admin-tab="inventory">庫存與預購配額</button></div><div class="admin-table-wrap">${adminTab === "orders" ? `<table class="admin-table"><thead><tr><th>訂單 / 收件人</th><th>內容</th><th>金額</th><th>狀態</th><th>操作</th></tr></thead><tbody>${state.orders.length ? state.orders.map((o) => `<tr><td><a class="inline-link" href="#order/${esc(o.id)}">${esc(o.id)}</a><br>${esc(o.customer.name)}</td><td>${o.itemCount} 件 · ${o.isMixed ? "混單" : o.hasPreorder ? "預購" : "現貨"}<br>${o.hasPreorder ? "預購到齊整單寄" : "一次寄出"}</td><td>${money(o.total)}</td><td><span class="status-pill">${ORDER_STATUS_LABELS[o.status]}</span><br>${PAYMENT_STATUS_LABELS[o.paymentStatus]}</td><td><button class="small-button" data-cancel="${esc(o.id)}" ${o.status !== "preparing" ? "disabled" : ""}>取消並回補</button></td></tr>`).join("") : '<tr><td colspan="5">尚無示意訂單，先到前台完成一次模擬結帳。</td></tr>'}</tbody></table>` : `<table class="admin-table"><thead><tr><th>商品</th><th>顏色 / 尺寸</th><th>供貨方式</th><th>可購買配額</th></tr></thead><tbody>${state.products.flatMap((p) => p.variants.map((v) => `<tr><td>${esc(p.name)}</td><td>${esc(v.color)} / ${esc(v.size)}</td><td>${v.preorder ? `預購 · 約${v.leadDays}天` : "現貨"}</td><td><form class="stock-form" data-stock-form="${esc(v.id)}"><input class="stock-input" aria-label="${esc(p.name)}${esc(v.color)}${esc(v.size)}配額" name="stock" type="number" min="0" max="99999" step="1" required value="${v.stock}"><button class="small-button" type="submit">儲存</button></form></td></tr>`)).join("")}</tbody></table>`}</div><p class="fineprint admin-bottom">「款式無上限」為正式商城的需求；這版使用 8 款示意商品。商品新增、正式會員、支付、物流、電子發票與跨裝置庫存，留待後端階段。</p></div>`;
}
function route() {
  closeModal(false);
  header();
  footer();
  const hash = location.hash || "#home";
  if (hash === "#checkout") checkout();
  else if (hash === "#admin") admin();
  else if (hash.startsWith("#order/"))
    orderPage(decodeURIComponent(hash.slice(7)));
  else if (hash.startsWith("#product/")) {
    home();
    openProduct(decodeURIComponent(hash.slice(9)));
  } else home();
}

document.addEventListener("click", (event) => {
  const el = (event.target as Element).closest<HTMLElement>(
    "button,a,[data-backdrop]",
  );
  if (!el) return;
  try {
    if (el.dataset.backdrop && event.target === el) {
      closeModal();
      return;
    }
    if (el.dataset.filter) {
      filter = el.dataset.filter;
      category = "全部";
      if (location.hash === "#shop") {
        event.preventDefault();
        header();
        home();
      }
      return;
    }
    if (el.dataset.category) {
      category = el.dataset.category;
      home();
      return;
    }
    if (el.dataset.product) {
      openProduct(el.dataset.product);
      return;
    }
    if (el.dataset.color) {
      const old = selectedProduct!.variants.find(
        (v) => v.id === selectedVariant,
      )!;
      selectedVariant = (
        selectedProduct!.variants.find(
          (v) => v.color === el.dataset.color && v.size === old.size,
        ) ??
        selectedProduct!.variants.find((v) => v.color === el.dataset.color)!
      ).id;
      quantity = 1;
      renderDetail();
      return;
    }
    if (el.dataset.variant) {
      selectedVariant = el.dataset.variant;
      quantity = 1;
      renderDetail();
      return;
    }
    if (el.dataset.qty) {
      quantity += Number(el.dataset.qty);
      renderDetail();
      return;
    }
    if (el.dataset.cartQty) {
      state.cart = updateQuantity(
        state.cart,
        el.dataset.cartQty,
        Number(el.dataset.value),
        state.products,
      );
      save();
      header();
      cart();
      if (location.hash === "#checkout") checkout();
      return;
    }
    if (el.dataset.adminTab) {
      adminTab = el.dataset.adminTab;
      admin();
      return;
    }
    if (el.dataset.cancel) {
      if (!confirm("取消這張示意訂單並回補配額？不涉及實際退款。")) return;
      const found = state.orders.find((o) => o.id === el.dataset.cancel)!;
      const result = cancelMockOrder(found, state.products);
      state.products = result.products;
      state.orders = state.orders.map((o) =>
        o.id === found.id ? result.order : o,
      );
      save();
      admin();
      toast("示意訂單已取消，配額已回補一次。");
      return;
    }
    switch (el.dataset.action) {
      case "close":
        closeModal();
        break;
      case "close-link":
        closeModal();
        break;
      case "search":
        if (location.hash !== "#shop") {
          location.hash = "#shop";
          setTimeout(() => $("#product-search")?.focus(), 30);
        } else $("#product-search")?.focus();
        break;
      case "member":
        member();
        break;
      case "cart":
        cart();
        break;
      case "add":
        state.cart = addToCart(
          state.cart,
          selectedVariant,
          quantity,
          state.products,
        );
        save();
        header();
        closeModal();
        toast("已加入購物袋，繼續挑選喜歡的日常。");
        break;
      case "checkout":
        closeModal();
        if (location.hash === "#checkout") checkout();
        else location.hash = "#checkout";
        break;
      case "fill-demo": {
        const form = $<HTMLFormElement>("#checkout-form")!;
        for (const [key, value] of Object.entries({
          name: "示意收件人",
          phone: "0900000000",
          email: "demo@example.com",
          store: "7-ELEVEN 衣序示意門市（非真實門市）",
        }))
          (form.elements.namedItem(key) as HTMLInputElement).value = value;
        break;
      }
      case "demo-login":
        state.member = !state.member;
        save();
        closeModal();
        header();
        toast(
          state.member
            ? "已進入示意會員，這不是真實登入。"
            : "已離開示意會員。",
        );
        break;
      case "shipping":
        openModal(
          `<div class="member-dialog"><p class="eyebrow">SHOPPING NOTES</p><h2>一起抵達，剛剛好。</h2><p>${SHIPPING_NOTICE}</p><p>訪客可直接結帳。這版可體驗超商取貨、信用卡模擬與取貨付款模擬；沒有實際物流或金流。</p><p class="fineprint">運費 NT$65、滿 NT$2,000 免運，以及備貨天數皆為示意設定，須由店家確認。</p></div>`,
          "購物與出貨說明",
        );
        break;
      case "reset":
        if (confirm("清除這個瀏覽器內所有示意購物車、會員、訂單與庫存修改？")) {
          state = fresh();
          checkoutDraft = null;
          save();
          header();
          admin();
          toast("示意資料已重設。");
        }
        break;
    }
  } catch (error) {
    toast(
      error instanceof Error
        ? error.message
        : "操作未完成，請重設展示資料後再試。",
    );
  }
});
document.addEventListener("input", (event) => {
  const el = event.target as HTMLInputElement;
  if (el.id === "product-search") {
    query = el.value.trim();
    renderGrid();
  }
});
document.addEventListener("change", (event) => {
  const el = event.target as HTMLSelectElement;
  if (el.id === "product-sort") {
    sort = el.value;
    renderGrid();
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  event.preventDefault();
  if (form.dataset.stockForm) {
    const n = Number(
      (form.elements.namedItem("stock") as HTMLInputElement).value,
    );
    if (!Number.isSafeInteger(n) || n < 0 || n > 99999) {
      toast("配額請填 0–99999 的整數。");
      return;
    }
    const v = state.products
      .flatMap((p) => p.variants)
      .find((v) => v.id === form.dataset.stockForm)!;
    v.stock = n;
    save();
    toast("示意配額已儲存。");
    return;
  }
  if (form.id !== "checkout-form" || orderSubmitting) return;
  const data = new FormData(form);
  const details: CheckoutDetails = {
    name: String(data.get("name") ?? ""),
    phone: String(data.get("phone") ?? ""),
    email: String(data.get("email") ?? ""),
    store: String(data.get("store") ?? ""),
    method: data.get("method") === "cod" ? "cod" : "card",
  };
  const validation = validateCheckout(details);
  for (const key of ["name", "phone", "email", "store", "method"] as const) {
    const error = $(`[data-error="${key}"]`, form);
    if (error) error.textContent = validation.errors[key] ?? "";
    const input = form.elements.namedItem(key);
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement)
      input.setAttribute("aria-invalid", String(!!validation.errors[key]));
  }
  if (!validation.valid) {
    const key = Object.keys(validation.errors)[0];
    (form.elements.namedItem(key) as HTMLElement)?.focus();
    return;
  }
  orderSubmitting = true;
  try {
    const id = `DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const result = createMockOrder(state.cart, details, state.products, {
      id,
      createdAt: new Date().toISOString(),
      existingOrders: state.orders,
    });
    state.products = result.products;
    state.orders.unshift(result.order);
    state.cart = [];
    checkoutDraft = null;
    save();
    location.hash = `#order/${result.order.id}`;
  } catch (error) {
    $("#checkout-error")!.textContent =
      error instanceof Error ? error.message : "模擬訂單未建立。";
  } finally {
    orderSubmitting = false;
  }
});
document.addEventListener("keydown", (event) => {
  if (!modalType) return;
  if (event.key === "Escape") {
    closeModal();
    return;
  }
  if (event.key === "Tab") {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        '.dialog button:not(:disabled),.dialog a,.dialog input,.dialog select,.dialog summary,[role="dialog"]',
      ),
    ].filter((e) => e.getAttribute("tabindex") !== "-1");
    if (!nodes.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (!nodes.includes(document.activeElement as HTMLElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
window.addEventListener("hashchange", route);
route();
