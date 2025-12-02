(function () {
  // ======== 画面デバッグパネル ========
  function createDebugPanel() {
    const panel = document.createElement("div");
    panel.id = "__GBF_DEBUG_PANEL__";
    panel.style.position = "fixed";
    panel.style.bottom = "0";
    panel.style.left = "0";
    panel.style.width = "100%";
    panel.style.maxHeight = "40%";
    panel.style.overflowY = "auto";
    panel.style.background = "rgba(0,0,0,0.7)";
    panel.style.color = "#0f0";
    panel.style.fontSize = "12px";
    panel.style.fontFamily = "monospace";
    panel.style.zIndex = "999999";
    panel.style.padding = "6px";
    panel.style.pointerEvents = "none";
    document.body.appendChild(panel);

    window.__GBF_DEBUG_LOG__ = function (msg) {
      const line = document.createElement("div");
      line.textContent = msg;
      panel.appendChild(line);
    };

    __GBF_DEBUG_LOG__("=== GBF Raid Debug Panel Started ===");
  }

  // Safari は document.body が遅いので少し待つ
  setTimeout(createDebugPanel, 500);


  // ================================
  // 設定
  // ================================
  const API_BASE_URL = "https://gbf-raid-id-relay.vercel.app";
  const USER_NAME = "HyperHighspeedGenius";
  const EXT_TOKEN = "a6ed7832-25ae-483d-8f45-19ee62df14f1";
  const GROUP_IDS = ["Group1"];

  __GBF_DEBUG_LOG__("Script loaded: iOS Safari compatible + Debug panel");


  // -------------------------------------------------------------
  // iOS Safari 対応：main world にブリッジする
  // -------------------------------------------------------------

  window.__GBF_DATA__ = null;

  const injected = document.createElement("script");
  injected.textContent = `
    (function () {
      function extract() {
        try {
          if (!window.stage || !window.stage.pJsnData) return;

          const t = window.stage.pJsnData;
          const raidId = t.twitter && t.twitter.battle_id ? String(t.twitter.battle_id) : "";
          if (!raidId) return;

          let bossName = null, hpPercent = null, hpValue = null;
          const bossParam = t.boss && t.boss.param ? t.boss.param : null;

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

  __GBF_DEBUG_LOG__("Injected script for main-world hook.");


  // -------------------------------------------------------------
  // POST 処理
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

      __GBF_DEBUG_LOG__("[POST] " + JSON.stringify(body));

      try {
        const res = await fetch(\`\${API_BASE_URL}/api/raids\`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(EXT_TOKEN ? { "X-Extension-Token": EXT_TOKEN } : {}),
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          __GBF_DEBUG_LOG__("[POST] OK");
        } else {
          __GBF_DEBUG_LOG__("[POST ERROR] status=" + res.status);
        }
      } catch (e) {
        __GBF_DEBUG_LOG__("[POST EXCEPTION] " + e);
      }
    }
  }

  let lastRaidId = null;

  function poll() {
    const d = window.__GBF_DATA__;
    if (!d || !d.raidId) return;

    if (d.raidId !== lastRaidId) {
      lastRaidId = d.raidId;
      __GBF_DEBUG_LOG__("[NEW RAID] " + d.raidId);
      postRaid(d);
    }
  }

  setInterval(poll, 500);

})();
