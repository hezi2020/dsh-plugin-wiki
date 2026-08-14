// src/invariant.ts
var name = "dsh-custom-tool-invariant";
var inject = ["invariants"];
function apply(ctx) {
  return Promise.resolve(ctx.get("invariants").register("dsh-custom-tool", () => {
  }));
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=invariant.js.map
