globalThis.process ??= {};
globalThis.process.env ??= {};
// \0noop-middleware
var onRequest = (_, next) => next();
export { onRequest };
