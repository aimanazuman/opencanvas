import '@testing-library/jest-dom';

// jsdom lacks these browser APIs; the app (or its libraries) touches them while rendering.
class FakeObserver {
  constructor(cb) { this.cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
window.IntersectionObserver = FakeObserver;
window.ResizeObserver = FakeObserver;

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  });
}

window.scrollTo = () => {};
Element.prototype.scrollTo = Element.prototype.scrollTo || function scrollTo() {};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function scrollIntoView() {};

if (!window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:test';
if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};

// No real network: any stray fetch resolves to an empty JSON response.
global.fetch = () =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve(''), blob: () => Promise.resolve(new Blob()) });
