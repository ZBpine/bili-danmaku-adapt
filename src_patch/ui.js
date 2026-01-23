// src/ui.js
import cssText from "./ui.css";

export const LIKE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" data-pointer="none" viewBox="0 0 24 25" aria-hidden="true">
    <path fill="currentColor" stroke="rgba(0,0,0,.8)" stroke-width="1.2" paint-order="stroke fill" vector-effect="non-scaling-stroke" d="M13.925 3.415a.798.798 0 0 0-.683.254c-.605.708-.744 1.748-1.198 2.553-.598 1.059-1.156 1.7-1.843 2.302-.565.496-1.138.828-1.701.983v10.587a107.173 107.173 0 0 0 7.937-.11c.91-.046 1.7-.496 2.113-1.229.577-1.028 1.29-2.535 1.721-4.31.402-1.654.586-3.014.668-3.973.038-.444-.313-.852-.859-.852h-4.982a.75.75 0 0 1-.623-.332c-.17-.255-.135-.544-.028-.813.229-.584.529-1.456.647-2.248.117-.783.088-1.411-.218-1.993-.33-.625-.704-.79-.95-.819ZM16.16 8.12h3.92c1.324 0 2.476 1.063 2.354 2.48a28.047 28.047 0 0 1-.705 4.2c-.473 1.946-1.25 3.583-1.872 4.69-.698 1.242-1.992 1.923-3.343 1.993-1.304.067-3.236.14-5.514.14-2.207 0-4.223-.069-5.652-.134-1.608-.073-2.957-1.267-3.13-2.904A38.233 38.233 0 0 1 2 14.622c0-1.369.087-2.61.19-3.595.179-1.722 1.656-2.907 3.318-2.907H7.75c.319 0 .814-.155 1.462-.724.563-.493 1.013-1.003 1.526-1.912.515-.913.668-1.976 1.364-2.79a2.297 2.297 0 0 1 1.997-.769c.826.097 1.588.632 2.103 1.61.521.987.514 1.988.376 2.913-.087.582-.265 1.2-.418 1.672ZM7 20.053V9.62H5.508c-.964 0-1.734.672-1.826 1.562a33.591 33.591 0 0 0-.182 3.44c0 1.428.1 2.766.21 3.805.091.864.803 1.523 1.706 1.564.468.021 1.001.043 1.584.062Z"></path>
</svg>`;
export const SEND_SVG = `
<svg viewBox="0 0 1024 1024" aria-hidden="true">
    <path fill="currentColor" stroke="rgba(0,0,0,.8)" stroke-width="1.2" paint-order="stroke fill" vector-effect="non-scaling-stroke" d="M392.021333 925.013333a34.133333 34.133333 0 0 1-34.133333-34.133333V579.242667c0-10.24 4.608-19.968 12.629333-26.453334l276.48-224.085333a34.0992 34.0992 0 0 1 43.008 52.906667L426.154667 595.456v192.853333l82.944-110.592c10.069333-13.482667 28.672-17.578667 43.52-9.557333l137.557333 73.728L853.333333 156.16c3.242667-11.434667-3.413333-18.602667-6.485333-21.162667-3.072-2.56-11.093333-7.850667-21.845333-2.901333L206.336 422.4l80.213333 46.08c16.384 9.386667 22.016 30.208 12.629334 46.592s-30.208 22.016-46.592 12.629333l-137.045334-78.677333a33.979733 33.979733 0 0 1-17.066666-31.061333c0.512-12.8 8.021333-24.064 19.626666-29.525334L795.989333 70.314667c31.744-14.848 68.096-10.069333 94.890667 12.629333a87.790933 87.790933 0 0 1 28.16 91.477333L744.277333 801.28a34.082133 34.082133 0 0 1-48.981333 20.821333L546.133333 742.058667l-126.805333 169.301333c-6.656 8.704-16.896 13.653333-27.306667 13.653333z"></path>
