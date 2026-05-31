# NoticeboardTools

中文維基百科站務小工具。僅補充TW未有之功能。

站內頁面：[NoticeboardTools](https://zh.wikipedia.org/wiki/User:SuperGrey/gadgets/NoticeboardTools)（[站內原始碼](https://zh.wikipedia.org/wiki/User:SuperGrey/gadgets/NoticeboardTools/main.js)）

## 安裝

於[Special:MyPage/common.js](https://zh.wikipedia.org/wiki/Special:MyPage/common.js)加入以下程式碼：

```js
importScript('User:SuperGrey/gadgets/NoticeboardTools/main.js'); // Backlink: [[User:SuperGrey/gadgets/NoticeboardTools]]
```

## 開發

1. 從原始碼構建：

   ```bash
   npm install
   npm run build
   ```

2. 構建後的程式碼位於`dist/bundled.js`。選擇以下一種方式運行此程式碼：

   a. 直接將程式碼貼到開發人員工具控制台，回車運行。

   b. 將程式碼複製到站內你的個人沙盒，然後於[Special:MyPage/common.js](https://zh.wikipedia.org/wiki/Special:MyPage/common.js)安裝。

## 上游

此專案利用了以下專案的部分原始碼，皆以[創用CC 署名-相同方式分享 4.0協議](https://zh.wikipedia.org/wiki/Wikipedia:CC_BY-SA_4.0%E5%8D%8F%E8%AE%AE%E6%96%87%E6%9C%AC)授權：

* [Xiplus的Bulletin視覺化編輯工具](https://zh.wikipedia.org/wiki/User:Xiplus/js/bulletin-editor)及[魔琴版](https://zh.wikipedia.org/wiki/User:%E9%AD%94%E7%90%B4/gadgets/bulletin-editor)
* [1F616EMO的EditRFC小工具](https://zh.wikipedia.org/wiki/User:1F616EMO/EditRFC.js)
