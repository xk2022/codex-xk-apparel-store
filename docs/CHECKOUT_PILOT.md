# 衣序 SELECT 現貨結帳本機整合

2026-11-25 UTC，主要來源 [APP-02 #5](https://github.com/xk2022/codex-xk-apparel-store/issues/5)。使用者授權本機API整合、測試資料、驗收後push並開兩個PR，待驗收再合併；不正式部署、不收款、不使用真實個資。原AGENTS的展示版限制由本次明確指示擴充為本機資料庫試行，其餘規則保留。

## 啟動與操作

先依 [Little Me pilot說明](https://github.com/xk2022/xk-app-little-me-inventory/blob/feat/apparel-checkout-pilot/doc/apparel-checkout-pilot.md) 啟動PostgreSQL17、建立獨立 `apparel_pilot` 及 `apparel_pilot_test`，用 `apparel-pilot` profile啟動後端8091，再執行 `node scripts/seed-apparel-pilot.mjs` 建立測試商品。Little Me管理前端以 `BACKEND_PROXY_TARGET=http://localhost:8091` 啟動在5173。

衣序repo需要Node24：

```bash
npm ci
APPAREL_API_BASE_URL=http://localhost:8091 npm run dev:pilot
```

`APPAREL_PORT` 可改本機port，預設5175。upstream僅接受本機HTTP origin，server僅監聽127.0.0.1。此設定只進入本機代理，不寫入公開build；不要直接編輯產生的dist或review.html。

- 現貨API頁：`http://localhost:5175/`，選衣序測試上衣→橄欖綠S→入袋→本機結帳→填入示意資料→送出。S庫存一件、單價890、運費65、總額955。
- 原展示：`http://localhost:5175/?mode=demo`，原8款商品、預購、混單與模擬訂單保持原樣。
- 離線展示：`http://localhost:5175/review.html`，或直接開產生的review.html，所有圖片仍內嵌且不發API請求。
- 真正共用訂單後台：`http://localhost:5173/`，開發帳密owner / local-change-me，在「IG 手動接單」搜尋商城單號或SKU，可查看來源衣序商城、單價、小計、運費、總額及測試未收款狀態，並取消回補。衣序原 `#admin` 是展示後台，不是資料庫管理入口。

本機購物袋、示意顧客、pending key/payload與收據快照使用獨立storage namespace，不讀原展示資料。API失敗保留袋與輸入，不建立模擬成功單。送出前先保存key與完全相同payload；網路回應遺失或刷新後仍可重試原送出，即使目錄已顯示該SKU不可售。修改內容會建立新key；上筆結果未知時請先重試確認，避免另建一次結帳意圖。

前端不送成交價格；後端依發布／啟用／售價／數量檢查並計算金額。運費65／滿2000免運為本機示意規則，由shipping-policy讀取且後端計算。公開API只有可售布林，不顯示真庫存件數。付款固定TEST_ONLY，不收卡號、不收款、不出貨。

## 檢查與驗收

```bash
npm test  # TypeScript + build + 原25個模型/DOM/產物測試 + pilot測試
```

沒有獨立lint script，沿用既有TypeScript編譯與測試檢查，不捏造lint結果。新增Happy DOM覆蓋本機商品與政策、CSRF送出、保袋／表單、刷新重試相同key、持久化失敗不送單等。跨庫真正瀏覽器驗收腳本位於Little Me `scripts/apparel-acceptance.mjs`；資料庫三情境由Little Me真PostgreSQL整合測試執行，沒有用mock冒充庫存交易。

受測版本：商城 `e693119bcb587c17ccafc039873a34daddfd3ce5`；Little Me `0104bb4506b037972a4b795c3cf72f4e66ab2654`。此後僅補交接／證據提交；兩PR連結統一記於主要Issue #5，待使用者驗收後再合併。

- `npm test` 34/34通過：原25案完整保留，新增9案；TypeScript/build與review.html產物檢查一併通過。沒有額外lint script，未虛報。
- Little Me前端lint/typecheck/16tests/build通過；後端Maven clean verify 25/25真PostgreSQL測試通過，包含三項交易要求及V1→V2舊IG資料保留。
- Chromium390px與1440px實際由衣序頁面選S、入袋、填示意資料、送出。在後端成功後丟失回應，刷新仍以同key／body取得原單；後台查到同單，來源STOREFRONT、SKU APP-PILOT-001-OLIVE-S、1件、單價890、運費65、總額955、TEST_ONLY。
- 最後瀏覽器驗收單 LM-F30F2839-65D9-4E34，取消兩次後S庫存1，該單ORDER與CANCEL各1且原異動關聯正確；沒有真付款。重跑留下其他已取消的測試單，各屬不同驗收意圖，不是同key重複。
- PostgreSQL三情境：同key並行僅一單一次扣庫、IG與商城競爭最後一件僅一成功且stock0、取消重送只回補一次至stock1。完整SQL及截圖見Little Me交接文件。
- 最後代理修正 e693119 只將未連線HTTP502改503配合E0503；以真5176→未服務5999確認503／E0503／+08:00，並重跑34tests。

證據：[手機收據](evidence/checkout-pilot/store-order-mobile.png)、[瀏覽器結果](evidence/checkout-pilot/result.json)；跨庫資料庫與後台證據見 [Little Me完整驗收](https://github.com/xk2022/xk-app-little-me-inventory/blob/feat/apparel-checkout-pilot/doc/apparel-checkout-pilot.md)。實體手機、正式API／付款／物流／個資流程未驗收；公開Pages及gh-pages分支本輪不更新。

## 交接與剩餘工作

執行總管負責跨庫驗收與PR；商城開發負責UI／代理，後端開發負責JDBC交易／Flyway，獨立驗收核對SQL結果。來源與查核日均為2026-11-25 UTC。此工作包與已結案APP-01分開追蹤，不在管理中心複製任務。日曆未排定，因未指定期限及未要求日程同步。正式部署、金物流與預購後端屬後續另行授權範圍；本輪PR保持未合併供使用者驗收。
