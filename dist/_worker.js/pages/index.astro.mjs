globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderHead, r as renderTemplate } from '../chunks/astro/server_QT7F5oU8.mjs';
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html> <head><title>Freelancer Engine</title>${renderHead()}</head> <body> <h1>Freelancer Engine</h1> <p>If you can see this, the build worked.</p> </body></html>`;
}, "C:/Users/Robert/Documents/Freelance-Manager/freelance-engine/src/pages/index.astro", void 0);

const $$file = "C:/Users/Robert/Documents/Freelance-Manager/freelance-engine/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
