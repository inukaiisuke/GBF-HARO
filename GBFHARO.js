(function () {
  console.log("[GBF Raid] iOS Safari compatible script loaded");

  // ================================
  // 設定
  // ================================
  const API_BASE_URL = "https://gbf-raid-id-relay.vercel.app";
  const USER_NAME = "HyperHighspeedGenius";
  const EXT_TOKEN = "a6ed7832-25ae-483d-8f45-19ee62df14f1";
  const GROUP_IDS = ["Group1"];
  // ================================

  // -------------------------------------------------------------
  // iOS Safari 対応：main world にブリッジする
  // -------------------------------------------------------------

  window.__GBF_DATA__ = null;

  // main world に侵入するスクリプト
  const injected = document.createElement("script");
  injected.textContent = `
    (function () {
      function extract() {
        try {
          if (!window.stage || !window.stage.pJsnData) return null;
          const t = window.stage.pJsnData;

          const raidId = t.twitter && t.twitter.battle_id ? String(t.twitter.battle_id) : "";
          if (!raidId) return null;

          const bossParam = t.boss && t.boss.param ? t.boss.param : null;
          let bossName = null;
          let hpPercent = null;
          let hpValue = null;

          if (bossParam) {
            for (const key in bossParam) {
              const b = bossParam[key];
              if (!b) continue;
              const hp = parseInt(b.hp, 10);
              const hpmax = parseInt(b.hpmax, 10);
              if (!hpmax || isNaN(hp) || isNaN(hpmax)) continue;

              bossName = b.monster || null;
              hpValue = hp;
              hpPercent = Math.round((hp / hpmax) * 1000) / 10;
              break;
            }
          }

          window.__GBF_DATA__ = {
            raidId,
            bossName,
            hpPercent,
            hpValue
          };
        } catch (e) {
          window.__GBF_DATA__ = null;
        }
      }

      extract();
      setInterval(extract, 400);
    })();
  `;
  document.documentElement.appendChild(injected);

  // -------------------------------------------------------------
  // API POST 部分（あなたのコードをほぼそのまま利用）
  // -------------------------------------------------------------

  async function postRaid(payload) {
    for (const groupId of GROUP_IDS) {
      const body = {
        groupId,
        raidId: payload.raidId,
        bossName: payload.bossName || null,
        battleName: null,
        hpPercent: typeof payload.hpPercent === "number" ? payload.hpPercent : null,
        hpValue: typeof payload.hpValue === "number" ? payload.hpValue : null,
        userName: USER_NAME,
        extensionToken: EXT_TOKEN || null,
      };

      try {
        const res = await fetch(\`\${API_BASE_URL}/api/raids\`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(EXT_TOKEN ? { "X-Extension-Token": EXT_TOKEN } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("[GBF Raid] API error", groupId, res.status, text);
        }
      } catch (e) {
        console.error("[GBF Raid] API post error:", e);
      }
    }
  }

  let lastRaidId = null;

  function poll() {
    const data = window.__GBF_DATA__;
    if (!data || !data.raidId) return;
    if (data.raidId === lastRaidId) return;

    lastRaidId = data.raidId;
    console.log("[GBF Raid] New raid detected:", data.raidId);
    postRaid(data);
  }

  setInterval(poll, 500);
})();
