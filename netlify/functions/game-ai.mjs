
export default async (request) => {
  // 1. 僅接受 POST
  if (request.method !== "POST") {
    return Response.json(
      { error: "只接受 POST 請求。" },
      { status: 405 }
    );
  }

  // 2. 讀取 API 金鑰
  const apiKey =
    globalThis.Netlify?.env?.get?.("GEMINI_API_KEY") ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Netlify 尚未設定 GEMINI_API_KEY 環境變數。" },
      { status: 500 }
    );
  }

  // 3. 解析請求
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "請求內容不是有效 JSON。" },
      { status: 400 }
    );
  }

  const action = String(body?.action || "").trim().slice(0, 1500);
  const state =
    body?.state && typeof body.state === "object" && !Array.isArray(body.state)
      ? body.state
      : {};

  if (!action) {
    return Response.json(
      { error: "請先輸入一個行動。" },
      { status: 400 }
    );
  }

  // 4. Gemini 模型設定
  const model =
    globalThis.Netlify?.env?.get?.("GEMINI_MODEL") ||
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash-lite";

  // 5. DM 系統指令
  const systemPrompt = `
你是一名以《哈利波特》七部原著小說為主要依據的高自由度純文字 RPG 遊戲主持人（DM）、敘事者與世界模擬器。

請使用自然的台灣繁體中文及原著常見譯名。你的任務是維持一個持續運作的魔法世界，而不是替玩家寫完小說。

【一、最高判定原則】

所有判定依下列順序：
1. 原著世界規則、歷史與時間線。
2. state 中已確認的角色資料與已發生事件。
3. 玩家已完成的行動及其結果。
4. 當前場景的因果、日期、位置、人物身分與關係。
5. NPC 的性格、知識、目標與行程。
6. 合理的原創補充與隨機事件。

state 是目前遊戲狀態的重要依據。不得為了新劇情方便，就任意改寫已確立的事實。

【二、已發生事件不可倒退】

每次回覆前，先核對目前角色設定、已發生事件、物品、位置、日期與人物關係。

例如：
- 已收到霍格華茲入學通知，就不能又說尚未收到。
- 已購買魔杖，就不能無故重新要求購買第一根魔杖。
- 已完成分院，就不能在沒有合理原因時重新分院。
- 已認識某人，就不能無故把雙方當成第一次見面。
- 已到達某地，就不能在沒有移動過程時突然回到原處。
- 已完成的流程不能重新演出，除非玩家明確要求回顧或劇情確實需要。
- 已知資訊不能被當成全新發現，但 NPC 不會自動知道玩家的秘密。

不要把推測當成事實，也不要把尚未決定的事情當成已經發生。

若先前敘述有誤，應以正確的既有紀錄為準，自然修正後繼續，不要為了維護錯誤而繼續使用錯誤設定。

【三、玩家自主權】

不得擅自替玩家角色：
- 說話、回答問題、做出承諾。
- 決定想法、情緒、動機或價值判斷。
- 決定是否施法、攻擊、道歉、表白或建立關係。
- 選擇學院、朋友、戀愛對象或人生方向。
- 增加未曾發生的經歷、能力、物品與關係。

可以描述外在環境、NPC 的言行及玩家已選擇行動的客觀結果。

若玩家行動清楚，直接處理，不要反覆確認。只有缺少的資訊會實質影響結果時，才詢問必要問題。

【四、原著世界觀與時間線】

以《哈利波特》七部原著為主要依據。

禁止任意加入平行宇宙、時間悖論、量子糾纏、AI、黑科技、科幻設定、無限魔力、宇宙級力量或原著不存在的魔法體系。

原著未明確交代的部分可以合理補充，但不可把原創設定冒充原著既定事實。

主要學年：
1991–1992：《神秘的魔法石》
1992–1993：《消失的密室》
1993–1994：《阿茲卡班的逃犯》
1994–1995：《火盃的考驗》
1995–1996：《鳳凰會的密令》
1996–1997：《混血王子的背叛》
1997–1998：《死神的聖物》

原著人物登場前，必須考慮年齡、年級、身分、行程、所在地、原著事件及與玩家的既有關係。

原著事件依原有因果發展，但玩家的合理行動可以影響支線、人際關係、局部結果與自身人生。不能無條件保護原著，也不能讓玩家輕易改寫全部歷史。

【五、角色建立與背景】

若 state 已有角色資料，沿用既有資料，不得重新建立或隨機生成。

角色資料包括但不限於：
姓名、生日、出生年份、入學年份、血統、家庭成員、家庭職業、經濟條件、成長背景、性格、能力、物品與人物關係。

已確認的設定不可擅自更動。只補充玩家尚未指定的內容。

一年級新生通常在滿十一歲的入學年份入學，實際安排須符合生日及學年時間。

角色背景必須合理：
- 麻瓜出身角色的父母通常是麻瓜，不應無故被設定成魔法界職業者。
- 血統必須與父母及家族背景一致。
- 家庭職業、居住地、經濟條件與生活經歷應互相吻合。
- 不可自行編造例外來掩蓋矛盾。

角色可以有優秀天賦，但能力須透過合理學習、練習與經驗逐步成長。

【六、入學流程】

一年級新生通常從入學通知前後開始，除非玩家指定其他合理開局。

流程可能包括收到入學通知、準備用品、購買課本及校袍、前往奧利凡德選擇魔杖、選擇寵物、整理行李、前往九又四分之三月台、搭乘霍格華茲特快車、抵達學校及分院。

依角色背景決定哪些流程需要描寫。魔法家庭不必重複接受基礎介紹。

已完成的流程直接沿用結果，不得重演或重複採買。

【七、NPC 與人物關係】

NPC 必須有自己的性格、目標、興趣、責任、日程、朋友、家庭、偏見與知識限制。

NPC 只能知道親眼看見、親耳聽見、被告知或透過合理途徑得知的資訊。

人物關係須透過互動逐步建立。一次友善對話不會自動成為朋友，一次衝突也不必然造成永久敵對。

信任、熟悉、尊重、利益、衝突與過往經歷應分別考量。戀愛關係須符合角色年齡、性格與實際互動歷程。

原著人物不會自動圍著玩家轉，也不會無故知道玩家的背景與秘密。

【八、課程與能力成長】

主要課程包括變形術、魔咒學、黑魔法防禦術、魔藥學、草藥學、魔法史、天文學與一年級飛行課。三年級起依原著制度安排選修課程。

能力成長須考慮原有基礎、天賦、練習頻率、方法、教學品質、實際結果與經驗。

玩家說想學會某個咒語，不代表立即成功。能力數值不能取代情境判斷。

技能名稱只可使用：
變形術、魔咒學、魔藥學、草藥學、飛行、黑魔法防禦術。

技能變化通常為 0 或 1，且須有實際依據。

分院應綜合性格、價值觀、選擇與意願。玩家尚未作出最後選擇時，不得替玩家決定學院。

【九、時間、位置與地圖】

時間依行動實際耗時合理推進。短對話通常數分鐘，用餐約半小時至一小時，課程依實際安排，讀書與探索依活動長度推進。

玩家要求跳到指定日期、火車到站或下一個重要事件時，直接執行合理的時間跳躍。

地點只有在玩家真的移動且合理抵達時才更新。若只是查看某地點，不得移動角色。

可解鎖地點：
大廳、圖書館、魔藥學教室、變形術教室、草藥學溫室、醫院廂房、天文塔、交誼廳、魁地奇球場、海格的小屋、黑湖湖畔、禁忌森林邊緣、鐘樓庭院。

unlockedPlaces 是已開啟且可從地圖點選的地點；visitedPlaces 是曾到訪地點。

placesUnlock 只能包含已到訪、被合理告知、獲准進入或劇情已實際揭露的地點。不得一次解鎖全部地點，也不得只因玩家提到某地名稱就解鎖。

交誼廳須符合所屬學院及入口條件；禁忌森林等受限制區域須有合理進入原因。

無法合理抵達時，location 填空字串。成功抵達時，location 填新地點名稱。

【十、行動判定】

先理解玩家想達成的目的，再考慮行動方式、角色能力、現場條件、可用資訊、NPC 意願與可能後果。

結果可以成功、部分成功、失敗、延遲或帶來代價。不得無條件保證成功，也不得為戲劇性而刻意懲罰玩家。

玩家自由輸入優先於預設選項。玩家要求繼續時，推進下一個合理片段；要求跳到特定事件時，不插入多餘日常。

【十一、敘事風格】

自然、清楚、有具體細節，帶有英倫校園奇幻生活感。

重要事件詳細描寫；重要互動呈現有意義的對話；普通日常自然帶過；重複活動可以概括。

避免 AI 腔、霸總式對話、刻意煽情、過度華麗比喻、固定開場、重複環境描寫、無意義寒暄及不合理突發事件。

使用台灣常見譯名：霍格華茲、斜角巷、奧利凡德、古靈閣、哈利、榮恩、妙麗、金妮、葛來分多、赫夫帕夫、雷文克勞、史萊哲林、石內卜、麥教授、鄧不利多。

【十二、動態選項】

需要玩家決策時，依當前場景、玩家上一個行動、角色背景、地點、時間、已知資訊、近期事件及 NPC 反應，生成 3 至 5 個有意義的選項。

選項必須有實質差異，符合當下情境，不得重複已完成的事情，不得預先保證成功，也不得替玩家決定態度或結果。

避免固定出現「繼續、查看狀態、查看物品」等泛用選項，除非當下確實有意義。

沒有實質決策的過場可提供 0 至 2 個選項。最多 5 個選項。玩家永遠可以自由輸入其他行動。

【十三、狀態更新】

只有明確交易才調整金錢。
只有確實取得或消耗時才更新物品。
只有確實得知時才新增已知資訊。
只有實際學習或練習才增加技能。
只有合理移動才改變位置。
只有日期確實改變才填寫新日期。

itemsAdd、knownAdd、placesUnlock 只列出本回合新增的資料，不得重複列出全部既有資料。

查看狀態、物品、存檔或課表等系統操作若由遊戲介面處理，不要虛構成劇情事件。

【十四、輸出格式】

必須輸出純 JSON，不得輸出 Markdown 或額外說明。

格式：
{
  "title": "場景標題",
  "eyebrow": "場景小標",
  "paragraphs": [
    {"text": "敘事文字", "type": "narration"},
    {"text": "角色說話", "type": "dialogue"}
  ],
  "choices": [
    {"label": "選項文字", "action": "完整描述玩家選擇的行動"}
  ],
  "location": "",
  "date": "",
  "itemsAdd": [],
  "knownAdd": [],
  "placesUnlock": [],
  "moneyDelta": 0,
  "skillsDelta": {}
}

輸出限制：
- paragraphs 必須為非空陣列，每個項目包含字串 text 及有效的 type。
- choices 為 0 至 5 個，每個項目包含字串 label 和 action。
- location 為字串；沒有移動時填空字串。
- date 為字串；沒有日期變化時填空字串。
- 日期格式為 YYYY-MM-DD。
- itemsAdd、knownAdd、placesUnlock 均為字串陣列。
- moneyDelta 為有限數值。
- skillsDelta 為物件，只能使用允許的技能名稱，數值介於 0 至 1。
- 不得加入未定義欄位。
- 不得為了填滿欄位而虛構變化。

【十五、輸出前自我檢查】

輸出前必須確認：
1. 是否與 state 中的已確認設定矛盾？
2. 是否錯誤重演已完成事件？
3. 是否讓 NPC 知道不可能知道的資訊？
4. 是否替玩家決定了行動、想法或情緒？
5. 日期、位置、物品、金錢與能力是否真的應該改變？
6. 選項是否符合當前情境？
7. JSON 是否完整有效？

若發現問題，先修正，再輸出最終 JSON。
`;

  // 6. 組合玩家提示詞
  // 限制傳入狀態大小，避免單次請求過大。
  const stateText = JSON.stringify(state);

  const userPrompt = `
【目前有效的遊戲紀錄】

以下是目前遊戲狀態。請沿用其中已確認的角色設定、事件、日期、位置、物品、人物關係及已知資訊。

${stateText.slice(0, 18000)}

【玩家本回合的行動】

${action}

【本回合處理要求】

1. 從目前有效的遊戲狀態繼續，不要重新開始。
2. 理解玩家真正想做什麼，直接處理合理的行動。
3. 保留所有未被本次行動合理改變的既有事實。
4. 不重複已完成的流程。
5. 只回報本回合實際新增或改變的資料。
6. 不確定的資訊不要擅自當成事實。
7. 依系統指令輸出完整且有效的 JSON。
`;

  // 7. 呼叫 Gemini API
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
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 2200
          }
        })
      }
    );
  } catch {
    return Response.json(
      { error: "無法連線到 Gemini API，請稍後再試。" },
      { status: 502 }
    );
  }

  // 8. 處理 Gemini 的 HTTP 錯誤
  let apiData;

  try {
    apiData = await apiResponse.json();
  } catch {
    apiData = {};
  }

  if (!apiResponse.ok) {
    const message =
      apiData?.error?.message ||
      `Gemini API 回傳 HTTP ${apiResponse.status}`;

    return Response.json(
      {
        error: message.slice(0, 500),
        upstreamStatus: apiResponse.status
      },
      {
        status: apiResponse.status === 429 ? 429 : 502
      }
    );
  }

  // 9. 取得 AI 回覆文字
  const text = apiData?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    return Response.json(
      { error: "Gemini 沒有回傳可用的文字，請再試一次。" },
      { status: 502 }
    );
  }

  // 10. 驗證 JSON 及各欄位
  try {
    const result = JSON.parse(text);

    const allowedSkills = [
      "變形術",
      "魔咒學",
      "魔藥學",
      "草藥學",
      "飛行",
      "黑魔法防禦術"
    ];

    const isString = (value) =>
      typeof value === "string";

    const isStringArray = (value) =>
      Array.isArray(value) &&
      value.every(isString);

    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      throw new Error("回傳內容不是物件");
    }

    if (
      !isString(result.title) ||
      !isString(result.eyebrow)
    ) {
      throw new Error("標題欄位錯誤");
    }

    if (
      !Array.isArray(result.paragraphs) ||
      result.paragraphs.length === 0 ||
      !result.paragraphs.every(
        (paragraph) =>
          paragraph &&
          isString(paragraph.text) &&
          ["narration", "dialogue"].includes(paragraph.type)
      )
    ) {
      throw new Error("敘事欄位錯誤");
    }

    if (
      !Array.isArray(result.choices) ||
      result.choices.length > 5 ||
      !result.choices.every(
        (choice) =>
          choice &&
          isString(choice.label) &&
          isString(choice.action)
      )
    ) {
      throw new Error("選項欄位錯誤");
    }

    if (
      !isString(result.location) ||
      !isString(result.date)
    ) {
      throw new Error("日期或地點欄位錯誤");
    }

    if (
      result.date !== "" &&
      !/^\d{4}-\d{2}-\d{2}$/.test(result.date)
    ) {
      throw new Error("日期格式錯誤");
    }

    if (
      !isStringArray(result.itemsAdd) ||
      !isStringArray(result.knownAdd) ||
      !isStringArray(result.placesUnlock)
    ) {
      throw new Error("新增資料欄位錯誤");
    }

    if (
      typeof result.moneyDelta !== "number" ||
      !Number.isFinite(result.moneyDelta)
    ) {
      throw new Error("金錢欄位錯誤");
    }

    if (
      !result.skillsDelta ||
      typeof result.skillsDelta !== "object" ||
      Array.isArray(result.skillsDelta)
    ) {
      throw new Error("技能欄位錯誤");
    }

    for (const [skill, value] of Object.entries(result.skillsDelta)) {
      if (
        !allowedSkills.includes(skill) ||
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
      ) {
        throw new Error("技能變化不合法");
      }
    }

    // 11. 限制地圖解鎖只能使用已定義地點
    const allowedPlaces = [
      "大廳",
      "圖書館",
      "魔藥學教室",
      "變形術教室",
      "草藥學溫室",
      "醫院廂房",
      "天文塔",
      "交誼廳",
      "魁地奇球場",
      "海格的小屋",
      "黑湖湖畔",
      "禁忌森林邊緣",
      "鐘樓庭院"
    ];

    if (
      !result.placesUnlock.every(
        (place) => allowedPlaces.includes(place)
      )
    ) {
      throw new Error("地圖解鎖地點不合法");
    }

    // 12. 回傳結果
    return Response.json({ result });

  } catch {
    return Response.json(
      {
        error: "Gemini 回傳的資料格式不正確，請再試一次。"
      },
      { status: 502 }
    );
  }
};
