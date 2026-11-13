import {
  cloneProducts,
  findProduct
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
  SHIPPING_NOTICE
} from "./model.js";
const KEY = "xk-apparel-demo-v1";
const fresh = () => ({
  products: cloneProducts(),
  cart: [],
  orders: [],
  member: false
});
let state = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && Array.isArray(saved.products) && Array.isArray(saved.cart) && Array.isArray(saved.orders))
    state = { ...saved, member: !!saved.member };
} catch {
}
let persistenceFailed = false;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    if (!persistenceFailed) {
      persistenceFailed = true;
      toast("\u6B64\u700F\u89BD\u5668\u7121\u6CD5\u5132\u5B58\uFF0C\u5C55\u793A\u8CC7\u6599\u50C5\u4FDD\u7559\u65BC\u9019\u6B21\u958B\u555F\u671F\u9593\u3002");
    }
  }
}
const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? "").replace(
  /[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
);
const money = (n) => `NT$ ${n.toLocaleString("en-US")}`;
const asset = (path) => esc(window.__DEMO_ASSETS__?.[path] ?? path);
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${{ search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>', bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>' }[name]}</svg>`;
let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}
let filter = "all", category = "\u5168\u90E8", query = "", sort = "featured";
let selectedProduct, selectedVariant = "", quantity = 1;
let previousFocus = null;
let modalType = "";
let adminTab = "orders";
let orderSubmitting = false;
let checkoutDraft = null;
function header() {
  const count = getCartSummary(state.cart, state.products).itemCount;
  $("#header").innerHTML = `<div class="header-inner"><a class="brand" href="#home" aria-label="\u8863\u5E8F SELECT \u9996\u9801"><strong>\u8863\u5E8F</strong><span>SELECT</span></a><nav class="main-nav" aria-label="\u4E3B\u8981\u5C0E\u89BD">${nav()}</nav><div class="header-tools"><button class="icon-button" data-action="search" aria-label="\u641C\u5C0B\u5546\u54C1">${icon("search")}</button><button class="icon-button" data-action="member" aria-label="${state.member ? "\u5C55\u793A\u6703\u54E1" : "\u6703\u54E1\u767B\u5165\u5C55\u793A"}">${icon("user")}</button><button class="icon-button" data-action="cart" aria-label="\u8CFC\u7269\u8ECA\uFF0C${count} \u4EF6">${icon("bag")}<span class="count">${count}</span></button></div></div><nav class="mobile-nav" aria-label="\u5546\u54C1\u5C0E\u89BD">${nav()}</nav>`;
}
function nav() {
  return [
    ["all", "\u672C\u9031\u9078\u54C1"],
    ["stock", "\u73FE\u8CA8\u65E5\u5E38"],
    ["preorder", "\u9810\u8CFC\u65B0\u54C1"]
  ].map(
    ([id, label]) => `<a class="nav-link ${filter === id ? "active" : ""}" href="#shop" data-filter="${id}">${label}</a>`
  ).join("");
}
function footer() {
  $("#footer").innerHTML = `<div class="page-width"><div class="footer-inner"><div><div class="footer-brand">\u8863\u5E8F SELECT</div><p>Less, but a little more you.</p><p class="fineprint">\u54C1\u724C\u66AB\u540D \xB7 \u793A\u610F\u7D20\u6750\uFF0C\u4E0D\u4EE3\u8868\u5BE6\u969B\u5546\u54C1</p></div><div class="footer-links"><button data-action="shipping" class="inline-link">\u8CFC\u7269\u8207\u51FA\u8CA8\u8AAA\u660E</button><button data-action="member" class="inline-link">\u5C55\u793A\u6703\u54E1</button><a href="#admin" class="inline-link">\u5E97\u4E3B\u5F8C\u53F0\u8A66\u4F5C</a></div><p class="fineprint">XK SYSTEM \xB7 DEMO PROTOTYPE<br>\u4E0D\u6703\u6536\u6B3E\u3001\u4E0D\u6703\u5BC4\u51FA\u5546\u54C1<br>\u6240\u6709\u8A02\u55AE\u50C5\u5132\u5B58\u65BC\u672C\u6A5F\u700F\u89BD\u5668</p></div><p class="copyright">\xA9 2026 YI XU SELECT \xB7 CONCEPT BY XK SYSTEM \xB7 \u793A\u610F\u904B\u8CBB NT$65\uFF0C\u6EFF NT$2,000 \u514D\u904B\uFF0C\u5F85\u5E97\u5BB6\u78BA\u8A8D\u3002</p></div>`;
}
function summaryHtml(s) {
  return `<div class="totals"><div><span>\u5546\u54C1\u5C0F\u8A08</span><span>${money(s.subtotal)}</span></div><div><span>\u8D85\u5546\u904B\u8CBB\uFF08\u793A\u610F\uFF09</span><span>${s.shipping ? money(s.shipping) : "\u514D\u904B"}</span></div><div class="grand"><span>\u5408\u8A08</span><span>${money(s.total)}</span></div></div>`;
}
function shippingHtml(s) {
  return `<div class="notice"><strong>${s.isMixed ? "\u9019\u5F35\u8A02\u55AE\u5305\u542B\u73FE\u8CA8\u8207\u9810\u8CFC" : s.hasPreorder ? "\u9019\u5F35\u8A02\u55AE\u5305\u542B\u9810\u8CFC\u5546\u54C1" : "\u73FE\u8CA8\u5546\u54C1 \xB7 \u4E00\u8D77\u5BC4\u9001"}</strong>${s.hasPreorder ? `\u7B49\u9810\u8CFC\u5230\u9F4A\u5F8C\u6574\u55AE\u5BC4\u51FA\uFF0C\u4E00\u6B21\u904B\u8CBB\u3002\u793A\u610F\u5099\u8CA8\u7D04 ${s.leadDays} \u5929\uFF1B\u5BE6\u969B\u4EA4\u671F\u5F85\u5E97\u5BB6\u78BA\u8A8D\u3002` : "\u793A\u610F\u5099\u8CA8\u7D04 2 \u5929\uFF1B\u5BE6\u969B\u4EA4\u671F\u5F85\u5E97\u5BB6\u78BA\u8A8D\u3002"}</div>`;
}
function home() {
  const hero = location.hash !== "#shop";
  $("#main").innerHTML = `${hero ? `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">THE EVERYDAY EDIT / NOV. 2026</p><h1 id="hero-title">\u628A\u65E5\u5E38\uFF0C<br>\u7A7F\u6210\u559C\u6B61\u7684\u6A23\u5B50\u3002</h1><p class="english">A quiet kind of beautiful.</p><p class="intro">\u5728\u67D4\u548C\u7684\u8272\u5F69\u8207\u81EA\u5728\u7684\u8F2A\u5ED3\u4E4B\u9593\uFF0C<br>\u6311\u9078\u525B\u525B\u597D\u7684\u81EA\u5DF1\u3002</p><a class="text-link" href="#shop">\u63A2\u7D22\u672C\u9031\u9078\u54C1 <span>\u27F6</span></a></div><div class="hero-photo"><img src="${asset("assets/hero.jpg")}" alt="\u6696\u8272\u8ABF\u670D\u98FE\u8207\u6975\u7C21\u8863\u67B6\u7684\u793A\u610F\u9673\u5217" fetchpriority="high"><span class="photo-caption">A WARDROBE FOR SLOWER DAYS</span></div></section>` : ""}<div class="page-width"><div class="service-strip"><div><strong>\u81EA\u5728\u6311\u9078</strong>\u4E0D\u767B\u5165\u4E5F\u80FD\u7D50\u5E33</div><div><strong>\u73FE\u8CA8 \xD7 \u9810\u8CFC</strong>\u5230\u9F4A\u6574\u55AE\u5BC4\u9001</div><div><strong>\u53F0\u7063\u8D85\u5546\u53D6\u8CA8</strong>\u6A21\u64EC\u4ED8\u6B3E\u6D41\u7A0B</div></div><section class="collection" id="collection" aria-labelledby="collection-title"><div class="section-heading"><div><p class="eyebrow">CURATED FOR YOUR EVERYDAY</p><h2 id="collection-title">${filter === "preorder" ? "\u9810\u8CFC\u65B0\u54C1" : filter === "stock" ? "\u73FE\u8CA8\u65E5\u5E38" : "\u672C\u9031\u9078\u54C1"}</h2></div><p class="sub">\u4E00\u9EDE\u67D4\u8EDF\uFF0C\u4E00\u9EDE\u7559\u767D\u3002<br>\u8B93\u559C\u6B61\u7684\u55AE\u54C1\u56DE\u5230\u65E5\u5E38\u3002</p></div><div class="collection-tools"><div class="tabs" role="group" aria-label="\u5546\u54C1\u5206\u985E">${["\u5168\u90E8", ...new Set(state.products.map((p) => p.category))].map((c) => `<button class="tab ${category === c ? "active" : ""}" data-category="${esc(c)}">${esc(c)}</button>`).join("")}</div><div class="search-tools"><input class="search" id="product-search" type="search" placeholder="\u641C\u5C0B\u60F3\u627E\u7684\u55AE\u54C1" aria-label="\u641C\u5C0B\u5546\u54C1" value="${esc(query)}"><select class="sort" id="product-sort" aria-label="\u5546\u54C1\u6392\u5E8F"><option value="featured">\u7CBE\u9078\u6392\u5E8F</option><option value="low">\u50F9\u683C\u7531\u4F4E\u81F3\u9AD8</option><option value="high">\u50F9\u683C\u7531\u9AD8\u81F3\u4F4E</option></select></div></div><div class="product-grid" id="product-grid"></div></section><section class="editorial"><div><p class="eyebrow">OUR LITTLE PHILOSOPHY</p><h2>\u8863\u6AE5\u88E1\uFF0C\u7559\u4E00\u9EDE\u547C\u5438\u3002</h2></div><p>\u4E0D\u7528\u8FFD\u8D95\u6BCF\u4E00\u500B\u6D41\u884C\u3002\u5F9E\u4E00\u4EF6\u559C\u6B61\u7684\u91DD\u7E54\u3001\u4E00\u62B9\u8212\u670D\u7684\u7C73\u767D\u958B\u59CB\uFF0C\u8B93\u7A7F\u642D\u6210\u70BA\u751F\u6D3B\u88E1\u8F15\u9B06\u7684\u5C0F\u4E8B\u3002\u9019\u662F\u4E00\u4EFD\u98A8\u683C\u8A66\u4F5C\uFF0C\u671F\u5F85\u8207\u4F60\u4E00\u8D77\u6162\u6162\u8ABF\u6574\u3002</p></section></div>`;
  $("#product-sort").value = sort;
  renderGrid();
}
function renderGrid() {
  let products = state.products.filter(
    (p) => (category === "\u5168\u90E8" || p.category === category) && (!query || p.name.includes(query) || p.category.includes(query)) && (filter === "all" || p.variants.some(
      (v) => v.stock > 0 && (filter === "preorder" ? v.preorder : !v.preorder)
    ))
  );
  if (sort !== "featured")
    products = [...products].sort(
      (a, b) => sort === "low" ? a.price - b.price : b.price - a.price
    );
  $("#product-grid").innerHTML = products.length ? products.map((p, i) => {
    const variants = p.variants.filter((v) => v.stock > 0), pre = variants.some((v) => v.preorder), stock = variants.some((v) => !v.preorder);
    return `<article class="product-card"><a href="#product/${esc(p.id)}" class="product-photo" aria-label="\u67E5\u770B${esc(p.name)}"><img src="${asset(p.image)}" alt="${esc(p.name)}\u793A\u610F\u7167\u7247" loading="lazy"><span class="product-badge">${!variants.length ? "\u66AB\u6642\u552E\u7F44" : stock && pre ? "\u73FE\u8CA8\uFF0F\u9810\u8CFC" : pre ? "PRE-ORDER \u9810\u8CFC" : "IN STOCK \u73FE\u8CA8"}</span><span class="photo-index">0${i + 1} / THE EDIT</span></a><div class="product-meta"><div><h3><a href="#product/${esc(p.id)}">${esc(p.name)}</a></h3><p>${money(p.price)}</p><div class="swatches" aria-label="\u793A\u610F\u984F\u8272">${[...new Map(p.variants.map((v) => [v.color, v])).values()].map((v) => `<span class="swatch" style="background:${esc(v.colorHex)}" title="${esc(v.color)}"></span>`).join("")}</div></div><button class="quick-add" data-product="${esc(p.id)}" aria-label="\u9078\u64C7${esc(p.name)}\u898F\u683C">\uFF0B</button></div></article>`;
  }).join("") : `<p class="empty" style="grid-column:1/-1">\u6C92\u6709\u7B26\u5408\u689D\u4EF6\u7684\u55AE\u54C1\u3002\u8A66\u8A66\u5176\u4ED6\u5206\u985E\u6216\u95DC\u9375\u5B57\u3002</p>`;
}
function openModal(content, kind, drawer = false) {
  if (!modalType) previousFocus = document.activeElement;
  modalType = kind;
  $("#overlay-root").innerHTML = `<div class="overlay ${drawer ? "drawer-overlay" : ""}" data-backdrop="true"><section class="dialog ${drawer ? "drawer" : ""}" role="dialog" aria-modal="true" aria-label="${esc(kind)}" tabindex="-1"><button class="close" data-action="close" aria-label="\u95DC\u9589">\xD7</button>${content}</section></div>`;
  document.body.classList.add("overlay-open");
  $(".dialog")?.focus();
}
function closeModal(navigate = true) {
  const wasProduct = modalType === "\u5546\u54C1\u898F\u683C";
  $("#overlay-root").innerHTML = "";
  document.body.classList.remove("overlay-open");
  modalType = "";
  previousFocus?.focus();
  if (navigate && wasProduct && location.hash.startsWith("#product/"))
    history.replaceState(null, "", "#shop");
}
function openProduct(id) {
  selectedProduct = findProduct(id, state.products);
  if (!selectedProduct) {
    toast("\u627E\u4E0D\u5230\u9019\u4EF6\u5546\u54C1\u3002");
    return;
  }
  selectedVariant = (selectedProduct.variants.find((v) => v.stock > 0) ?? selectedProduct.variants[0]).id;
  quantity = 1;
  openModal('<div id="product-detail"></div>', "\u5546\u54C1\u898F\u683C");
  renderDetail();
}
function renderDetail() {
  const active = document.activeElement;
  const focusKey = active?.closest("#product-detail") ? ["color", "variant", "qty"].find((key) => active.dataset[key] !== void 0) : void 0;
  const focusValue = focusKey ? active.dataset[focusKey] : void 0;
  const p = selectedProduct;
  const v = p.variants.find((v2) => v2.id === selectedVariant);
  const colors = [
    ...new Map(p.variants.map((item) => [item.color, item])).values()
  ];
  $("#product-detail").innerHTML = `<div class="product-dialog"><div class="detail-photo"><img src="${asset(p.image)}" alt="${esc(p.name)}\u793A\u610F\u7167\u7247"><span class="fineprint">\u793A\u610F\u7D20\u6750 \xB7 \u984F\u8272\u4E0D\u96A8\u898F\u683C\u8B8A\u63DB</span></div><div class="detail-copy"><p class="eyebrow">THE EVERYDAY ESSENTIALS / ${esc(p.category)}</p><h2>${esc(p.name)}</h2><p class="detail-price">${money(p.price)}</p><p class="description">${esc(p.description)}</p><span class="field-label">\u984F\u8272\uFF1A${esc(v.color)}</span><div class="options">${colors.map((c) => `<button class="option ${c.color === v.color ? "selected" : ""}" data-color="${esc(c.color)}" aria-pressed="${c.color === v.color}"><span class="swatch" style="background:${esc(c.colorHex)}"></span>${esc(c.color)}</button>`).join("")}</div><span class="field-label">\u5C3A\u5BF8</span><div class="options">${p.variants.filter((item) => item.color === v.color).map(
    (item) => `<button class="option ${item.id === v.id ? "selected" : ""}" data-variant="${esc(item.id)}" aria-pressed="${item.id === v.id}">${esc(item.size)}${!item.stock ? " \xB7 \u552E\u7F44" : ""}</button>`
  ).join(
    ""
  )}</div><div class="availability">${!v.stock ? "\u6B64\u898F\u683C\u66AB\u6642\u552E\u7F44" : v.preorder ? `\u9810\u8CFC \xB7 \u793A\u610F\u5099\u8CA8\u7D04 ${v.leadDays} \u5929` : "\u73FE\u8CA8 \xB7 \u793A\u610F\u5099\u8CA8\u7D04 2 \u5929"}${v.stock ? ` \uFF0F \u53EF\u8CFC\u8CB7 ${v.stock} \u4EF6\uFF08\u793A\u610F\uFF09` : ""}</div><div class="purchase-row"><div class="quantity"><button data-qty="-1" aria-label="\u6E1B\u5C11\u6578\u91CF" ${quantity <= 1 ? "disabled" : ""}>\u2212</button><span id="detail-quantity">${quantity}</span><button data-qty="1" aria-label="\u589E\u52A0\u6578\u91CF" ${quantity >= v.stock ? "disabled" : ""}>\uFF0B</button></div><button class="primary" data-action="add" ${!v.stock ? "disabled" : ""}>${v.stock ? "\u52A0\u5165\u8CFC\u7269\u8ECA" : "\u66AB\u6642\u552E\u7F44"}</button></div><p class="fineprint">${SHIPPING_NOTICE}</p><details class="detail-notes"><summary>\u6750\u8CEA\u8207\u5C3A\u5BF8\u8AAA\u660E</summary><p>${esc(p.material)}<br>${esc(p.fit)}</p></details><p class="fineprint" style="margin-top:12px">\u6240\u6709\u50F9\u683C\u3001\u6750\u8CEA\u3001\u984F\u8272\u8207\u4EA4\u671F\u7686\u70BA\u5C55\u793A\u8CC7\u6599\u3002</p></div></div>`;
  if (focusKey) {
    const controls = [...document.querySelectorAll("#product-detail button")];
    const replacement = controls.find((el) => el.dataset[focusKey] === focusValue && !el.hasAttribute("disabled"));
    (replacement ?? controls.find((el) => el.classList.contains("selected")))?.focus();
  }
}
function cart() {
  const s = getCartSummary(state.cart, state.products);
  openModal(
    `<h2>\u8CFC\u7269\u888B <span class="eyebrow">(${s.itemCount})</span></h2><div class="cart-lines">${s.lines.length ? s.lines.map((l) => `<div class="cart-item"><img src="${asset(l.product.image)}" alt="${esc(l.product.name)}"><div><h3>${esc(l.product.name)}</h3><p>${esc(l.variant.color)} / ${esc(l.variant.size)} \xB7 ${l.variant.preorder ? "\u9810\u8CFC" : "\u73FE\u8CA8"}</p><p>${money(l.product.price)}</p><div class="cart-item-bottom"><div class="quantity"><button data-cart-qty="${esc(l.variantId)}" data-value="${Math.min(l.quantity - 1, l.stockLimit)}" aria-label="\u6E1B\u5C11${esc(l.product.name)}\u6578\u91CF">\u2212</button><span>${l.quantity}</span><button data-cart-qty="${esc(l.variantId)}" data-value="${l.quantity + 1}" aria-label="\u589E\u52A0${esc(l.product.name)}\u6578\u91CF" ${l.quantity >= l.stockLimit ? "disabled" : ""}>\uFF0B</button></div><button class="remove" data-cart-qty="${esc(l.variantId)}" data-value="0">\u79FB\u9664</button></div></div></div>`).join("") : '<p class="empty">\u8CFC\u7269\u888B\u9084\u7A7A\u8457\u3002<br>\u5148\u627E\u4E00\u4EF6\u559C\u6B61\u7684\u55AE\u54C1\u5427\u3002</p>'}</div>${s.lines.length ? `${shippingHtml(s)}${s.issues.map((i) => `<p class="error">${esc(i)}</p>`).join("")}${summaryHtml(s)}<p class="fineprint">\u793A\u610F\u904B\u8CBB NT$65\uFF0C\u6EFF NT$2,000 \u514D\u904B\uFF0C\u5F85\u5E97\u5BB6\u78BA\u8A8D\u3002</p><button class="primary wide" data-action="checkout" ${!s.canCheckout ? "disabled" : ""}>\u524D\u5F80\u6A21\u64EC\u7D50\u5E33 \u27F6</button>` : '<button class="primary wide" data-action="close">\u7E7C\u7E8C\u6311\u9078</button>'}`,
    "\u8CFC\u7269\u888B",
    true
  );
}
function checkout() {
  const previousForm = $("#checkout-form");
  if (previousForm) {
    const data = new FormData(previousForm);
    checkoutDraft = {
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      store: String(data.get("store") ?? ""),
      method: data.get("method") === "cod" ? "cod" : "card"
    };
  }
  const s = getCartSummary(state.cart, state.products);
  if (!s.canCheckout) {
    $("#main").innerHTML = `<div class="page-width"><div class="page-title"><h1>\u8CFC\u7269\u888B\u5C1A\u672A\u6E96\u5099\u597D</h1></div><p>${esc(s.issues[0] ?? "\u5148\u52A0\u5165\u4E00\u4EF6\u559C\u6B61\u7684\u55AE\u54C1\uFF0C\u518D\u4F86\u6A21\u64EC\u7D50\u5E33\u3002")}</p><a href="#shop" class="text-link">\u56DE\u5230\u9078\u54C1 \u27F6</a></div>`;
    return;
  }
  $("#main").innerHTML = `<div class="page-width"><p class="breadcrumbs"><a href="#shop">\u672C\u9031\u9078\u54C1</a> / \u6A21\u64EC\u7D50\u5E33</p><div class="page-title"><p class="eyebrow">A LITTLE SOMETHING FOR YOU</p><h1>\u628A\u559C\u6B61\uFF0C\u5E36\u56DE\u65E5\u5E38\u3002</h1><p class="fineprint">\u8A2A\u5BA2\u7D50\u5E33 \xB7 \u4E0D\u5FC5\u5EFA\u7ACB\u5E33\u865F \xB7 \u8ACB\u53EA\u4F7F\u7528\u793A\u610F\u8CC7\u6599</p></div><div class="checkout-layout"><form id="checkout-form" novalidate><div class="panel"><h2>\u53D6\u8CA8\u8CC7\u6599</h2><button class="inline-link" type="button" data-action="fill-demo">\u586B\u5165\u793A\u610F\u8CC7\u6599</button><div class="form-grid" style="margin-top:22px"><label>\u6536\u4EF6\u4EBA\u59D3\u540D<input name="name" maxlength="60" autocomplete="off" placeholder="\u793A\u610F\u6536\u4EF6\u4EBA" value="${state.member ? "\u793A\u610F\u6703\u54E1" : ""}" required><span class="error" data-error="name"></span></label><label>\u624B\u6A5F\u865F\u78BC<input name="phone" inputmode="tel" autocomplete="off" placeholder="0900000000" required><span class="error" data-error="phone"></span></label><label class="full">Email<input name="email" type="email" autocomplete="off" placeholder="demo@example.com" required><span class="error" data-error="email"></span></label><label class="full">\u8D85\u5546\u53D6\u8CA8\u9580\u5E02\uFF08\u5C55\u793A\u9078\u55AE\uFF09<select name="store" required><option value="">\u9078\u64C7\u793A\u610F\u9580\u5E02</option><option>7-ELEVEN \u8863\u5E8F\u793A\u610F\u9580\u5E02\uFF08\u975E\u771F\u5BE6\u9580\u5E02\uFF09</option><option>\u5168\u5BB6 \u65E5\u5E38\u793A\u610F\u9580\u5E02\uFF08\u975E\u771F\u5BE6\u9580\u5E02\uFF09</option></select><span class="error" data-error="store"></span></label></div><div class="form-block"><h3>\u4ED8\u6B3E\u65B9\u5F0F</h3><label class="payment-choice"><input type="radio" name="method" value="card" checked> \u4FE1\u7528\u5361\u6A21\u64EC\u4ED8\u6B3E \xB7 \u4E0D\u586B\u5361\u865F\u3001\u4E0D\u6703\u6263\u6B3E</label><label class="payment-choice"><input type="radio" name="method" value="cod"> \u8D85\u5546\u53D6\u8CA8\u4ED8\u6B3E \xB7 \u6A21\u64EC\u6D41\u7A0B</label><span class="error" data-error="method"></span></div><p class="fineprint">\u9580\u5E02\u3001\u4ED8\u6B3E\u53CA\u5BC4\u9001\u7686\u672A\u4E32\u63A5\u3002\u9001\u51FA\u53EA\u5EFA\u7ACB\u6B64\u700F\u89BD\u5668\u5167\u7684\u793A\u610F\u8A02\u55AE\uFF1B\u91CD\u65B0\u6574\u7406\u6703\u4FDD\u7559\u5C55\u793A\u8CC7\u6599\u3002\u53EF\u5728\u5E97\u4E3B\u5F8C\u53F0\u91CD\u8A2D\u3002</p><p class="error" id="checkout-error" role="alert"></p><button class="primary wide" type="submit" style="margin-top:20px">\u5EFA\u7ACB\u6A21\u64EC\u8A02\u55AE \xB7 ${money(s.total)}</button></div></form><aside class="panel checkout-summary"><h2>\u8A02\u55AE\u6458\u8981 <span class="eyebrow">${s.itemCount} ITEMS</span></h2><div class="cart-preview">${miniLines(s.lines.map((l) => ({ name: l.product.name, image: l.product.image, color: l.variant.color, size: l.variant.size, quantity: l.quantity, lineTotal: l.lineTotal, preorder: l.variant.preorder })))}</div>${shippingHtml(s)}${summaryHtml(s)}<p class="fineprint">\u793A\u610F\u904B\u8CBB NT$65\uFF0C\u6EFF NT$2,000 \u514D\u904B\uFF0C\u5F85\u5E97\u5BB6\u78BA\u8A8D\u3002</p><button class="inline-link" data-action="cart">\u4FEE\u6539\u8CFC\u7269\u888B</button></aside></div></div>`;
  if (checkoutDraft) {
    const form = $("#checkout-form");
    for (const key of ["name", "phone", "email", "store"]) {
      form.elements.namedItem(key).value = checkoutDraft[key];
    }
    const radio = form.querySelector(`input[name="method"][value="${checkoutDraft.method}"]`);
    if (radio) radio.checked = true;
  }
}
function miniLines(items) {
  return items.map(
    (i) => `<div class="order-mini"><img src="${asset(i.image)}" alt="${esc(i.name)}"><div>${esc(i.name)}<p>${esc(i.color)} / ${esc(i.size)} \xD7 ${i.quantity} \xB7 ${i.preorder ? "\u9810\u8CFC" : "\u73FE\u8CA8"}</p></div><span>${money(i.lineTotal)}</span></div>`
  ).join("");
}
function orderPage(id) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    $("#main").innerHTML = '<div class="page-width"><div class="page-title"><h1>\u6B64\u700F\u89BD\u5668\u627E\u4E0D\u5230\u9019\u5F35\u793A\u610F\u8A02\u55AE</h1></div><a href="#shop" class="text-link">\u56DE\u5230\u9078\u54C1 \u27F6</a></div>';
    return;
  }
  $("#main").innerHTML = `<div class="page-width"><section class="success"><div class="success-header"><div class="success-symbol">\u2713</div><p class="eyebrow">THANK YOU FOR TRYING</p><h1>\u6A21\u64EC\u8A02\u55AE\u5DF2\u5EFA\u7ACB</h1><p class="fineprint" style="margin-top:12px">\u672A\u6536\u6B3E\u3001\u4E0D\u6703\u51FA\u8CA8 \xB7 \u50C5\u4F9B\u6D41\u7A0B\u78BA\u8A8D</p></div><div class="panel"><dl class="definition"><dt>\u8A02\u55AE\u7DE8\u865F</dt><dd>${esc(order.id)}</dd><dt>\u8A02\u55AE\u72C0\u614B</dt><dd>${ORDER_STATUS_LABELS[order.status]}</dd><dt>\u4ED8\u6B3E\u72C0\u614B</dt><dd>${PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd><dt>\u793A\u610F\u6536\u4EF6\u4EBA</dt><dd>${esc(order.customer.name)}</dd><dt>\u53D6\u8CA8\u9580\u5E02</dt><dd>${esc(order.customer.store)}</dd></dl>${miniLines(order.items)}${shippingHtml(order)}${summaryHtml(order)}<p class="fineprint">${esc(order.notice)}\u6240\u6709\u65E5\u671F\u8207\u91D1\u984D\u5747\u70BA\u793A\u610F\uFF0C\u8ACB\u52FF\u7528\u65BC\u5BE6\u969B\u4EA4\u6613\u3002</p></div><div class="actions"><a class="primary" href="#shop">\u7E7C\u7E8C\u6311\u9078</a><a class="secondary" href="#admin">\u67E5\u770B\u5C55\u793A\u5F8C\u53F0</a></div></section></div>`;
}
function member() {
  openModal(
    `<div class="member-dialog"><p class="eyebrow">YOUR EVERYDAY WARDROBE</p><h2>\u7559\u4E00\u500B\u4F4D\u7F6E\u7D66\u559C\u6B61\u3002</h2><p>\u9019\u662F\u6703\u54E1\u4ECB\u9762\u793A\u610F\uFF0C\u6C92\u6709\u771F\u5BE6\u5E33\u865F\u3001\u5BC6\u78BC\u6216\u8EAB\u5206\u9A57\u8B49\u3002\u6240\u6709\u5C55\u793A\u8A02\u55AE\u90FD\u80FD\u5728\u6B64\u700F\u89BD\u5668\u67E5\u770B\u3002</p><button class="primary wide" data-action="demo-login">${state.member ? "\u96E2\u958B\u5C55\u793A\u6703\u54E1" : "\u4EE5\u793A\u610F\u6703\u54E1\u9AD4\u9A57"}</button><p class="fineprint">${state.member ? "\u76EE\u524D\u70BA\u793A\u610F\u6703\u54E1\u3002" : ""}\u4E5F\u53EF\u4EE5\u4E0D\u767B\u5165\uFF0C\u76F4\u63A5\u4EE5\u8A2A\u5BA2\u5B8C\u6210\u6A21\u64EC\u7D50\u5E33\u3002</p>${state.orders.length ? `<div class="detail-notes"><p>\u672C\u6A5F\u793A\u610F\u8A02\u55AE</p>${state.orders.map((o) => `<p><a class="inline-link" href="#order/${esc(o.id)}" data-action="close-link">${esc(o.id)} \xB7 ${ORDER_STATUS_LABELS[o.status]}</a></p>`).join("")}</div>` : ""}</div>`,
    "\u5C55\u793A\u6703\u54E1"
  );
}
function admin() {
  const total = state.orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);
  $("#main").innerHTML = `<div class="page-width"><div class="page-title admin-head"><div><p class="eyebrow">OWNER'S DESK / DEMO</p><h1>\u5E97\u4E3B\u7684\u5C0F\u5DE5\u4F5C\u684C</h1></div><button class="secondary" data-action="reset">\u91CD\u8A2D\u5168\u90E8\u793A\u610F\u8CC7\u6599</button></div><div class="notice"><strong>\u5F8C\u53F0\u8A66\u4F5C \xB7 \u6C92\u6709\u6B63\u5F0F\u6B0A\u9650\u9A57\u8B49</strong>\u53EA\u8ABF\u6574\u6B64\u700F\u89BD\u5668\u7684\u793A\u610F\u8CC7\u6599\u3002\u5546\u54C1 ${state.products.length} \u6B3E\u3001\u8A02\u55AE ${state.orders.length} \u7B46\u3001\u672A\u53D6\u6D88\u793A\u610F\u91D1\u984D ${money(total)}\u3002\u5EAB\u5B58\u662F\u53EF\u8CFC\u8CB7\u914D\u984D\uFF1B\u6B63\u5F0F\u7CFB\u7D71\u9700\u7531\u5F8C\u7AEF\u4EA4\u6613\u8655\u7406\u3002</div><div class="admin-tabs"><button class="tab ${adminTab === "orders" ? "active" : ""}" data-admin-tab="orders">\u8A02\u55AE\u7BA1\u7406</button><button class="tab ${adminTab === "inventory" ? "active" : ""}" data-admin-tab="inventory">\u5EAB\u5B58\u8207\u9810\u8CFC\u914D\u984D</button></div><div class="admin-table-wrap">${adminTab === "orders" ? `<table class="admin-table"><thead><tr><th>\u8A02\u55AE / \u6536\u4EF6\u4EBA</th><th>\u5167\u5BB9</th><th>\u91D1\u984D</th><th>\u72C0\u614B</th><th>\u64CD\u4F5C</th></tr></thead><tbody>${state.orders.length ? state.orders.map((o) => `<tr><td><a class="inline-link" href="#order/${esc(o.id)}">${esc(o.id)}</a><br>${esc(o.customer.name)}</td><td>${o.itemCount} \u4EF6 \xB7 ${o.isMixed ? "\u6DF7\u55AE" : o.hasPreorder ? "\u9810\u8CFC" : "\u73FE\u8CA8"}<br>${o.hasPreorder ? "\u9810\u8CFC\u5230\u9F4A\u6574\u55AE\u5BC4" : "\u4E00\u6B21\u5BC4\u51FA"}</td><td>${money(o.total)}</td><td><span class="status-pill">${ORDER_STATUS_LABELS[o.status]}</span><br>${PAYMENT_STATUS_LABELS[o.paymentStatus]}</td><td><button class="small-button" data-cancel="${esc(o.id)}" ${o.status !== "preparing" ? "disabled" : ""}>\u53D6\u6D88\u4E26\u56DE\u88DC</button></td></tr>`).join("") : '<tr><td colspan="5">\u5C1A\u7121\u793A\u610F\u8A02\u55AE\uFF0C\u5148\u5230\u524D\u53F0\u5B8C\u6210\u4E00\u6B21\u6A21\u64EC\u7D50\u5E33\u3002</td></tr>'}</tbody></table>` : `<table class="admin-table"><thead><tr><th>\u5546\u54C1</th><th>\u984F\u8272 / \u5C3A\u5BF8</th><th>\u4F9B\u8CA8\u65B9\u5F0F</th><th>\u53EF\u8CFC\u8CB7\u914D\u984D</th></tr></thead><tbody>${state.products.flatMap((p) => p.variants.map((v) => `<tr><td>${esc(p.name)}</td><td>${esc(v.color)} / ${esc(v.size)}</td><td>${v.preorder ? `\u9810\u8CFC \xB7 \u7D04${v.leadDays}\u5929` : "\u73FE\u8CA8"}</td><td><form class="stock-form" data-stock-form="${esc(v.id)}"><input class="stock-input" aria-label="${esc(p.name)}${esc(v.color)}${esc(v.size)}\u914D\u984D" name="stock" type="number" min="0" max="99999" step="1" required value="${v.stock}"><button class="small-button" type="submit">\u5132\u5B58</button></form></td></tr>`)).join("")}</tbody></table>`}</div><p class="fineprint admin-bottom">\u300C\u6B3E\u5F0F\u7121\u4E0A\u9650\u300D\u70BA\u6B63\u5F0F\u5546\u57CE\u7684\u9700\u6C42\uFF1B\u9019\u7248\u4F7F\u7528 8 \u6B3E\u793A\u610F\u5546\u54C1\u3002\u5546\u54C1\u65B0\u589E\u3001\u6B63\u5F0F\u6703\u54E1\u3001\u652F\u4ED8\u3001\u7269\u6D41\u3001\u96FB\u5B50\u767C\u7968\u8207\u8DE8\u88DD\u7F6E\u5EAB\u5B58\uFF0C\u7559\u5F85\u5F8C\u7AEF\u968E\u6BB5\u3002</p></div>`;
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
  const el = event.target.closest(
    "button,a,[data-backdrop]"
  );
  if (!el) return;
  try {
    if (el.dataset.backdrop && event.target === el) {
      closeModal();
      return;
    }
    if (el.dataset.filter) {
      filter = el.dataset.filter;
      category = "\u5168\u90E8";
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
      const old = selectedProduct.variants.find(
        (v) => v.id === selectedVariant
      );
      selectedVariant = (selectedProduct.variants.find(
        (v) => v.color === el.dataset.color && v.size === old.size
      ) ?? selectedProduct.variants.find((v) => v.color === el.dataset.color)).id;
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
        state.products
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
      if (!confirm("\u53D6\u6D88\u9019\u5F35\u793A\u610F\u8A02\u55AE\u4E26\u56DE\u88DC\u914D\u984D\uFF1F\u4E0D\u6D89\u53CA\u5BE6\u969B\u9000\u6B3E\u3002")) return;
      const found = state.orders.find((o) => o.id === el.dataset.cancel);
      const result = cancelMockOrder(found, state.products);
      state.products = result.products;
      state.orders = state.orders.map(
        (o) => o.id === found.id ? result.order : o
      );
      save();
      admin();
      toast("\u793A\u610F\u8A02\u55AE\u5DF2\u53D6\u6D88\uFF0C\u914D\u984D\u5DF2\u56DE\u88DC\u4E00\u6B21\u3002");
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
          state.products
        );
        save();
        header();
        closeModal();
        toast("\u5DF2\u52A0\u5165\u8CFC\u7269\u888B\uFF0C\u7E7C\u7E8C\u6311\u9078\u559C\u6B61\u7684\u65E5\u5E38\u3002");
        break;
      case "checkout":
        closeModal();
        if (location.hash === "#checkout") checkout();
        else location.hash = "#checkout";
        break;
      case "fill-demo": {
        const form = $("#checkout-form");
        for (const [key, value] of Object.entries({
          name: "\u793A\u610F\u6536\u4EF6\u4EBA",
          phone: "0900000000",
          email: "demo@example.com",
          store: "7-ELEVEN \u8863\u5E8F\u793A\u610F\u9580\u5E02\uFF08\u975E\u771F\u5BE6\u9580\u5E02\uFF09"
        }))
          form.elements.namedItem(key).value = value;
        break;
      }
      case "demo-login":
        state.member = !state.member;
        save();
        closeModal();
        header();
        toast(
          state.member ? "\u5DF2\u9032\u5165\u793A\u610F\u6703\u54E1\uFF0C\u9019\u4E0D\u662F\u771F\u5BE6\u767B\u5165\u3002" : "\u5DF2\u96E2\u958B\u793A\u610F\u6703\u54E1\u3002"
        );
        break;
      case "shipping":
        openModal(
          `<div class="member-dialog"><p class="eyebrow">SHOPPING NOTES</p><h2>\u4E00\u8D77\u62B5\u9054\uFF0C\u525B\u525B\u597D\u3002</h2><p>${SHIPPING_NOTICE}</p><p>\u8A2A\u5BA2\u53EF\u76F4\u63A5\u7D50\u5E33\u3002\u9019\u7248\u53EF\u9AD4\u9A57\u8D85\u5546\u53D6\u8CA8\u3001\u4FE1\u7528\u5361\u6A21\u64EC\u8207\u53D6\u8CA8\u4ED8\u6B3E\u6A21\u64EC\uFF1B\u6C92\u6709\u5BE6\u969B\u7269\u6D41\u6216\u91D1\u6D41\u3002</p><p class="fineprint">\u904B\u8CBB NT$65\u3001\u6EFF NT$2,000 \u514D\u904B\uFF0C\u4EE5\u53CA\u5099\u8CA8\u5929\u6578\u7686\u70BA\u793A\u610F\u8A2D\u5B9A\uFF0C\u9808\u7531\u5E97\u5BB6\u78BA\u8A8D\u3002</p></div>`,
          "\u8CFC\u7269\u8207\u51FA\u8CA8\u8AAA\u660E"
        );
        break;
      case "reset":
        if (confirm("\u6E05\u9664\u9019\u500B\u700F\u89BD\u5668\u5167\u6240\u6709\u793A\u610F\u8CFC\u7269\u8ECA\u3001\u6703\u54E1\u3001\u8A02\u55AE\u8207\u5EAB\u5B58\u4FEE\u6539\uFF1F")) {
          state = fresh();
          checkoutDraft = null;
          save();
          header();
          admin();
          toast("\u793A\u610F\u8CC7\u6599\u5DF2\u91CD\u8A2D\u3002");
        }
        break;
    }
  } catch (error) {
    toast(
      error instanceof Error ? error.message : "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u8ACB\u91CD\u8A2D\u5C55\u793A\u8CC7\u6599\u5F8C\u518D\u8A66\u3002"
    );
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "product-search") {
    query = el.value.trim();
    renderGrid();
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "product-sort") {
    sort = el.value;
    renderGrid();
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();
  if (form.dataset.stockForm) {
    const n = Number(
      form.elements.namedItem("stock").value
    );
    if (!Number.isSafeInteger(n) || n < 0 || n > 99999) {
      toast("\u914D\u984D\u8ACB\u586B 0\u201399999 \u7684\u6574\u6578\u3002");
      return;
    }
    const v = state.products.flatMap((p) => p.variants).find((v2) => v2.id === form.dataset.stockForm);
    v.stock = n;
    save();
    toast("\u793A\u610F\u914D\u984D\u5DF2\u5132\u5B58\u3002");
    return;
  }
  if (form.id !== "checkout-form" || orderSubmitting) return;
  const data = new FormData(form);
  const details = {
    name: String(data.get("name") ?? ""),
    phone: String(data.get("phone") ?? ""),
    email: String(data.get("email") ?? ""),
    store: String(data.get("store") ?? ""),
    method: data.get("method") === "cod" ? "cod" : "card"
  };
  const validation = validateCheckout(details);
  for (const key of ["name", "phone", "email", "store", "method"]) {
    const error = $(`[data-error="${key}"]`, form);
    if (error) error.textContent = validation.errors[key] ?? "";
    const input = form.elements.namedItem(key);
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement)
      input.setAttribute("aria-invalid", String(!!validation.errors[key]));
  }
  if (!validation.valid) {
    const key = Object.keys(validation.errors)[0];
    form.elements.namedItem(key)?.focus();
    return;
  }
  orderSubmitting = true;
  try {
    const id = `DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const result = createMockOrder(state.cart, details, state.products, {
      id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      existingOrders: state.orders
    });
    state.products = result.products;
    state.orders.unshift(result.order);
    state.cart = [];
    checkoutDraft = null;
    save();
    location.hash = `#order/${result.order.id}`;
  } catch (error) {
    $("#checkout-error").textContent = error instanceof Error ? error.message : "\u6A21\u64EC\u8A02\u55AE\u672A\u5EFA\u7ACB\u3002";
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
      ...document.querySelectorAll(
        '.dialog button:not(:disabled),.dialog a,.dialog input,.dialog select,.dialog summary,[role="dialog"]'
      )
    ].filter((e) => e.getAttribute("tabindex") !== "-1");
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (!nodes.includes(document.activeElement)) {
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
//# sourceMappingURL=app.js.map
