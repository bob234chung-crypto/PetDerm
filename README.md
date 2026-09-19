# PetDerm 手機相片研究原型

犬隻皮膚／皮下腫塊的**獨立**手機臨床相片研究原型。與 CATCH H&E 全玻片流程分開，第一階段只做研究性「是否需要獸醫進一步評估」分流。

- 不是診斷工具，不能排除 MCT 或癌症
- 不顯示疾病百分比
- 不做 MCT 專屬分類
- 病理標籤只在覆核流程，不進入推論 API

## 本機啟動

```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run model:fetch
npm run dev
```

瀏覽器開啟 [http://localhost:3000](http://localhost:3000)。開發伺服器啟動後可用 `npm run verify` 跑一次同意、四視角上傳、分流、拒答與權限隔離檢查。

## 部署到 Vercel

本機繼續用 SQLite；Vercel 要用 **Neon Postgres** + **Blob**（serverless 不能寫死本機碟）。

1. 在專案根目錄登入：`npx vercel login`
2. 到 [Vercel Dashboard](https://vercel.com/dashboard) → Storage：
   - 建立 **Neon**（或 Postgres），接到呢個專案，會自動有 `DATABASE_URL`／`DIRECT_URL`
   - 建立 **Blob**，接到呢個專案，會自動有 `BLOB_READ_WRITE_TOKEN`
3. 部署：`npx vercel --yes --prod`
4. 第一次上線後，用生產資料庫種子示範資料：

```bash
npx vercel env pull .env.vercel --yes --environment=production
# 暫時用生產 URL 種子（唔好 commit .env.vercel）
set DATABASE_URL=(從 .env.vercel 複製)
npx prisma db seed
```

Windows PowerShell 可以：

```powershell
npx vercel env pull .env.vercel --yes --environment=production
Get-Content .env.vercel | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path env:$($matches[1]) -Value $matches[2].Trim('"') } }
npx prisma db seed
```

手機用 Safari／Chrome 開 Vercel 網址即可，唔使 APK。相片會直傳 Blob，避開 serverless 4.5MB 限制。ONNX 若喺 serverless 載入失敗，會退回研究性「需要獸醫覆核」分流，唔會假裝低風險。

右上角可切換角色（預設係一般用戶，唔使診所帳號）：

| 角色 | 用途 |
|---|---|
| 一般用戶 | 飼主自己同意、建犬／病灶、四視角拍攝、看研究分流結果 |
| 診所人員 | 同一套拍攝流程，欄位用診所代號／拍攝者代號 |
| 病理覆核 | 後補病理連結（與推論輸入隔離） |
| 研究監察 | 去識別收案、QC、拒答、病理連結彙總 |

種子資料含 3 個病灶：惡性／良性／不確定病理標籤各一；第三宗為 QC 拒答示範。

## 品質閘門與分流

- 必須四張：定位、正面近照、兩張斜角
- 檔名含 `reject-` 會觸發拒答（方便演示）
- 通過 QC 的輸入一律 `needs_vet_review`（未校準原型不裝成低風險）
- 拒答不是陰性，介面不用綠色「低風險」

## 模型（未有臨床相片都可以跑）

`photo-triage-v1` 用 ImageNet 預訓練 encoder 抽四視角特徵。示範圖同自己隨手拍只作煙霧測試，**不是訓練集**。詳見 [ml/README.md](ml/README.md)。

```bash
npm run model:fetch
python ml/export_dataset.py
python ml/train.py --dry-run
```

未有足夠病理確定、按犬分組嘅標籤前，訓練腳本會拒絕擬合，亦唔會報準確度。CATCH 全玻片唔可用。

## 資料

SQLite：`prisma/dev.db`。原檔與研究副本分放 `uploads/original/`、`uploads/research/`。研究副本經 JPEG 重編碼以剝離 EXIF。
