// ==UserScript==
// @name        B站评论显示状态
// @namespace   https://github.com/ZBpine/bili-danmaku-adapt/
// @description 评论显示状态，以便知道是否被阿瓦隆。
// @version     1.2.0
// @author      ZBpine
// @icon        https://www.bilibili.com/favicon.ico
// @match       https://www.bilibili.com/*
// @match       https://t.bilibili.com/*
// @match       https://space.bilibili.com/*
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @run-at      document-start
// @license     MIT
// ==/UserScript==

/******/ (() => { // webpackBootstrap
const settings = {
    showIP: GM_getValue("showIP", true),
    showState: GM_getValue("showState", true),
    showAttr: GM_getValue("showAttr", true),
    enhanceRepliesToggle: GM_getValue("enhanceRepliesToggle", true),
    showArticleStats: GM_getValue("showArticleStats", true),
};

function registerMenu(key, label) {
    GM_registerMenuCommand(`${settings[key] ? "✅" : "❌"} ${label}`, () => {
        settings[key] = !settings[key];
        GM_setValue(key, settings[key]);
        // location.reload(); // 刷新页面使设置生效
    });
}
registerMenu("showIP", "显示 IP 属地");
registerMenu("showState", "显示 状态");
registerMenu("showAttr", "显示 属性位");
registerMenu("enhanceRepliesToggle", "增强 回复展开收起");
registerMenu("showArticleStats", "显示专栏观看/投币数");
GM_registerMenuCommand("菜单不会立即刷新", () => {});

const STATE_MAP = {
    11: "阿瓦隆 - 异常",
    17: "阿瓦隆 - 仅自己可见",
};

const ATTR_MAP = {
    1: "置顶",
    7: "广告链接",
    8: "UP主点赞",
    9: "UP主回复",
    27: "带图",
};

const deepQuery = (root, selector) => {
    let el = root.querySelector(selector);
    if (el) return el;
    const subs = root.querySelectorAll("*");
    for (let s of subs) {
        if (s.shadowRoot) {
            el = deepQuery(s.shadowRoot, selector);
            if (el) return el;
        }
    }
    return null;
};

function parseAttr(attr) {
    if (!attr) return null;
    let str = Number(attr).toString(2);
    const len = str.length;
    let bits = [];
    let descs = [];
    for (let i = 0; i < len; i++) {
        if (str[len - 1 - i] === "1") {
            bits.push(i);
            const desc = ATTR_MAP[i] || "未知";
            descs.push(`${i}: ${desc}`);
        }
    }
    return {
        bits: bits.join("|"),
        descs: descs.join("\n"),
    };
}
/**
 * 核心注入逻辑
 * @param {HTMLElement} ctx - 组件实例 (this)
 */
function performInjection(ctx) {
    const data = ctx.__data;
    if (!data) return;

    // 2. 在 shadowRoot 中寻找 UI 节点
    // 使用深度选择器，因为 #pubdate 可能在更深层的 action-buttons 组件里
    const shadow = ctx.shadowRoot;
    if (!shadow) return;

    // 这是一个通用的深度查找函数

    const pubdate = deepQuery(shadow, "#pubdate");
    if (!pubdate) return;

    // 3. 准备信息
    const ip = data.reply_control?.location || "";
    const state = data.state;
    const attr = data.attr;

    let extra = pubdate.querySelector(".custom-hook-info");
    if (!extra) {
        extra = document.createElement("span");
        extra.className = "custom-hook-info";
        extra.style.marginLeft = "15px";
    }
    extra.innerHTML = "";
    if (settings.showState && state > 0) {
        const sSpan = document.createElement("span");
        sSpan.textContent = `状态：${state} `;
        sSpan.title = STATE_MAP[state] || "未知";
        // sSpan.style.cursor = "help";
        extra.appendChild(sSpan);
    }
    if (settings.showAttr && attr > 0) {
        const attrData = parseAttr(attr);
        if (attrData) {
            const aSpan = document.createElement("span");
            // aSpan.style.cursor = "help";
            aSpan.textContent = `属性：${attrData.bits}`;
            aSpan.title = attrData.descs;
            extra.appendChild(aSpan);
        }
    }
    if (extra.innerHTML) pubdate.appendChild(extra);

    if (settings.showIP) {
        // 4. 插入显示信息 (兼容性处理)
        let ipSpan = pubdate.querySelector(".ip-location");
        if (!ipSpan && ip) {
            ipSpan = document.createElement("span");
            ipSpan.className = "ip-location";
            ipSpan.style.marginLeft = "15px";
            ipSpan.textContent = ip;
            pubdate.appendChild(ipSpan);
        }
    }
}

/** 
 * 调试辅助：查看组件实例上有哪些自定义属性和方法
 * 选中 bili-comment-replies-renderer
 * 
(function (el) {
    // 1. 获取当前元素的直接原型（即 B站定义的类）
    const customProto = Object.getPrototypeOf(el);
    // 2. 获取标准 HTML 元素的属性列表作为参照
    const nativeProps = Object.getOwnPropertyNames(HTMLElement.prototype);

    // 3. 筛选出不在原生列表中的属性和方法
    const customStuff = Object.getOwnPropertyNames(customProto).filter(
        (prop) => {
            return !nativeProps.includes(prop);
        },
    );
    console.table(
        customStuff.map((prop) => ({
            名称: prop,
            类型: typeof el[prop],
            当前值: el[prop],
        })),
    );
})($0);
*/

/**
 * 新增功能：回复区注入刷新按钮
 * 针对组件：bili-comment-replies-renderer
 */
function injectRefreshToReplies(ctx) {
    const shadow = ctx.shadowRoot;
    if (!shadow) return;

    const footer = shadow.querySelector("#expander-footer");
    if (!footer) return;

    // 清理旧的自定义包裹层，防止重复堆叠
    footer.querySelector(".custom-wrapper")?.remove();

    // 如果 footer 里面已经有 B 站原生的按钮就跳过
    if (footer.children.length > 0) return;

    // 辅助函数：创建 Bilibili 原生风格按钮
    const createBiliBtn = (text, onClick) => {
        const btn = document.createElement("bili-text-button");
        btn.innerText = text;
        btn.onclick = async (e) => {
            e.stopPropagation();
            await onClick(btn);
            // footer.querySelector(".custom-wrapper").remove(); // 点击后移除按钮
        };
        return btn;
    };
    const createWrapper = (id) => {
        const wrapper = document.createElement("div");
        wrapper.className = "custom-wrapper";
        wrapper.id = id;
        return wrapper;
    };

    const rcount = ctx.data?.rcount ?? 0;
    const rlist = ctx.list?.length ?? 0;

    if (rlist > 0) {
        const wrapper = createWrapper("pagination");
        const wrapperHead = createWrapper("pagination-head");
        const wrapperFoot = createWrapper("pagination-foot");
        wrapperHead.innerText = "共1页";
        const btn = createBiliBtn("收起", async (btn) => {
            try {
                ctx.handleRevert();
            } catch (e) {
                console.error("收起失败", e);
            }
        });
        wrapperFoot.appendChild(btn);
        wrapper.appendChild(wrapperHead);
        wrapper.appendChild(wrapperFoot);
        footer.appendChild(wrapper);
    } else {
        const wrapper = createWrapper("view-more");
        const refreshSpan = document.createElement("span");
        refreshSpan.innerText = `共${rcount}条回复，`;
        const refreshBtn = createBiliBtn(
            `点击${rcount > 0 ? "查看" : "刷新"}`,
            async (btn) => {
                btn.innerText = "正在请求...";
                try {
                    await ctx.getList(); // 调用原生加载函数
                } catch (e) {
                    console.error("请求回复失败", e);
                }
            },
        );
        wrapper.appendChild(refreshSpan);
        wrapper.appendChild(refreshBtn);
        footer.appendChild(wrapper);
    }
}

/**
 * Hook customElements.define
 * 这是最底层的拦截，当 B站注册评论组件时，我们直接修改组件类
 */
const targets = [
    "bili-comment-renderer", // 主楼容器
    "bili-comment-reply-renderer", // 回复容器
    "bili-comment-replies-renderer", // 回复区容器
];
const originalDefine = customElements.define;
customElements.define = function (name, constructor) {
    if (targets.includes(name)) {
        // 获取 Lit 组件的原型
        const proto = constructor.prototype;

        // 拦截 updated 生命周期方法
        // Lit 在 DOM 更新完成后会自动调用 updated(changedProperties)
        const originalUpdated = proto.updated;
        proto.updated = function (changedProperties) {
            // 先执行原有的渲染逻辑
            if (originalUpdated) {
                originalUpdated.call(this, changedProperties);
            }

            // 执行我们的注入逻辑
            // 放到 microtask 确保渲染彻底完成
            if (name === "bili-comment-replies-renderer") {
                if (settings.enhanceRepliesToggle) {
                    Promise.resolve().then(() => injectRefreshToReplies(this));
                }
            } else {
                Promise.resolve().then(() => performInjection(this));
            }
        };
    }

    return originalDefine.call(this, name, constructor);
};

// ===================== 专栏(opus)观看/投币数注入 =====================
// 在 opus 动态页（转发了专栏时），把专栏的观看数/投币数写进右侧 side-toolbar。
// 两条线：① 钩住 __INITIAL_STATE__ 拿到 cvid；② 等 .side-toolbar__box 出现再写回。
const ARTICLE_VIEW_SVG = `<svg t="1785164347027" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1691" width="24" height="24"><path d="M512 128q69.674667 0 135.509333 21.162667t115.498667 54.997333 93.482667 74.837333 73.685333 82.005333 51.669333 74.837333 32.170667 54.826667l9.984 21.333333q-2.346667 4.992-6.314667 13.482667t-18.816 34.688-31.658667 51.669333-44.330667 59.989333-56.832 64.341333-69.504 60.16-82.346667 51.498667-94.848 34.688-107.349333 13.482667q-69.674667 0-135.509333-21.162667t-115.498667-54.826667-93.482667-74.325333-73.685333-81.493333-51.669333-74.496-32.170667-54.997333l-9.984-20.992q2.346667-4.992 6.314667-13.482667t18.816-34.816 31.658667-51.84 44.330667-60.330667 56.832-64.682667 69.504-60.330667 82.346667-51.84 94.848-34.816 107.349333-13.482667zM512 213.333333q-46.677333 0-91.648 12.330667t-81.152 31.829333-70.656 47.146667-59.648 54.485333-48.853333 57.685333-37.674667 52.821333-26.325333 43.989333q12.330667 21.674667 26.325333 43.52t37.674667 52.352 48.853333 57.002667 59.648 53.845333 70.656 46.677333 81.152 31.488 91.648 12.16 91.648-12.330667 81.152-31.658667 70.656-46.848 59.648-54.186667 48.853333-57.344 37.674667-52.650667 26.325333-43.648q-12.330667-21.674667-26.325333-43.648t-37.674667-52.650667-48.853333-57.344-59.648-54.186667-70.656-46.848-81.152-31.658667-91.648-12.330667zM512 341.333333q70.656 0 120.661333 50.005333t50.005333 120.661333-50.005333 120.661333-120.661333 50.005333-120.661333-50.005333-50.005333-120.661333 50.005333-120.661333 120.661333-50.005333zM512 426.666667q-35.328 0-60.330667 25.002667t-25.002667 60.330667 25.002667 60.330667 60.330667 25.002667 60.330667-25.002667 25.002667-60.330667-25.002667-60.330667-60.330667-25.002667z" p-id="1692" fill="currentColor"></path></svg>`;

function setupArticleStats() {
    // 仅开启开关且在 opus 动态页生效
    if (!settings.showArticleStats) return;
    if (!location.href.includes("/opus/")) return;

    let cvid = null;            // 专栏 id（来自 __INITIAL_STATE__）
    let stats = null;           // { view, coin, cvid }
    let currentToolbar = null;  // 当前 .side-toolbar__box
    let fetchFailed = false;    // 请求失败时显示“获取失败”
    let isFetching = false;      // 请求锁，避免并发重复请求（如连点刷新）

    // —— 线1：通过 unsafeWindow 捕获 __INITIAL_STATE__ 写入，拿到 cvid ——
    const onState = (state) => {
        const basic = state?.detail?.basic;
        if (basic?.comment_type === 12) {
            const id = String(basic.comment_id_str);
            if (id && id !== cvid) {
                cvid = id;
                stats = null;
                fetchFailed = false;
                if (currentToolbar) applyStats(currentToolbar); // 先渲染占位
                fetchArticleStats();
            }
        } else {
            // 不是专栏（或状态被清空）：重置，避免把旧数据写进新页面
            cvid = null;
            stats = null;
        }
    };

    // 隔离上下文里 window.__INITIAL_STATE__ 访问不到，改用 unsafeWindow（指向页面真实 window）
    const uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    if (Object.prototype.hasOwnProperty.call(uw, "__INITIAL_STATE__")) {
        onState(uw.__INITIAL_STATE__);
    }
    let _val = uw.__INITIAL_STATE__;
    try {
        Object.defineProperty(uw, "__INITIAL_STATE__", {
            configurable: true,
            get() { return _val; },
            set(v) { _val = v; onState(v); },
        });
    } catch (e) {
        console.warn("[article-stats] 无法挂钩 __INITIAL_STATE__", e);
    }

    function fetchArticleStats() {
        if (!cvid || isFetching) return;  // 上一次请求未返回则忽略，避免并发
        isFetching = true;
        fetchFailed = false;
        fetch(`https://api.bilibili.com/x/article/view?id=${cvid}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => {
                if (res && res.code === 0 && res.data && res.data.stats) {
                    stats = {
                        view: res.data.stats.view,
                        coin: res.data.stats.coin,
                        cvid: cvid,
                    };
                    if (currentToolbar) applyStats(currentToolbar);
                }
            })
            .catch((e) => {
                fetchFailed = true;
                if (currentToolbar) applyStats(currentToolbar);
                console.error("[article-stats] 获取专栏数据失败", e);
            })
            .finally(() => { isFetching = false; });
    }

    // —— 线2：等待 .side-toolbar__box 出现并写回（含加载占位） ——
    function applyStats(box) {
        if (!box || !cvid) return; // 不是专栏就不碰
        const ready = stats && stats.cvid === cvid; // 数据已就绪且属于当前专栏
        const disp = (v) => ready ? formatCount(v) : (fetchFailed ? "获取失败" : "...");
        // 投币数：占位 / 真实值
        const coinText = box.querySelector(".side-toolbar__action.coin .side-toolbar__action__text");
        if (coinText) coinText.textContent = disp(stats && stats.coin);
        // 观看数：新增一块，占位 / 真实值
        let viewEl = box.querySelector(".side-toolbar__action.opus-view");
        if (!viewEl) {
            viewEl = document.createElement("div");
            viewEl.className = "side-toolbar__action opus-view";
            viewEl.innerHTML = `${ARTICLE_VIEW_SVG}<div class="side-toolbar__action__text"></div>`;
            viewEl.title = "点击刷新观看/投币数";
            viewEl.style.cursor = "pointer";
            viewEl.addEventListener("click", () => {
                stats = null;          // 进入加载态
                fetchFailed = false;
                applyStats(box);       // 先把观看/投币显示成 ...
                fetchArticleStats();   // 重新拉取
            });
            box.appendChild(viewEl);
        }
        viewEl.querySelector(".side-toolbar__action__text").textContent = disp(stats && stats.view);
    }

    const observer = new MutationObserver(() => {
        const box = document.querySelector(".side-toolbar__box");
        if (box && box !== currentToolbar) {
            currentToolbar = box;
            applyStats(box);
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const initBox = document.querySelector(".side-toolbar__box");
    if (initBox) { currentToolbar = initBox; applyStats(initBox); }
}

function formatCount(n) {
    n = Number(n) || 0;
    if (n >= 1e8) return round1(n / 1e8) + "亿";
    if (n >= 1e4) return round1(n / 1e4) + "万";
    return String(n);
}

// 四舍五入到 1 位小数，规避 toFixed 的浮点误差（如 1.05.toFixed(1) === "1.0"）
function round1(x) {
    const r = Math.round(x * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

setupArticleStats();

/******/ })()
;