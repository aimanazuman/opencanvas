import fs from 'fs';
import path from 'path';

// One UI font for all text. Handwriting (font-hand) is for short display titles only; see docs/design/whiteboard-ui.md.
const css = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
const tailwindConfig = require('../tailwind.config.js');

describe('font rule', () => {
  test('body takes the sans token from tailwind.config.js, not a second copy of the stack', () => {
    expect(css).toMatch(/body\s*\{\s*@apply font-sans;/);
    expect(css).not.toMatch(/body\s*\{[^}]*font-family:/);
  });

  test('form controls and buttons inherit the page font explicitly', () => {
    expect(css).toMatch(/button,\s*input,\s*select,\s*textarea,\s*optgroup\s*\{\s*font-family:\s*inherit;\s*\}/);
  });

  test('the sans token is the system UI stack and the hand token is only the handwriting stack', () => {
    const { fontFamily } = tailwindConfig.theme.extend;
    expect(fontFamily.sans[0]).toBe('system-ui');
    expect(fontFamily.hand).toContain("'Segoe Print'");
    expect(fontFamily.hand).not.toContain('system-ui');
  });
});
