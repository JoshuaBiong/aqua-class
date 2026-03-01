// ─── Utilities ────────────────────────────────────────────────────────────────
export const mkCode = () => Math.random().toString(36).slice(2,8).toUpperCase();
export const fmtDate = () => new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
