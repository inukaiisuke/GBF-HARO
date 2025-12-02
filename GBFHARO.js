(function () {
  console.log("[GBF Raid] iOS unified script loaded");

  // === 設定（必要なら書き換えてOK） ===
  const API_BASE_URL = "https://gbf-raid-id-relay.vercel.app";
  const USER_NAME = "HyperHighspeedGenius";
  const EXT_TOKEN = "a6ed7832-25ae-483d-8f45-19ee62df14f1";  // 拡張で使ってなければ空でOK
  const GROUP_IDS = ["Group1"];   // ←ここが重要
  // ================================

  function mainWorldExtractor() {
    try {
      if (!window.stage || !window.stage.pJsnData) return null;
      const t = window.stage.pJsnData;

      const raidId =
        t.twitter && t.twitter.battle_id ? String(t.twitter.battle_id) : "";
      if (!raidId) return null;

      const bossParam = t.boss && t.boss.param ? t.boss.param : null;
      let bossName = null;
      let hpPercent = null;
      let hpValue = null;

      if (bossParam) {
        for (const key in bossParam) {
          if (!Object.prototype.hasOwnProperty.call(bossParam, key)) continue;
          const b = bossParam[key];
          if (!b) continue;

          const hp = parseInt(b.hp, 10);
          const hpmax = parseInt(b.hpmax, 10);
          if (!hpmax || isNaN(hp) || isNaN(hpmax)) continue;

          bossName = b.monster || null;
          hpValue = hp;

          const pctRaw = (hp / hpmax) * 100;
          hpPercent = Math.round(pctRaw * 10) / 10;
          break;
        }
      }

      return {
        raidId,
        bossName,
        battleName: null,
        hpPercent,
        hpValue,
      };
    } catch (e) {
      return null;
    }
  }

  async function postRaid(payload) {
    for (const groupId of GROUP_IDS) {
      const body = {
        groupId,
        raidId: payload.raidId,
        bossName: payload.bossName || null,
        battleName: payload.battleName || null,
        hpPercent:
          typeof payload.hpPercent === "number" ? payload.hpPercent : null,
        hpValue: typeof payload.hpValue === "number" ? payload.hpValue : null,
        userName: USER_NAME,
        extensionToken: EXT_TOKEN || null,
      };

      console.log("[GBF Raid] POST", `${API_BASE_URL}/api/raids`, body);

      try {
        const res = await fetch(`${API_BASE_URL}/api/raids`, {
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
    const data = mainWorldExtractor();
    if (!data || !data.raidId) return;
    if (data.raidId === lastRaidId) return;
    lastRaidId = data.raidId;
    postRaid(data);
  }

  poll();
  setInterval(poll, 500);
})();
