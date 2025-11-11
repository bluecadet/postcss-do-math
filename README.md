# do_math

**WIP - TESTING ONLY**

## In your postcss config:

```js
'postcss': {
  basePixelSize: 16, // optional
}
```

## In your CSS:

```css
.element {
  width: do_math(100px / 2);          // -> width: 50px;
  margin: 10px do_math(20 + 5) 0;     // -> margin: 10px 25 0;
  padding: do_math(10 * 2)px;         // -> padding: 20px;
  height: do_math(16rem * 1.5);       // -> height: 24rem;
  font-size: do_math(2 ^ 3)px;        // -> font-size: 8px;
  opacity: do_math(1 / 2);            // -> opacity: 0.5;
  gap: do_math(10px + 5px);           // -> gap: 15px;

  // Mixed px/em - converts em to px using basePixelSize
  width: do_math(2em + 10px);         // -> width: 42px; (2 * 16 + 10)
  height: do_math(3rem - 8px);        // -> height: 40px; (3 * 16 - 8)
  padding: do_math(1.5em * 2 + 5px);  // -> padding: 53px; (1.5 * 16 * 2 + 5)
}
```