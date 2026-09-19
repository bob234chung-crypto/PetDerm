# 手機相片模型（v1）

現時**沒有臨床病灶相片也可以開發**：先跑 ImageNet 預訓練 encoder，示範圖只作煙霧測試，**不可當訓練集或效能證據**。

## 未有相片時可以點做

1. **用 App 入面「載入示範四視角」**  
   只驗證 QC → ONNX → 分流介面。種子 SVG／JPEG 不是病變真相。
2. **自己用手機拍 4 張任何東西**（寵物皮膚、橙子、布）跟 SOP：定位 + 正面 + 兩個斜角，旁邊放一把尺。  
   用來試拍攝流程同模型能不能跑，**不要標惡性／良性**。
3. **真正訓練要用嘅資料**（之後先收集）  
   合作診所、知情同意、**採樣前**相片，再連結足夠組織嘅病理。  
   未取樣、失訪、FNA「未見 MCT」都唔可以當陰性。
4. **唔好用**  
   CATCH／任何 H&E 全玻片、網上下載無同意嘅寵物 Tumblr 圖、人類皮膚 ISIC 當犬隻惡性標籤。

公開犬隻「皮損類型」研究圖（例如皮膚病外觀分類）最多只可考慮做**自監督／域適應**，標籤唔等於病理惡性。

## 指令

```bash
npm run model:fetch
python ml/export_dataset.py
python ml/train.py --dry-run
```

有 GPU／想自己匯出 EfficientNet-B0 embedding：

```bash
pip install -r ml/requirements.txt
python ml/export_onnx.py
```

未滿足夠獨立、病理確定嘅犬隻，`train.py` 會拒絕擬合，避免假準確度。
