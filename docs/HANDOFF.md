# 服飾原型交接

日期：2026-11-13｜暫名：衣序 SELECT

## 本輪目標

交付首頁／商品、商品詳情、現貨預購混單購物車、訪客結帳與店主後台示意，搭配需求、資料模型及驗收清單。原始碼公開上傳已獲授權，線上預覽採 GitHub Pages。

## 已定營運規則

- XK System 自建，台灣銷售，不設平台商品數量配額。
- 款式×顏色×尺寸分別管理；原型使用假資料與示意可購量。
- 現貨與預購可混單，預購到齊後整單寄出，採一次運費。
- 允許訪客購買，保留會員功能；本輪不提供正式身分驗證。
- 商家負責收款、出貨與開票；正式串接前需確認申請資格、服務帳戶與介接需求。

## 文件入口

- [需求與原型邊界](REQUIREMENTS.md)
- [正式資料模型候選草案](DATA_MODEL.md)
- [驗收與實際證據](ACCEPTANCE.md)
- [示意素材來源](ASSET_SOURCES.md)

## 本輪實作狀態

2026-11-13 本機互動原型、8款商品與9張示意照片、單檔離線預覽、原碼及文件已完成。`npm test`：25/25通過（15模型、6 happy-dom介面互動、4離線產物）。TypeScript編譯及靜態成品建置成功。瀏覽器視覺、手機觸控及正式服務均未驗收。

原型資料留在使用者瀏覽器，不能用來存放真會員、訂單、卡號、商家憑證或營運庫存。假商品價格、備貨日數、尺寸／材質以及「運費 NT$65、滿 NT$2,000 免運」皆是可調的流程示意。

## 交付與驗證

| 項目 | 目前紀錄 |
| --- | --- |
| 產品 GitHub 儲存庫 | [xk2022/codex-xk-apparel-store](https://github.com/xk2022/codex-xk-apparel-store)；已授權 public 交付，原碼在 main，成品在 gh-pages |
| 原碼版本 | 原型版本 0.1.0；[PR #2](https://github.com/xk2022/codex-xk-apparel-store/pull/2) 已合併，程式提交為 [`9ddcf3c`](https://github.com/xk2022/codex-xk-apparel-store/commit/9ddcf3cbaa2dcc32b7d7eae2da366b874307467e) |
| 原碼 CI | [run 43359111154](https://github.com/xk2022/codex-xk-apparel-store/actions/runs/43359111154) 成功，對應程式提交 `9ddcf3c` |
| GitHub Pages | 已啟用 `gh-pages` 分支根目錄；成品提交 [`302f958`](https://github.com/xk2022/codex-xk-apparel-store/commit/302f9580fa6b74f153964d8834274510f5f638cc)，[部署 run 43359061053](https://github.com/xk2022/codex-xk-apparel-store/actions/runs/43359061053) 成功 |
| 線上預覽 | https://xk2022.github.io/codex-xk-apparel-store/ |
| HTTP／產物核對 | 2026-11-13 03:29 UTC／11:29 Asia/Taipei，含首頁在內共 17 個公開檔案皆 HTTP 200，內容與本地 `dist/` 逐檔一致 |
| 離線交付 | `review.html` 單檔離線版及 `dist/` 已建置 |
| 自動測試 | `npm test` 25/25通過，詳見ACCEPTANCE.md |
| 瀏覽器 QA | 受環境限制，未做視覺／觸控驗收；happy-dom不是瀏覽器QA |
| 本輪任務／下一階段 | [Issue #1](https://github.com/xk2022/codex-xk-apparel-store/issues/1) 已完成本輪原碼與線上試作交付並關閉；客戶風格／選購流程回饋及真實瀏覽器驗收屬下一階段，尚未進行 |

## 下一輪

1. 原始碼在 main，建置成品在 `gh-pages`；後續修改執行 `npm test`，將 `dist/` 內容更新至成品分支。
2. Pages 已發布；需要重新設定時，可在 [Pages 設定](https://github.com/xk2022/codex-xk-apparel-store/settings/pages) 核對 Source=`Deploy from a branch`、Branch=`gh-pages`、資料夾=`/(root)`。每次更新成品後確認部署結果與公開資源內容。
3. 下一階段另排客戶手機／桌面風格、混單流程回饋，以及真實瀏覽器視覺、觸控與無障礙驗收，目前尚未進行。現有 HTTP 核對與 DOM 測試不能視為 E2E 驗收。
4. 定品牌、素材、首批 SKU、流量、預購供應上限、取消／退款與營運預算；正式版架構與商家介接核准後，再安排真實會員、DB、庫存交易、金物流與發票。