</svg>`;


export function injectStyles() {
    // 避免重复注入
    if (document.getElementById("tm-dm-adapt-style")) return;

    const style = document.createElement("style");
    style.id = "tm-dm-adapt-style";
    style.textContent = cssText;

    // document-start 可能 head 还没出来，兜底到 documentElement
    document.documentElement.appendChild(style);
}

export function createUI({ config, saveConfig, rebuildAll, refreshAll, castToInteger }) {
    /***********************
     * UI 面板：页面开关注入（弹幕列表下方）
     ***********************/
    let uiMounted = false;
    let uiPanel = null;
    let mergeSwitchBtn = null;
    let mergeSettingsWrap = null;
    let mergeWindowInput = null;

    let likesSwitchBtn = null;
    let likesSettingsWrap = null;
    let likeScopeSel = null;
    let likeMinInput = null;

    let badgeHighlightSwitchBtn = null;
    let badgeHighlightAdaptiveSwitchBtn = null;

    function setSwitchOn(swEl, on) {
        if (!swEl) return;
        swEl.classList.toggle("on", !!on);
    }

    function createSettingsWrap(innerHTML, extraClass) {
        const wrap = document.createElement("div");
        wrap.className = "tm-dm-adapt-settings" + (extraClass ? ` ${extraClass}` : "");
        wrap.innerHTML = innerHTML;
        return wrap;
    }
    function setWrapVisible(wrap, visible) {
        if (!wrap) return;
        wrap.style.display = visible ? "" : "none";
    }

    function applyCfgToUi() {
        setSwitchOn(mergeSwitchBtn, config.mergeSame);
        setSwitchOn(likesSwitchBtn, config.showLikes);
        setSwitchOn(badgeHighlightSwitchBtn, config.badgeHighlightEnabled);
        setSwitchOn(badgeHighlightAdaptiveSwitchBtn, config.badgeHighlightAdaptive);

        if (mergeWindowInput) mergeWindowInput.value = String(config.mergeWindowSec ?? 0);
        if (likeScopeSel) likeScopeSel.value = config.likeScope;
        if (likeMinInput) likeMinInput.value = String(config.likeMin);

        setWrapVisible(mergeSettingsWrap, config.mergeSame);
        setWrapVisible(likesSettingsWrap, config.showLikes);
    }

    function findDanmakuArea() {
        const areas = Array.from(document.querySelectorAll(".bui-area"));
        for (const a of areas) {
            const header = a.querySelector(".bui-collapse-header");
            if (header && /弹幕/.test(header.textContent || "")) return a;
        }
        return areas.find((a) => a.querySelector(".bui-collapse-wrap")) || null;
    }

    function setPanelOpen(open) {
        if (!uiPanel) return;
        uiPanel.classList.toggle("closed", !open);
    }

    function mountUI() {
        if (uiMounted && uiPanel && uiPanel.isConnected) return true;

        const area = findDanmakuArea();
        if (!area) return false;

        const collapse =
            area.querySelector(":scope > .bui-collapse-wrap") || area.querySelector(".bui-collapse-wrap");
        if (!collapse) return false;

        uiMounted = true;

        // ====== 外层：可折叠面板 ======
        uiPanel = document.createElement("div");
        uiPanel.className = "tm-dm-adapt-panel";

        const header = document.createElement("div");
        header.className = "tm-dm-adapt-panel-header";
        header.setAttribute("role", "button");
        header.tabIndex = 0;
        header.innerHTML = `
<div class="tm-dm-adapt-panel-title">弹幕显示设置</div>
<span class="tm-dm-adapt-panel-caret" aria-hidden="true"></span>
`;

        const panelBodyWrap = document.createElement("div");
        panelBodyWrap.className = "tm-dm-adapt-panel-body";

        const panelControls = document.createElement("div");
        panelControls.className = "tm-dm-adapt-controls";

        function makeToggleRow(label, getOn, setOn) {
            const row = document.createElement("div");
            row.className = "tm-dm-adapt-toggle";
            row.setAttribute("role", "button");
            row.tabIndex = 0;

            row.innerHTML = `
<div class="tm-dm-adapt-toggle-txt"></div>
<div class="tm-dm-adapt-switch"><div class="tm-dm-adapt-switch-block"></div></div>
`;

            row.querySelector(".tm-dm-adapt-toggle-txt").textContent = label;
            const sw = row.querySelector(".tm-dm-adapt-switch");

            const render = () => sw.classList.toggle("on", !!getOn());

            const toggle = () => {
                setOn(!getOn());
                render();
            };

            row.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle();
            });

            row.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                }
            });

            render();
            return { row, sw, render };
        }

        // 合并弹幕
        const mergeUI = makeToggleRow("合并弹幕", () => config.mergeSame, (v) => {
            config.mergeSame = v;
            saveConfig();
            applyCfgToUi();
            rebuildAll("toggle-merge");
        });

        // 显示点赞数
        const likesUI = makeToggleRow("显示点赞数", () => config.showLikes, (v) => {
            config.showLikes = v;
            saveConfig();
            applyCfgToUi();
            refreshAll("toggle-likes");
        });

        // 记录引用，applyCfgToUi 里用
        mergeSwitchBtn = mergeUI.sw;
        likesSwitchBtn = likesUI.sw;

        panelControls.appendChild(mergeUI.row);

        // 合并时间阈值（秒，支持小数；0=不限制）
        mergeSettingsWrap = createSettingsWrap(`
<div class="tm-dm-adapt-like-row">
  <label>多少秒以内合并</label>
  <input class="tm-dm-adapt-merge-window" type="number" step="0.1" min="0" value="0" />
