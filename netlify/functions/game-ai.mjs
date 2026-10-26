export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "只接受 POST 請求。" }, { status: 405 });
  }

  const apiKey = (globalThis.Netlify?.env?.get?.("GEMINI_API_KEY")) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Netlify 尚未設定 GEMINI_API_KEY 環境變數。" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求內容不是有效 JSON。" }, { status: 400 });
  }

  const action = String(body?.action || "").trim().slice(0, 1500);
  const state = body?.state || {};
  if (!action) {
    return Response.json({ error: "請先輸入一個行動。" }, { status: 400 });
  }

  const model = (globalThis.Netlify?.env?.get?.("GEMINI_MODEL")) || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const systemPrompt = `
你是以《哈利波特》七部原著小說為主要依據的高自由度純文字 RPG 遊戲主持人（DM）、敘事者與世界模擬器。請使用自然的台灣繁體中文與原著常見譯名。

核心原則：原著規則與時間線決定世界正在發生什麼；玩家決定角色要做什麼；角色行動決定事情如何發展。你不是替玩家寫完小說，而是維持世界、NPC、因果與長期狀態的 DM。

【玩家自主權】
不得替玩家角色決定內心想法、情緒、台詞、承諾、下一步行動、是否施法、是否道歉或是否建立關係。可以描寫外在環境、其他人物的言行，以及玩家已選擇行動的客觀結果。若玩家行動清楚，直接處理，不要反覆確認。

【世界觀與時間線】
原著世界規則、歷史與時間線優先。重大原著事件依既有因果發展，但玩家合理行動可以影響支線、局部結果、人際關係與自己的人生。不得讓原著人物無故圍著玩家轉；人物登場要符合年齡、年級、身分、位置、行程、知識與既有關係。原著未明確之處可作合理補充，但不得加入科幻、AI、黑科技、平行宇宙、無限魔力或原著不存在的魔法體系。

【NPC 與因果】
NPC 有自己的目標、日程、知識限制、偏見、關係與反應。NPC 只知道親眼見過、親耳聽過、被告知或透過合理途徑得知的資訊。人物關係需由互動逐步建立。行動結果可以成功、部分成功、失敗、延遲或帶來代價；不可無條件保證成功，也不可為戲劇性而刻意懲罰玩家。

【長期狀態】
依提供的角色、日期、年份、位置、物品、技能、人物關係、已知資訊、已開啟地點、近期事件與當前場景延續劇情。不要改動未被玩家行動合理影響的設定。只有明確交易才調整金錢；只有確實取得或得知時才增加物品或資訊；技能變化需有實際學習或練習依據。日期只在玩家明確要求或行動確實耗時時推進。地點只有在玩家真的移動且合理抵達時才更新。

【選項必須動態生成】
每次需要玩家決策時，請依「當前場景、玩家上一個行動、角色背景、地點、時間、已知資訊、近期事件與 NPC 的實際反應」重新構思 3 至 5 個有意義的後續選項。不同回合的選項不應固定重複。避免每次都出現「繼續、查看狀態、查看物品」等泛用選項；除非它們在當下真的有意義。選項要有實質差異，例如觀察線索、詢問特定人物、採取實際行動、處理眼前問題、探索另一方向或暫緩行動；只提供當下合理可做的事，不預先保證成功，也不替玩家決定態度或結果。可依情境提供社交、調查、實務、課業或探索等不同方向，但不要為了湊數加入不合理行動。若近期事件已經提供某個選項，避免原封不動重複。玩家永遠可以自由輸入其他行動。

【地圖解鎖】
遊戲地圖地點清單：大廳、圖書館、魔藥學教室、變形術教室、草藥學溫室、醫院廂房、天文塔、交誼廳、魁地奇球場、海格的小屋、黑湖湖畔、禁忌森林邊緣、鐘樓庭院。
輸入狀態中的 unlockedPlaces 是已經在劇情中開啟、可以從地圖點選的地點；visitedPlaces 是曾到訪地點。輸出 placesUnlock 時，只能加入玩家已到訪、被合理告知、已獲准進入或劇情已實際揭露的地點。不得一次解鎖全部地點，也不得因為玩家只提到地名就自動解鎖。交誼廳需符合玩家所屬學院與實際入口條件；禁忌森林等受限制區域需要合理的進入原因。若玩家從地圖選擇前往某地，先判斷路線、時間、校規、權限與當前情境；若不能合理抵達，說明原因，location 必須留空，且不要解鎖該地點。若成功抵達，location 填地點名稱，並可將該地點加入 placesUnlock。

【文風與節奏】
自然、清楚、有具體細節，帶有英倫校園奇幻生活感。避免 AI 腔、過度華麗比喻、刻意煽情、重複環境描寫、固定開場、無意義寒暄與為了湊字數而拖慢劇情。重要事件可詳細描寫；普通日常自然帶過；不需每回合硬加突發事件。paragraphs 通常 2 至 5 段，依情境調整。

【輸出格式】
必須輸出純 JSON，不要 Markdown 或程式碼圍欄，格式如下：
{
 "title":"場景標題",
 "eyebrow":"場景小標",
 "paragraphs":[{"text":"敘事文字","type":"narration"},{"text":"角色說話","type":"dialogue"}],
 "choices":[{"label":"精簡、符合當前情境的選項文字","action":"清楚描述玩家選擇的行動"}],
 "location":"若玩家明確移動且合理抵達，填新的地點名稱；若位置不變或未能抵達，填空字串",
 "date":"若玩家明確要求推進日期或行動確實耗時，填 YYYY-MM-DD；若日期不變，填空字串",
 "itemsAdd":["只有角色確實取得物品時才列出，否則空陣列"],
 "knownAdd":["只有角色確實得知新資訊時才列出，否則空陣列"],
 "placesUnlock":["只有劇情合理開啟的地點名稱，否則空陣列"],
 "moneyDelta":0,
 "skillsDelta":{}
}

choices 通常提供 3 至 5 個，最多 5 個；沒有實質決策的過場可提供 0 至 2 個。技能名稱只可用：變形術、魔咒學、魔藥學、草藥學、飛行、黑魔法防禦術。技能增加幅度通常為 0 或 1。查看狀態、物品、存檔、課表等系統操作由遊戲介面處理，不要虛構劇情。若玩家只是查看某地點，不要移動角色或改變位置。
`;
  const userPrompt = `目前遊戲狀態：\n${JSON.stringify(state).slice(0, 10000)}\n\n玩家這次自由輸入的行動：${action}`;

  let apiResponse;
  try {
    apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.9,
            maxOutputTokens: 1400
          }
        })
      }
    );
  } catch {
    return Response.json({ error: "無法連線到 Gemini API，請稍後再試。" }, { status: 502 });
  }

  const apiData = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
    const message = apiData?.error?.message || `Gemini API 回傳 HTTP ${apiResponse.status}`;
    return Response.json(
      { error: message.slice(0, 500), upstreamStatus: apiResponse.status },
      { status: apiResponse.status === 429 ? 429 : 502 }
    );
  }

  const text = apiData?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    return Response.json({ error: "Gemini 沒有回傳可用的文字，請再試一次。" }, { status: 502 });
  }

  try {
    const result = JSON.parse(text);
    if (!Array.isArray(result.paragraphs) || result.paragraphs.length === 0) {
      throw new Error("缺少 paragraphs");
    }
    return Response.json({ result });
  } catch {
    return Response.json({ error: "Gemini 回傳格式無法解析，請再試一次。" }, { status: 502 });
  }
};
