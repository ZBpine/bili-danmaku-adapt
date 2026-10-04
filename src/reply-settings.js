import styles from "./reply-settings.css";

const COMMENT_OPTIONS = [
    ["showIP", "显示 IP 属地"],
    ["showState", "显示状态"],
    ["showAttr", "显示属性位"],
    ["enhanceRepliesToggle", "增强回复展开 / 收起"],
    ["showZeroReplyRefresh", "0 回复时显示刷新"],
];

export function createReplySettings(settings, onChange) {
    let dialog;
    let inputs;

    function openSettings() {
        if (!dialog) {
            const host = document.createElement("div");
            host.id = "bili-reply-adapt-settings";
            const shadow = host.attachShadow({ mode: "open" });
            shadow.innerHTML = `<style>${styles}</style>
                <dialog aria-labelledby="settings-title">
                    <header>
                        <h2 id="settings-title">评论增强设置</h2>
                        <button type="button" class="close" aria-label="关闭设置">×</button>
                    </header>
                    <div class="options"></div>
                </dialog>`;
            (document.body || document.documentElement).appendChild(host);
            dialog = shadow.querySelector("dialog");
            inputs = new Map();
            const options = shadow.querySelector(".options");
            for (const [key, label] of COMMENT_OPTIONS) {
                const row = document.createElement("label");
                row.className = "option";
                row.innerHTML = `<span>${label}</span>
                    <input type="checkbox" role="switch" aria-label="${label}">`;
                const input = row.querySelector("input");
                input.addEventListener("change", () => {
                    settings[key] = input.checked;
                    GM_setValue(key, input.checked);
                    onChange(key);
                });
                inputs.set(key, input);
                options.appendChild(row);
            }
            shadow.querySelector(".close").addEventListener("click", () => dialog.close());
            dialog.addEventListener("click", (event) => {
                // dialog 的 backdrop 点击仍以 dialog 为 target；不把面板内部空白当成关闭。
                const rect = dialog.getBoundingClientRect();
                if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right
                    || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
            });
        }
        for (const [key, input] of inputs) input.checked = settings[key];
        if (!dialog.open) dialog.showModal();
    }

    GM_registerMenuCommand("评论增强设置…", openSettings);
    if (location.pathname.startsWith("/opus/")) {
        let articleMenuId;
        const registerArticleMenu = () => {
            articleMenuId = GM_registerMenuCommand(
                `${settings.showArticleStats ? "✅" : "❌"} 专栏阅读 / 投币数（刷新后生效）`,
                () => {
                    settings.showArticleStats = !settings.showArticleStats;
                    GM_setValue("showArticleStats", settings.showArticleStats);
                    GM_unregisterMenuCommand(articleMenuId);
                    registerArticleMenu();
                },
            );
        };
        registerArticleMenu();
    }

    function injectMenuSettings(menu) {
        const options = menu.shadowRoot?.querySelector("#options");
        if (!options || options.querySelector(".reply-adapt-settings-entry")) return;
        const entry = document.createElement("li");
        entry.className = "reply-adapt-settings-entry";
        entry.textContent = "评论增强设置";
        entry.setAttribute("role", "menuitem");
        entry.tabIndex = 0;
        entry.style.borderTop = "1px solid var(--line_regular, #e3e5e7)";
        const open = (event) => {
            event.preventDefault();
            event.stopPropagation();
            // 原生父组件用此状态控制菜单；不派发 select，避免触发举报等原生 action。
            const owner = menu.getRootNode().host;
            if (owner && "showMoreMenu" in owner) owner.showMoreMenu = false;
            openSettings();
        };
        entry.addEventListener("click", open);
        entry.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") open(event);
        });
        options.appendChild(entry);
    }

    return { injectMenuSettings };
}
