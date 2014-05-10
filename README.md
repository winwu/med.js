med.js
------

仿 Medium 式的 HTML5 編輯器 framework。

> med.js 只是一個基本的框架，其他功能需要透過 plugin 擴充

## API

### Basic

#### editor#sync()

同步 HTML 內容與編輯器保存的資料

#### editor#toJSON()

取得編輯器資料

#### editor#fromJSON(json)

匯入編輯器資料

### Events

#### editor#on(event, handler)

#### editor#once(event, handler)

#### editor#off(event, handler)

#### editor#emit(event)


### Middleware

#### editor#use(middleware)

context:

```javascript
{
  event: KeyboardEvent,
  editor: editor,
  prevent: preventEvent
}
```

### Caret (editor#caret)

#### caret#focusElement([tagName])

回傳當前指標所在的 Element

#### caret#focusTo(el)

#### caret#textBefore(el)

#### caret#textAfter(el)

#### caret#moveToStart(el)

#### caret#moveToEnd(el)

#### caret#split(el)

#### caret#save()

保存當前選取範圍

#### caret#restore()

恢復選取範圍

#### caret#selectAllText(el)

#### caret#insertElement(el)

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
