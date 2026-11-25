# 衣序 SELECT｜現貨＋預購混單本機整合

2026-11-25 UTC。[主要任務 APP-03 #7](https://github.com/xk2022/codex-xk-apparel-store/issues/7)。本次使用者授權本機測試交易、兩庫 push 與 PR，待驗收後合併；本輪不 merge、不部署、不收款或出貨。原 AGENTS 的展示限制依明確指示擴充為本機資料庫串接，示意商品、運費、交期與不用真實個資的限制保留。

沿用 [上一輪 checkout pilot](CHECKOUT_PILOT.md) 的本機代理、CSRF、持久化 pending payload/key 與獨立 PostgreSQL。兩庫從最新 main 建立 `feat/preorder-mixed-checkout`；衣序基底 `5020a1427700a614e29ae41190904e88fea62556`，Little Me 基底 `af67863d2819c5c474174ec7002852a7ff7de1fc`。適用 AGENTS、README、API 契約與上一輪驗收已讀。

## 啟動

先在 Little Me repo 依 [混單整合說明](https://github.com/xk2022/xk-app-little-me-inventory/blob/feat/preorder-mixed-checkout/doc/preorder-mixed-checkout.md) 啟動 PostgreSQL17（獨立 `apparel_pilot`、`apparel_pilot_test`）、後端與管理前端。既有 V2 庫由 Flyway 升級 V3；不改舊 migration、不重設業務資料。

```bash
# Little Me 根目錄；先依該庫範例設定 .env.apparel-pilot
./scripts/dev-apparel-pilot.sh
node scripts/seed-mixed-pilot.mjs

# Little Me frontend/，另開 terminal
BACKEND_PROXY_TARGET=http://localhost:8091 npm run dev -- --host 0.0.0.0 --port 5173

# 衣序根目錄，Node24，另開 terminal
npm ci
APPAREL_API_BASE_URL=http://localhost:8091 npm run dev:pilot
```

`APPAREL_PORT` 預設5175，本機 server 只監聽127.0.0.1，upstream僅接受本機HTTP origin。設定只進入代理，不寫入公開 build。Cloud localhost屬執行環境，非使用者裝置。

- 前台 `http://localhost:5175/`：選「衣序混單測試棉上衣」→現貨1件入袋→再次選同商品→明確點預購1件入袋→結帳填示意資料→確認「預購到齊後整單寄出」→送出。
- 後台 `http://localhost:5173/`：登入本機店家帳號。「商品管理 → 編輯 → 預購設定」可設啟用、剩餘配額、到貨說明；「IG 手動接單」搜尋收據單號，查來源 STOREFRONT、同 SKU 的兩筆供貨明細及金額，整單取消。「庫存管理」分現貨與預購異動，均可查原單關聯。
- 原公開展示 `/?mode=demo`、離線 `/review.html` 仍是8款模擬流程；公開 Pages／gh-pages 本輪未更新。衣序原 `#admin` 是展示後台，真正資料庫訂單請到Little Me。

測試款號 `APP-MIXED-001`、SKU `APP-MIXED-001-OLIVE-S`、單價890、初始現貨1、預購配額2；交期文字明示「本機測試說明」。seed重跑不重設已存在的餘額或訂單。測試中斷請先到後台查單並取消，不直接改SQL餘額。

## 行為與契約

SKU先選規格，再明確選 `STOCK` 或 `PREORDER`。預設現貨，售完時加入鍵停用；即使還有預購配額也不自動切換。購物袋以「SKU＋供貨方式」識別，同SKU兩種供貨各自增減、移除，逐項顯示供貨方式、數量及已填到貨說明。

前端不送成交價格。後端核對發布、規格啟用、預購啟用／可售、價格、數量，從整單小計計算一次運費。混單保存當時單價、到貨說明與「預購到齊後整單寄出」。示意運費65／滿2000免運由後端政策決定，不是店家承諾。

建單、扣現貨／占預購、異動與冪等鍵同一資料庫交易；任一項不足全回滾。新鍵把供貨方式納入內容比對，同鍵同內容回原單、改內容409；舊缺省供貨方式的 pending body保留原bytes並視為STOCK。API失敗保留購物袋、顧客輸入與已送payload/key，不用模擬單代替。後端成交後回應遺失，刷新仍可用原body/key重試，即使目錄已不可售。再次填入相同示意資料也保留原key；改實際內容屬新結帳意圖，上次未知時應先重試原單。

公開目錄只含可售布林與到貨說明，不含現貨／配額實數。收據固定TEST_ONLY，不收卡號或付款。取消由店家後台依原供貨明細回補兩個池，各執行一次。

## 實際檢查與畫面

```bash
npm test  # tsc --noEmit、build、Node模型、Happy DOM、公開／離線產物檢查

# 三個服務運行後，Little Me根目錄
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/mixed-checkout-acceptance.mjs
```

沒有獨立lint script，沿用既有檢查，不虛報lint。一般電腦可於Little Me frontend先執行 `npx playwright install chromium` 並省略Chromium路徑。本次Node24.22.3、Chromium156；Little Me使用JDK21.0.13、Spring Boot3.5.14、Maven3.9.11、PostgreSQL17.12。

受測程式SHA：衣序 `056f95ff78069ae62c9c81204a73c8f3db58911a`，Little Me `0ecb75c4dc2cb393b2d0d9080b215bece66bff3d`；完整命令、後端程式與驗收腳本SHA關係見 [verification.json](evidence/preorder-mixed/verification.json)。後續文件／證據commit不改程式。

| 驗收 | 結果 |
| --- | --- |
| 衣序 npm test | 44/44；原34保留，新增混單9＋同值示意資料重送回歸1；含型別、正式／離線build |
| Little Me 管理前端 | lint/typecheck/build通過，25tests通過 |
| Little Me Maven clean verify | 真PG獨立測試庫38tests通過，含V2→V3與空庫migration |
| 手機390px→後台、桌面1440px | 同SKU現貨＋預購選購、保袋失敗／刷新重送、後台查同單與取消完成；JS錯誤0 |
| 現貨1＋配額2各買1 | 餘額0／1；單價各890，小計1780、運費65一次、總額1845 |
| 配額不足／搶最後名額 | 不足全回滾且現貨仍1；兩筆搶1名額僅1成功，quota0 |
| 結帳重送／取消兩次 | 同單一次扣庫／占額，取消各回補一次至現貨1／配額2，兩份原異動關聯正確 |
| 舊V2資料與IG相容 | 舊現貨單保留、可查及取消，舊key重送相容；IG仍走原現貨流程 |

證據：[手機混單購物袋](evidence/preorder-mixed/mixed-bag-mobile.png)、[手機收據](evidence/preorder-mixed/mixed-receipt-mobile.png)、[後台兩筆同SKU明細](evidence/preorder-mixed/admin-mixed-desktop.png)、[瀏覽器結果及兩份異動](evidence/preorder-mixed/result.json)。完整PostgreSQL、升級與管理手機畫面在 [Little Me交接](https://github.com/xk2022/xk-app-little-me-inventory/blob/feat/preorder-mixed-checkout/doc/preorder-mixed-checkout.md)。

最終頁面驗收單 `LM-7869C66A-812D-48D4`（id7）：來源STOREFRONT、TEST_ONLY、兩筆同SKU各1件、運費65、總額1845。手機後台取消一次、API重送取消一次，SQL確認現貨1／配額2；兩池ORDER與CANCEL各一，均保留原異動關聯。顧客收據為成交快照，取消後狀態由管理端查詢。

未驗收：實體手機觸控、完整無障礙、正式金流／物流／個資與後端託管。本輪只做本機測試，不宣稱正式上線。

執行總管整合跨庫實作與直接驗收；商城、管理前端、後端、獨立交易審查已回報。兩PR、實際SHA及CI更新於主要Issue #7，不在管理中心複製工作包；保持待使用者驗收狀態，尚未合併。來源及查核日2026-11-25 UTC。日曆未排定：未指定期限且未要求同步。使用者剩餘決策為本機驗收後是否合併。