</div>
<!--<div class="tm-dm-adapt-tip">单位：秒，支持小数；0 表示不限制</div>-->
`, "tm-dm-adapt-merge-settings");

        mergeWindowInput = mergeSettingsWrap.querySelector(".tm-dm-adapt-merge-window");

        let mergeWinTimer = null;
        mergeWindowInput.addEventListener("input", () => {
            if (mergeWinTimer) clearTimeout(mergeWinTimer);
            mergeWinTimer = setTimeout(() => {
                const n = Number(mergeWindowInput.value);
                let v = Number.isFinite(n) ? n : 0;
                if (v < 0) v = 0;
                // 最多保留 3 位小数，避免存储噪声
                v = Math.round(v * 1000) / 1000;

                config.mergeWindowSec = v;
                mergeWindowInput.value = String(config.mergeWindowSec);
                saveConfig();
                rebuildAll("merge-window changed");
            }, 200);
        });

        panelControls.appendChild(mergeSettingsWrap);

        panelControls.appendChild(likesUI.row);

        likesSettingsWrap = createSettingsWrap(`
<div class="tm-dm-adapt-like-row">
  <label>显示范围</label>
  <select class="tm-dm-adapt-like-scope">
    <option value="all">全部弹幕</option>
    <option value="high">高赞弹幕</option>
  </select>
</div>
<div class="tm-dm-adapt-like-row">
  <label>多少赞以上显示</label>
  <input class="tm-dm-adapt-like-min" type="number" step="1" value="0" />
</div>
`, "tm-dm-adapt-like-settings");

        likeScopeSel = likesSettingsWrap.querySelector(".tm-dm-adapt-like-scope");
        likeMinInput = likesSettingsWrap.querySelector(".tm-dm-adapt-like-min");

        likeScopeSel.addEventListener("change", () => {
            config.likeScope = likeScopeSel.value || "all";
            saveConfig();
            refreshAll("like-scope");
        });

        let likeMinTimer = null;
        likeMinInput.addEventListener("input", () => {
            if (likeMinTimer) clearTimeout(likeMinTimer);
            likeMinTimer = setTimeout(() => {
                config.likeMin = castToInteger(likeMinInput.value);
                likeMinInput.value = String(config.likeMin);
                saveConfig();
                refreshAll("like-min");
            }, 200);
        });


        panelControls.appendChild(likesSettingsWrap);

        // 高亮角标背景
        const badgeHlUI = makeToggleRow("高亮角标背景", () => config.badgeHighlightEnabled, (v) => {
            config.badgeHighlightEnabled = v;
            saveConfig();
            applyCfgToUi();
            refreshAll("toggle-badge-highlight");
        });

        // 按热度增亮（点赞+重复）
        const badgeHlAdaptiveUI = makeToggleRow("按热度增亮", () => config.badgeHighlightAdaptive, (v) => {
            config.badgeHighlightAdaptive = v;
            saveConfig();
            applyCfgToUi();
            refreshAll("toggle-badge-highlight-adaptive");
        });

        badgeHighlightSwitchBtn = badgeHlUI.sw;
        badgeHighlightAdaptiveSwitchBtn = badgeHlAdaptiveUI.sw;

        panelControls.appendChild(badgeHlUI.row);
        panelControls.appendChild(badgeHlAdaptiveUI.row);

        // 组装面板
        panelBodyWrap.appendChild(panelControls);
        uiPanel.appendChild(header);
        uiPanel.appendChild(panelBodyWrap);

        // ✅插入到弹幕列表下面：放在 bui-collapse-body 后面
        const body =
            collapse.querySelector(":scope > .bui-collapse-body") ||
            collapse.querySelector(".bui-collapse-body");
        if (body) body.insertAdjacentElement("afterend", uiPanel);
        else collapse.appendChild(uiPanel);

        // 面板头点击展开/收起（可持久化）
        header.addEventListener("click", () => {
            config.panelOpen = !config.panelOpen;
            saveConfig();
            setPanelOpen(config.panelOpen);
        });

        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                config.panelOpen = !config.panelOpen;
                saveConfig();
                setPanelOpen(config.panelOpen);
            }
        });

        applyCfgToUi();

        // 初始展开状态（没配过就默认 true）
        if (typeof config.panelOpen !== "boolean") config.panelOpen = true;
        setPanelOpen(config.panelOpen);

        return true;
    }

    function bootUI() {
        const tryMount = () => mountUI();

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", tryMount, { once: true });
        } else {
            tryMount();
        }

        // B站页面经常局部重建：兜底轮询
        setInterval(() => {
            if (!uiPanel || !uiPanel.isConnected) mountUI();
        }, 1500);
    }

    return { bootUI };
}
