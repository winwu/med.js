med.js
======

> 仿 Medium 式的 HTML5 編輯器 framework。

Medium 編輯器強大的地方在於他背後幫處理掉了很多麻煩問題，使用者可以很直覺得使用這個平台，完全專注於內容編輯。也是這樣，所以有好幾套仿 Medium 的編輯器出現，像是 [medium-editor](https://github.com/daviferreira/medium-editor/)、[Medium.js](https://github.com/jakiestfu/Medium.js/)，不過他們都有一個共通問題，只仿了表面，沒有考慮到輸出資料的結構，Medium 編輯器會那麼強大的主要原因之一就是輸出資料的結構，有漂亮的結構才能有效的用程式處理內容（可惜的是大家好像都不怎麼看重這點，只要有相似外觀就好了...）。med.js 就是在發現了這些問題後決定開始撰寫。

最新版本 (last version): [0.1.0-rc1](https://github.com/poying/med.js/releases/tag/0.1.0-rc1)

## 瀏覽器支援

* Firefox, Chrome 良好
* Safari 還可以
* IE 可以用來 render 畫面，但不可編輯

## 特色

1. 資料輸出結構
2. 輕量
3. Plugin，只專注於維持結構，其他事情都交給 plugin 處理

## 文件

[Wiki](https://github.com/poying/med.js/wiki)

## 維護者

* [poying](http://github.com/poying)

## License

(The MIT License)

Copyright (c) 2014 Po-Ying Chen &lt;poying.me@gmail.com&gt;.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
