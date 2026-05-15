// webpack.config.js
const path = require("path");
const ScriptCatWebpackPlugin = require("scriptcat-webpack-plugin");

module.exports = [{
    entry: {
        "bili-dm-adapt": "./src/index.js",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].user.js",
    },
    optimization: { minimize: false },
    plugins: [
        new ScriptCatWebpackPlugin({
            file: "bili-dm-adapt.user.js",
            name: "B站弹幕显示发送次数与点赞数",
            namespace: "https://github.com/ZBpine/bili-danmaku-adapt/",
            version: "1.1.2",
            description:
                "在弹幕旁边显示发送次数（合并同文本弹幕）与点赞数。",
            author: "ZBpine",

            metadata: {
                icon: "https://www.bilibili.com/favicon.ico",
                match: [
                    "https://www.bilibili.com/video/*",
                    "https://www.bilibili.com/bangumi/play/*",
                    "https://www.bilibili.com/list/watchlater*",
                ],
                grant: ["GM_addStyle", "GM_xmlhttpRequest"],
                connect: ["api.bilibili.com"],
                "run-at": "document-start",
                license: "MIT",
            },
        }),
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                type: "asset/source", // 把 css 文件当成“源码字符串”导入
            },
        ],
    },

}, {
    entry: {
        "bili-reply-adapt": "./src/reply.js",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].user.js",
    },
    optimization: { minimize: false },
    plugins: [
        new ScriptCatWebpackPlugin({
            file: "bili-reply-adapt.user.js",
            name: "B站评论显示状态",
            namespace: "https://github.com/ZBpine/bili-danmaku-adapt/",
            version: "1.1.2",
            description:
                "评论显示状态，以便知道是否被阿瓦隆。",
            author: "ZBpine",

            metadata: {
                icon: "https://www.bilibili.com/favicon.ico",
                match: [
                    "https://www.bilibili.com/*",
                    "https://t.bilibili.com/*",
                    "https://space.bilibili.com/*",
                ],
                grant: ["GM_registerMenuCommand", "GM_getValue", "GM_setValue"],
                "run-at": "document-start",
                license: "MIT",
            },
        }),
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                type: "asset/source", // 把 css 文件当成“源码字符串”导入
            },
        ],
    },

}];
