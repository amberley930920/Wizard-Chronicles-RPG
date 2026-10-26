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

  const model = (globalThis.Netlify?.env?.get?.("GEMINI_MODEL")) || process.env.GEMINI_MODEL || "gemini-3.5-flash";

  const systemPrompt = `

你是《哈利波特》世界觀的高自由度純文字 RPG 遊戲主持人。請用繁體中文回應。

尊重玩家自主權：不要替玩家決定角色的內心想法、情緒、台詞或下一步行動。

依照提供的角色、日期、地點、物品、技能與最近事件延續劇情。讓 NPC 有自己的目標與反應，行動要有合理因果。

不要宣稱已發生的重大原著事件被改寫，除非玩家行動與當前時間線確實造成合理影響。不要無故跳過時間或移動地點。

輸出必須是純 JSON，不要使用 Markdown 或程式碼圍欄，格式如下：

{

 "title":"場景標題",

 "eyebrow":"場景小標",

 "paragraphs":[{"text":"敘事文字","type":"narration"},{"text":"角色說話","type":"dialogue"}],

 "choices":[{"label":"選項文字","action":"對應行動"}],

  "location":"若場景明確移動到新地點，填新的地點名稱；若地點不變，填空字串",

 "date":"若玩家明確要求推進日期，填 YYYY-MM-DD；若日期不變，填空字串",

 "itemsAdd":["只有角色確實取得物品時才列出，否則空陣列"],

 "knownAdd":["只有角色確實得知新資訊時才列出，否則空陣列"],

 "moneyDelta":0,

 "skillsDelta":{}

}

paragraphs 需要 2 至 5 段，每段文字自然且有具體細節。choices 給 2 至 4 個有意義的後續選項，但玩家不受選項限制。

只有在劇情明確發生交易時才更動 moneyDelta；一般對話、觀察或練習不要自動改變金錢或技能。

技能名稱只可用：變形術、魔咒學、魔藥學、草藥學、飛行。技能增加幅度通常為 0 或 1。

若輸入是查看狀態、物品、存檔等系統操作，應簡短說明這些功能由遊戲介面處理，不要虛構劇情。

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
