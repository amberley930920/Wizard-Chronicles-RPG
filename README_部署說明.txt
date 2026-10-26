# 魔法人生｜Gemini AI + Netlify

## 這個專案包含
- `index.html`：原本的魔法人生網頁遊戲，加入自由輸入的 Gemini AI 呼叫。
- `netlify/functions/game-ai.mjs`：後端 API 代理，金鑰不會公開到瀏覽器。
- `netlify.toml`：Netlify 部署設定。

## Netlify 設定
1. 將整個資料夾的內容放進 GitHub repository 的根目錄（不要只上傳 index.html）。
2. 在 Netlify 將此 repository 連到網站，或建立新的 Netlify site。
3. 在 Netlify 的環境變數設定中新增 `GEMINI_API_KEY`，值為 Google AI Studio 的 API key；Scope 至少包含 Functions。
4. 可選：新增 `GEMINI_MODEL`，值預設為 `gemini-3.5-flash`。若模型不可用，請改成該 API key 的帳戶可用且支援 `generateContent` 的模型 ID。
5. 儲存設定後重新部署。
6. 開啟網站，建立或載入角色，在自由輸入欄輸入一個行動。自由輸入會呼叫 AI；畫面上的固定選項仍使用原有遊戲分支。

## 注意
- 不要把 API key 寫進 `index.html`、GitHub 或聊天訊息。
- 公開網站的訪客也可能呼叫此 AI 端點，可能消耗你的免費額度；請定期查看 Google AI Studio 的用量/配額，必要時限制網站存取。
- 免費額度、模型可用性和限制由 Google 帳戶與當前政策決定，不保證永久免費。
