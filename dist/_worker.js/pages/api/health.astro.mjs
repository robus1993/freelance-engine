globalThis.process ??= {}; globalThis.process.env ??= {};
export { renderers } from '../../renderers.mjs';

const config = { runtime: "edge" };
const GET = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  config
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
