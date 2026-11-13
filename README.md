# 衣序 SELECT · 服飾商城互動試作

這是 XK System 的第一版原創服飾商城原型。品牌「衣序 SELECT」、8 款商品、價格、照片、材質、備貨天數及運費政策均為示意。

**假商品、模擬交易；不會收款或寄出商品。請勿填入真實個資。**

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

原始碼公開上傳已獲授權，產品儲存庫為 [codex-xk-apparel-store](https://github.com/xk2022/codex-xk-apparel-store)。靜態預覽採 `gh-pages` 分支，將建置後 `dist/` 的內容放在該分支根目錄。

首次啟用需由使用者開啟 [GitHub Pages 設定](https://github.com/xk2022/codex-xk-apparel-store/settings/pages)，依序選擇：

1. Source：`Deploy from a branch`。
2. Branch：`gh-pages`，資料夾：`/(root)`。
3. 按下 `Save`，等待 GitHub 完成發布。

預定網址為 https://xk2022.github.io/codex-xk-apparel-store/，**尚待啟用與驗證，目前不代表已可開啟**。發布後仍須確認圖片、腳本及選購流程；這只提供模擬原型，沒有正式交易服務。

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
