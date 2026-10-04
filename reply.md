# B站评论显示状态

可显示评论的**状态**数值、**IP 属地**、**属性位**等额外信息。再也不用回复1来判断评论是否被阿瓦隆了！

- 状态为0则不显示
- 有时评论刚发出来状态未更新，刷新方法：
  - 主评论：可以切换最热/最新评论查看
  - 回复：可以通过收起展开查看（对于没有回复或已展开但不能收起的评论，脚本增加了刷新与收起按钮，可在菜单关闭此功能）

---

已探知的状态和属性位含义：

|state|含义|
|:--|:--|
|11|阿瓦隆审核中，后续会直接删除/转为17/转为正常|
|17|阿瓦隆仅自己可见|

|attr|含义|
|:--|:--|
|1|置顶|
|7|广告链接？|
|8|UP点赞|
|9|UP回复|
|27|带图|
|17, 21, 22|状态为17时通常也带有这几个属性|

待定：

|attr|含义|更多|
|:--|:--|:--|
|18|阿瓦隆恶意评论|直接删除，无法申诉。`网友反馈`|

|attr|含义|更多|
|:--|:--|:--|
|15|热评？|大约24年7月后就没见过这个属性了。而且机制不明，同一个视频下可能[三百多点赞的评论](https://www.bilibili.com/video/BV1zH4y1H7va/#reply214609280464)有，而[一万多点赞的评论](https://www.bilibili.com/video/BV1zH4y1H7va/#reply214607139904)没有|
|4, 25|妙评|[官方妙评收录页（手机打开）](https://www.bilibili.com/blackboard/dynamic/169153)。大约104期的时候（24年），收录的妙评也没有4,25的属性以及妙评UI标识了。妙评收录也截止在122期（25年3月左右）|
|36|被标记|与状态18同时出现，被标记为恶意评论用户。`网友反馈`|


*还有不少属性不知道含义，如果用户有自己的发现可以反馈，谢谢🙏*

> 阿瓦隆仅自己可见如图：
> 
> ![阿瓦隆](https://raw.githubusercontent.com/ZBpine/bili-danmaku-adapt/refs/heads/main/img/reply_adapt.example.png)

---

调整显示项：

油猴菜单或B站评论右下角“⋯”菜单中打开设置浮窗。

<img src="https://raw.githubusercontent.com/ZBpine/bili-danmaku-adapt/refs/heads/main/img/reply_adapt_setting.example.png" alt="设置" width="260">

---

### `1.2.0` 新增 专栏投币/阅读数显示

旧版专栏（`https://www.bilibili.com/read/cv*`）可以投币，但是新版图文动态（`https://www.bilibili.com/opus/*`）可能由于bug，只能投币不返回投币数量。而B站又下架了返回旧版的按钮，因此在本脚本添加显示专栏投币/阅读数的功能 ~~（懒得另写脚本）~~。

*图文动态包括专栏，但不止专栏，因此不能将专栏与图文动态划等号，只有文章最下面写了cv号的才是专栏。* **本功能只显示属于专栏的图文动态的投币/阅读数**

<img src="https://raw.githubusercontent.com/ZBpine/bili-danmaku-adapt/refs/heads/main/img/reply_article_example.png" alt="专栏" width="260">

---
> 技术实现：B站评论区使用Web Components，通过拦截 `customElements.define` API，在组件注册阶段直接修改原型链，实现信息注入。
> 
> 专栏投币/阅读数则通过旧版[专栏api](https://github.com/rinnein/bilibili-API-collect/blob/master/docs/article/view.md)获取
