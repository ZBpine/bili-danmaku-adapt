const settings = {
    showIP: GM_getValue("showIP", true),
    showState: GM_getValue("showState", true),
    showAttr: GM_getValue("showAttr", true),
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
GM_registerMenuCommand("菜单不会立即刷新", () => {});

function parseAttr(attr) {
    if (!attr) return "0";
    let val = Number(attr);
    let bits = [];
    for (let i = 0; i < 32; i++) {
        // 检查第 i 位是否为 1
        if ((val >> i) & 1) bits.push(i);
    }
    return bits.length > 0 ? bits.join("|") : "0";
}

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

    let text = "";
    if (settings.showState && state > 0) text += `状态：${state} `;
    if (settings.showAttr && attr > 0) text += `属性：${parseAttr(attr)} `;
    if (text) {
        let extra = pubdate.querySelector(".custom-hook-info");
        if (!extra) {
            extra = document.createElement("span");
            extra.className = "custom-hook-info";
            extra.style.marginLeft = "15px";
            pubdate.appendChild(extra);
        }
        extra.textContent = text;
    }

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
                Promise.resolve().then(() => injectRefreshToReplies(this));
            } else {
                Promise.resolve().then(() => performInjection(this));
            }
        };
    }

    return originalDefine.call(this, name, constructor);
};
