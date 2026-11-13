# 衣序 SELECT · 服飾商城互動試作

這是 XK System 的第一版原創服飾商城原型。品牌「衣序 SELECT」、8 款商品、價格、照片、材質、備貨天數及運費政策均為示意。

**假商品、模擬交易；不會收款或寄出商品。請勿填入真實個資。**

已發布的線上預覽：[開啟衣序 SELECT](https://xk2022.github.io/codex-xk-apparel-store/)。

## 體驗與建置

使用 Node.js 24 LTS 與 npm：

```sh
npm ci
npm test
```

建置會產生兩種交付：

- `review.html`：CSS、JavaScript 與 9 張照片內嵌的單一檔案。下載後直接以現代瀏覽器開啟，可離線操作，不必安裝開發工具。
- `dist/`：一般靜態網站成品，可交付支援靜態檔案的主機；`dist/index.html` 的 ES modules 需透過 HTTP 使用。

兩者都不依賴外部圖片、字型或支付服務。`review.html` 與 `dist/` 由建置產生，不納入原碼版本。

## GitHub Pages 預覽

公開產品儲存庫為 [codex-xk-apparel-store](https://github.com/xk2022/codex-xk-apparel-store)，線上預覽已發布於 https://xk2022.github.io/codex-xk-apparel-store/ 。原始碼在 `main`，建置後 `dist/` 的內容放在 `gh-pages` 分支根目錄。

2026-11-13 03:29 UTC／11:29 Asia/Taipei 驗證：含首頁在內共 17 個公開檔案皆回傳 HTTP 200，內容與本地 `dist/` 逐檔一致；原始碼 CI 與 Pages 部署均成功。詳細提交與驗證紀錄見 [驗收證據](docs/ACCEPTANCE.md)。[Issue #1](https://github.com/xk2022/codex-xk-apparel-store/issues/1) 已完成本輪原碼與線上試作交付。客戶風格／流程回饋，以及真實瀏覽器視覺、手機觸控與無障礙驗收屬下一階段，尚未進行，後續另排工作。

後續更新先執行 `npm test`，再將新建置的 `dist/` 內容更新至 `gh-pages`；`main` 的程式修改不會自行同步到成品分支。Pages 目前已啟用，需要重新設定時可至 [GitHub Pages 設定](https://github.com/xk2022/codex-xk-apparel-store/settings/pages) 核對：

1. Source：`Deploy from a branch`。
2. Branch：`gh-pages`，資料夾：`/(root)`。
3. 設定變更後按 `Save`，等待 GitHub 完成發布，再核對網址與資源。

## 可以操作的流程

1. 首頁、分類、現貨／預購篩選、搜尋與價格排序。
2. 商品詳情、顏色與尺寸規格、數量與缺貨限制。
3. 現貨＋預購混單購物袋，數量修改與一次運費。
4. 訪客結帳、示意門市、信用卡或超商取貨付款模擬。
5. 訂單確認、展示會員、店主訂單與庫存配額管理、取消回補及重設。

已確認規則：**預購到齊後整單寄出，一次運費。**

待店家確認的示意假設：運費 NT$65、滿 NT$2,000 免運、各 SKU 可購量及交期。照片不會隨顏色切換，畫面有明確提示。

資料保存在當前瀏覽器 `localStorage`；停用儲存時會退回當次記憶體。展示會員及後台沒有正式身分驗證。這不是可營運的商城，不具備真實會員、資料庫、多人庫存鎖、金物流、發票、退款或通知功能。

## 維護入口

- `src/catalog.ts`：8 款商品與 SKU 假資料。
- `src/model.ts`：購物車、金額、訂單快照與回補的純函式。
- `src/app.ts`：介面互動與本機資料儲存。
- `styles.css`：原創暖白／中性色的響應版型。
- [需求](docs/REQUIREMENTS.md)、[資料模型草案](docs/DATA_MODEL.md)、[驗收證據](docs/ACCEPTANCE.md)、[交接](docs/HANDOFF.md)、[照片來源與授權](docs/ASSET_SOURCES.md)。

測試包括 TypeScript 編譯、Node 資料模型測試、happy-dom 介面整合及離線產物檢查。DOM 測試不能取代真實瀏覽器的排版、手機觸控與無障礙檢查；本輪未完成瀏覽器視覺 QA。

原始照片的權利依各來源授權；本專案未附加開源授權。請勿複製參考商店的品牌、文案、圖片或原碼。
