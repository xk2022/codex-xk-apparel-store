import {
  checkout,
  loadCatalog,
  pendingCheckout,
  type PilotDraft,
  type PilotProduct,
  type PilotOrder,
  type PilotRequest,
  type PendingCheckout,
  type ShippingPolicy,
} from "./pilot-client.js";

interface BagLine {
  variantId: number;
  quantity: number;
  productName: string;
  styleNo: string;
  color: string;
  size: string;
  unitPrice: number;
  photoUrl: string;
}
interface PilotState {
  cart: BagLine[];
  draft: PilotDraft;
  pending?: PendingCheckout;
  orders: PilotOrder[];
}
const blankDraft = (): PilotDraft => ({
  name: "",
  phone: "",
  email: "",
  store: "",
  note: "",
});
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const money = (v: number) =>
  `NT$ ${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const cents = (v: number) => Math.round(v * 100);

export async function bootPilot(apiBase: string) {
  const base = apiBase.replace(/\/$/, "");
  const key = `xk-apparel-pilot-v1:${new URL(base, location.href).href}`;
  const $ = <T extends Element = HTMLElement>(
    selector: string,
    root: ParentNode = document,
  ) => root.querySelector<T>(selector);
  const main = $("#main")!,
    overlay = $("#overlay-root")!;
  let state: PilotState = { cart: [], draft: blankDraft(), orders: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (
      saved &&
      Array.isArray(saved.cart) &&
      Array.isArray(saved.orders) &&
      saved.draft
    ) {
      state = {
        cart: saved.cart,
        draft: { ...blankDraft(), ...saved.draft },
        orders: saved.orders,
        pending: saved.pending,
      };
    }
  } catch {
    /* Fresh state is safe; demo data is never read. */
  }
  let products: PilotProduct[] = [],
    policy: ShippingPolicy | null = null,
    loading = true,
    loadError = "",
    submitting = false,
    submitError = "",
    previousFocus: HTMLElement | null = null,
    selected: PilotProduct | undefined,
    selectedVariant = 0,
    quantity = 1;
  function persist(required = false) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch {
      if (required)
        throw new Error("瀏覽器無法保存重送識別，請允許本機儲存後再送出。");
      return false;
    }
  }
  function changed() {
    state.pending = undefined;
    submitError = "";
    persist();
  }
  function getRequest(): PilotRequest {
    return {
      customer: {
        name: state.draft.name,
        phone: state.draft.phone,
        email: state.draft.email,
        store: state.draft.store,
      },
      note: state.draft.note,
      items: state.cart
        .map((l) => ({ variantId: l.variantId, quantity: l.quantity }))
        .sort((a, b) => a.variantId - b.variantId),
    };
  }
  function canRetry() {
    return (
      !!state.pending && state.pending.body === JSON.stringify(getRequest())
    );
  }
  function currentVariant(id: number) {
    for (const p of products) {
      const v = p.variants.find((v) => v.id === id);
      if (v) return { p, v };
    }
  }
  function lineImage(line: { photoUrl?: string }) {
    return line.photoUrl
      ? `<img src="${esc(line.photoUrl)}" alt="商品照片">`
      : '<div class="pilot-photo-empty" aria-label="商品尚未提供照片">lm.</div>';
  }
  function totals() {
    const subtotal =
      cents(state.cart.reduce((n, l) => n + l.unitPrice * l.quantity, 0)) / 100;
    const shipping =
      state.cart.length && policy && subtotal < policy.freeShippingThreshold
        ? policy.shippingFee
        : 0;
    return { subtotal, shipping, total: cents(subtotal + shipping) / 100 };
  }
  function summary(s: {
    subtotal: number;
    shipping?: number;
    shippingFee?: number;
    total: number;
  }) {
    return `<div class="totals"><div><span>商品小計</span><span>${money(s.subtotal)}</span></div><div><span>本機測試運費</span><span>${money(s.shippingFee ?? s.shipping ?? 0)}</span></div><div class="grand"><span>合計${"shippingFee" in s ? "快照" : "（預估）"}</span><span>${money(s.total)}</span></div></div>`;
  }
  function notice() {
    return '<div class="notice"><strong>本機測試 · 不收款、不出貨</strong>只接現貨；可售狀態不代表保留庫存，結果以送出時的資料庫交易為準。請使用示意收件資料。</div>';
  }
  function renderHeader() {
    const count = state.cart.reduce((n, l) => n + l.quantity, 0);
    $("#header")!.innerHTML =
      `<div class="header-inner"><a class="brand" href="#shop"><strong>衣序</strong><span>× LITTLE ME</span></a><nav class="main-nav"><a href="#shop">本機現貨</a><a href="?mode=demo#shop">原版展示</a></nav><div class="header-tools"><button class="icon-button" data-action="cart" aria-label="購物袋，${count} 件">購物袋 <span class="count">${count}</span></button></div></div>`;
    $(".demo-banner")!.innerHTML =
      "LOCAL PILOT <span>本機資料庫測試 · 不收款、不出貨 · 請勿填真實個資</span>";
    $("#footer")!.innerHTML =
      '<div class="page-width"><div class="footer-inner"><div><div class="footer-brand">衣序 SELECT × Little Me</div><p>本機 checkout 串接測試</p></div><p class="fineprint">XK SYSTEM · LOCAL PILOT<br>訂單與庫存異動會記錄於本機資料庫；不收款、不出貨。</p><a class="inline-link" href="?mode=demo#shop">切回原版 8 款商品展示</a></div></div>';
  }
  function list() {
    main.innerHTML = `<div class="page-width"><div class="page-title"><p class="eyebrow">LOCAL PILOT / LITTLE ME</p><h1>讓喜歡，接上真實庫存。</h1><p>本機現貨接單測試，請只填示意資料。</p></div>${notice()}${loading ? '<p class="empty" role="status">正在讀取本機商品…</p>' : loadError ? `<div class="empty"><p role="alert">${esc(loadError)}</p><p>未切換成示意商品；購物袋與填寫內容已保留。</p><button class="secondary" data-action="reload">重新讀取</button></div>` : `<section class="collection"><div class="section-heading"><h2>Little Me 現貨</h2><span>${products.length} 件商品</span></div><div class="product-grid">${products.map((p) => `<article class="product-card"><button class="product-photo pilot-product-photo" data-product="${p.id}" aria-label="選擇${esc(p.name)}規格">${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="${esc(p.name)}">` : '<div class="pilot-photo-empty">lm.</div>'}<span class="product-badge">${p.variants.some((v) => v.available) ? "現貨 · 以送出為準" : "暫無可售規格"}</span></button><div class="product-meta"><div><p class="eyebrow">${esc(p.styleNo)}</p><h3>${esc(p.name)}</h3><p>${money(p.price)}</p></div><button class="quick-add" data-product="${p.id}" aria-label="選擇${esc(p.name)}規格">＋</button></div></article>`).join("") || '<p class="empty">目前沒有可公開的現貨商品。您可以保留購物袋，稍後再試。</p>'}</div></section>`}</div>`;
  }
  function modal(content: string, name: string) {
    if (!overlay.firstChild) previousFocus = document.activeElement as HTMLElement;
    overlay.innerHTML = `<div class="overlay"><section class="dialog drawer" role="dialog" aria-modal="true" aria-label="${esc(name)}" tabindex="-1"><button class="close" data-action="close" aria-label="關閉">×</button>${content}</section></div>`;
    document.body.classList.add("overlay-open");
    $(".dialog")?.focus();
  }
  function close() {
    overlay.innerHTML = "";
    document.body.classList.remove("overlay-open");
    const restore = previousFocus?.isConnected ? previousFocus : $<HTMLElement>('#header [data-action="cart"]');
    restore?.focus();
  }
  function detail(id: number) {
    selected = products.find((p) => p.id === id);
    if (!selected || !selected.variants.length) return;
    selectedVariant = (
      selected.variants.find((v) => v.available) || selected.variants[0]
    ).id;
    quantity = 1;
    renderDetail();
  }
  function renderDetail() {
    const active = document.activeElement as HTMLElement | null;
    const focusKey = active?.closest('#product-detail') ? (['variant', 'qty'] as const).find(key => active.dataset[key] !== undefined) : undefined;
    const focusValue = focusKey ? active?.dataset[focusKey] : undefined;
    const p = selected!,
      v = p.variants.find((v) => v.id === selectedVariant)!;
    modal(
      `<div id="product-detail"><p class="eyebrow">${esc(p.styleNo)} / LOCAL PILOT</p><h2>${esc(p.name)}</h2><p class="detail-price">${money(p.price)}</p><p>${esc(p.description)}</p><span class="field-label">顏色 / 尺寸</span><div class="options">${p.variants.map((v) => `<button class="option ${v.id === selectedVariant ? "selected" : ""}" data-variant="${v.id}" aria-pressed="${v.id === selectedVariant}">${esc(v.color)} / ${esc(v.size)}${v.available ? "" : " · 暫無現貨"}</button>`).join("")}</div><p class="availability">${v.available ? "可售 · 數量以送出結果為準" : "此規格目前暫無現貨"}</p><div class="purchase-row"><div class="quantity"><button data-qty="-1" aria-label="減少數量" ${quantity <= 1 ? "disabled" : ""}>−</button><span id="detail-quantity">${quantity}</span><button data-qty="1" aria-label="增加數量">＋</button></div><button class="primary" data-action="add" ${v.available ? "" : "disabled"}>加入購物車</button></div><p class="fineprint">不提供實際庫存件數；加入購物袋不保留庫存。</p></div>`,
      "商品規格",
    );
    if (focusKey) {
      const control = [...overlay.querySelectorAll<HTMLButtonElement>('button')].find(button => button.dataset[focusKey] === focusValue && !button.disabled);
      control?.focus();
    }
  }
  function bag() {
    modal(
      `<h2>購物袋</h2><div class="cart-lines">${state.cart.map((l) => `<div class="cart-item">${lineImage(l)}<div><h3>${esc(l.productName)}</h3><p>${esc(l.styleNo)} · ${esc(l.color)} / ${esc(l.size)}</p><p>${money(l.unitPrice)}</p><div class="quantity"><button data-cart-qty="${l.variantId}" data-value="${l.quantity - 1}" aria-label="減少${esc(l.productName)}數量">−</button><span>${l.quantity}</span><button data-cart-qty="${l.variantId}" data-value="${l.quantity + 1}" aria-label="增加${esc(l.productName)}數量">＋</button></div><button class="remove" data-cart-qty="${l.variantId}" data-value="0">移除</button></div></div>`).join("") || '<p class="empty">購物袋還空著。</p>'}</div>${state.cart.length ? `${notice()}${summary(totals())}<p class="fineprint">預估運費以已讀取的本機政策計算，最後金額由後端核定。</p><button class="primary wide" data-action="checkout">前往本機測試結帳</button>` : ""}`,
      "購物袋",
    );
  }
  function formPage() {
    if (!state.cart.length) {
      main.innerHTML =
        '<div class="page-width"><div class="page-title"><h1>購物袋還空著</h1></div><a class="primary" href="#shop">回到現貨</a></div>';
      return;
    }
    main.innerHTML = `<div class="page-width"><div class="page-title"><p class="eyebrow">LOCAL CHECKOUT / NO PAYMENT</p><h1>本機測試結帳</h1><p>送出會建立本機資料庫訂單並扣庫；不會收款或出貨。</p></div><div class="checkout-layout"><form id="checkout-form" novalidate><div class="panel"><h2>示意收件資料</h2><button type="button" class="inline-link" data-action="fill-demo" ${submitting ? "disabled" : ""}>填入示意資料</button><div class="form-grid" style="margin-top:22px">${[
      ["name", "收件人姓名", "text"],
      ["phone", "手機號碼", "tel"],
      ["email", "Email", "email"],
      ["store", "超商取貨門市（示意）", "text"],
    ]
      .map(
        ([name, label, type]) =>
          `<label ${name === "store" ? 'class="full"' : ""}>${label}<input name="${name}" type="${type}" autocomplete="off" ${submitting ? "disabled" : ""} maxlength="${name === "email" ? 254 : name === "store" ? 120 : 60}" value="${esc(state.draft[name as keyof PilotDraft])}" required><span class="error" data-error="${name}"></span></label>`,
      )
      .join(
        "",
      )}<label class="full">接單備註<textarea name="note" rows="3" maxlength="1000" ${submitting ? "disabled" : ""}>${esc(state.draft.note)}</textarea></label></div>${notice()}<p class="fineprint">此流程不選擇付款方式、不收集卡號。資料只用於本機測試。</p><p class="error" id="checkout-error" role="alert">${esc(submitError)}</p>${canRetry() ? '<p class="notice pilot-retry-note">上次送出結果尚待確認。重試會沿用原本識別碼與完全相同的資料。</p>' : ""}<button class="primary wide" type="submit" ${submitting ? "disabled" : ""}>${submitting ? "正在確認接單…" : canRetry() ? "重試原送出 · 不會重複扣庫" : "送出本機測試接單"}</button></div></form><aside class="panel checkout-summary"><h2>購物袋摘要</h2>${state.cart.map((l) => `<div class="order-mini">${lineImage(l)}<div>${esc(l.productName)}<p>${esc(l.color)} / ${esc(l.size)} × ${l.quantity}</p></div><span>${money(l.unitPrice * l.quantity)}</span></div>`).join("")}${summary(totals())}<p class="fineprint">${policy ? esc(policy.notice) : "政策尚未載入；後端會核定最終金額。"}</p><button class="inline-link" data-action="cart" ${submitting ? "disabled" : ""}>修改購物袋</button></aside></div></div>`;
  }
  function orderPage(id: string) {
    const o = state.orders.find((o) => String(o.id) === id || o.orderNo === id);
    if (!o) {
      main.innerHTML =
        '<div class="page-width"><div class="page-title"><h1>此瀏覽器沒有這筆測試訂單快照</h1></div><a class="primary" href="#shop">回到現貨</a></div>';
      return;
    }
    main.innerHTML = `<div class="page-width"><section class="success"><div class="success-header"><div class="success-symbol">✓</div><p class="eyebrow">LOCAL DATABASE ORDER</p><h1>本機測試接單已建立</h1><p>未收款、不會出貨 · 後端金額快照</p></div><div class="panel"><dl class="definition"><dt>訂單編號</dt><dd>${esc(o.orderNo)}</dd><dt>來源</dt><dd>${esc(o.source)}</dd><dt>訂單狀態</dt><dd>${o.status === "CANCELLED" ? "已取消" : esc(o.status)}</dd><dt>付款狀態</dt><dd>${esc(o.paymentStatus)} · 本機測試，不收款</dd></dl>${o.items.map((i) => `<div class="order-mini pilot-order-item"><div>${esc(i.productName)}<p>${esc(i.styleNo)} · ${esc(i.sku)} · ${esc(i.color)} / ${esc(i.size)} × ${i.quantity}</p><p>單價快照 ${money(i.unitPrice)}</p></div><span>${money(i.lineTotal)}</span></div>`).join("")}${summary(o)}<p class="fineprint">接單會記錄在本機 Little Me 管理端；此頁只保留不含收件資料的回應快照，並非付款成功證明。</p></div><div class="actions"><a class="primary" href="#shop">繼續挑選</a><a class="secondary" href="?mode=demo#shop">原版展示</a></div></section></div>`;
  }
  function route() {
    close();
    renderHeader();
    if (location.hash === "#checkout") formPage();
    else if (location.hash.startsWith("#order/"))
      orderPage(decodeURIComponent(location.hash.slice(7)));
    else list();
  }
  async function reload() {
    loading = true;
    loadError = "";
    route();
    try {
      const result = await loadCatalog(base);
      products = result.products;
      policy = result.policy;
      for (const l of state.cart) {
        const current = currentVariant(l.variantId);
        if (current) {
          l.productName = current.p.name;
          l.styleNo = current.p.styleNo;
          l.unitPrice = current.p.price;
          l.photoUrl = current.p.photoUrl;
        }
      }
      persist();
    } catch (e) {
      loadError = e instanceof Error ? e.message : "商品讀取失敗";
    } finally {
      loading = false;
      route();
    }
  }
  function captureDraft(form: HTMLFormElement) {
    const data = new FormData(form);
    const next: PilotDraft = {
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      store: String(data.get("store") ?? ""),
      note: String(data.get("note") ?? ""),
    };
    if (JSON.stringify(next) !== JSON.stringify(state.draft)) {
      state.draft = next;
      changed();
    }
  }
  async function submit(form: HTMLFormElement) {
    if (submitting) return;
    captureDraft(form);
    const errors: Partial<Record<keyof PilotDraft, string>> = {};
    if (!state.draft.name.trim()) errors.name = "請填寫示意收件人姓名";
    if (!/^09\d{8}$/.test(state.draft.phone))
      errors.phone = "請填寫台灣手機格式的示意號碼";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.draft.email))
      errors.email = "請填寫示意 Email";
    if (!state.draft.store.trim()) errors.store = "請填寫示意門市";
    for (const field of ["name", "phone", "email", "store"] as const) {
      $(`[data-error="${field}"]`, form)!.textContent = errors[field] || "";
      (form.elements.namedItem(field) as HTMLInputElement).setAttribute(
        "aria-invalid",
        String(!!errors[field]),
      );
    }
    if (Object.keys(errors).length) {
      (
        form.elements.namedItem(Object.keys(errors)[0]) as HTMLInputElement
      ).focus();
      return;
    }
    if (!canRetry()) {
      if (loading || loadError || !policy) {
        submitError = "尚未讀到本機商品與政策，請重新讀取後再送出。";
        formPage();
        return;
      }
      const unavailable = state.cart.find(
        (l) => !currentVariant(l.variantId)?.v.available,
      );
      if (unavailable) {
        submitError = `${unavailable.productName}（${unavailable.color} / ${unavailable.size}）目前無法出售；請修改購物袋。`;
        formPage();
        return;
      }
    }
    try {
      state.pending = pendingCheckout(getRequest(), state.pending);
      persist(true);
      submitting = true;
      submitError = "";
      formPage();
      const o = await checkout(base, state.pending);
      state.orders = [o, ...state.orders.filter((old) => old.id !== o.id)];
      state.cart = [];
      state.draft = blankDraft();
      state.pending = undefined;
      persist();
      location.hash = `#order/${encodeURIComponent(o.orderNo)}`;
      renderHeader();
      void loadCatalog(base)
        .then((result) => {
          products = result.products;
          policy = result.policy;
        })
        .catch(() => {
          /* Success remains a confirmed backend snapshot. */
        });
    } catch (e) {
      submitError =
        e instanceof Error ? e.message : "接單結果尚未確認，請重試原送出。";
    } finally {
      submitting = false;
      if (location.hash === "#checkout") formPage();
    }
  }
  document.addEventListener("click", (event) => {
    const el = (event.target as Element).closest<HTMLElement>("button,a");
    if (!el || (el instanceof HTMLButtonElement && el.disabled)) return;
    if (submitting) {
      event.preventDefault();
      return;
    }
    if (el.dataset.product) {
      detail(Number(el.dataset.product));
      return;
    }
    if (el.dataset.variant) {
      selectedVariant = Number(el.dataset.variant);
      quantity = 1;
      renderDetail();
      return;
    }
    if (el.dataset.qty) {
      quantity = Math.max(1, quantity + Number(el.dataset.qty));
      renderDetail();
      return;
    }
    if (el.dataset.cartQty) {
      const n = Number(el.dataset.value);
      if (Number.isSafeInteger(n) && n >= 0) {
        state.cart = state.cart.flatMap((l) =>
          l.variantId === Number(el.dataset.cartQty)
            ? n
              ? [{ ...l, quantity: n }]
              : []
            : [l],
        );
        changed();
        renderHeader();
        bag();
        if (location.hash === "#checkout") formPage();
      }
      return;
    }
    switch (el.dataset.action) {
      case "close":
        close();
        break;
      case "cart":
        bag();
        break;
      case "checkout":
        close();
        if (location.hash === "#checkout") formPage();
        else location.hash = "#checkout";
        break;
      case "reload":
        void reload();
        break;
      case "add": {
        const p = selected!,
          v = p.variants.find((v) => v.id === selectedVariant)!;
        if (!v.available) return;
        const line = state.cart.find((l) => l.variantId === v.id);
        if (line) line.quantity += quantity;
        else
          state.cart.push({
            variantId: v.id,
            quantity,
            productName: p.name,
            styleNo: p.styleNo,
            color: v.color,
            size: v.size,
            unitPrice: p.price,
            photoUrl: p.photoUrl,
          });
        changed();
        close();
        renderHeader();
        break;
      }
      case "fill-demo": {
        state.draft = {
          name: "示意收件人",
          phone: "0900000000",
          email: "demo@example.com",
          store: "衣序本機示意門市（非真實門市）",
          note: state.draft.note,
        };
        changed();
        formPage();
        break;
      }
    }
  });
  document.addEventListener("input", (event) => {
    const form = (event.target as Element).closest<HTMLFormElement>(
      "#checkout-form",
    );
    if (form) captureDraft(form);
  });
  document.addEventListener("change", (event) => {
    const form = (event.target as Element).closest<HTMLFormElement>(
      "#checkout-form",
    );
    if (form) captureDraft(form);
  });
  document.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;
    if (form.id === "checkout-form") {
      event.preventDefault();
      void submit(form);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!overlay.firstChild) return;
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "Tab") {
      const nodes = [
        ...overlay.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a,input,select,textarea",
        ),
      ];
      const first = nodes[0],
        last = nodes.at(-1);
      if (!nodes.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  window.addEventListener("hashchange", route);
  document.title = "衣序 × Little Me｜本機接單測試";
  route();
  await reload();
}
