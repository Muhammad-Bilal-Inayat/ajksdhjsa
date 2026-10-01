# 🚨 STRICT SURGICAL EXECUTION & ZERO SIDE-EFFECTS RULE

## 1. Zero Over-Reaching Edits (Absolute Rule)
- When the user requests a specific change (e.g. 1 button, 1 function, 1 UI element, 1 style, 1 logic fix):
  - Modify ONLY that exact target component, line, or file.
  - STRICTLY FORBIDDEN: Modifying, refactoring, or touching unrelated files, functions, or global defaults.

## 2. Strict Plan Gating Integrity
- Never bypass plan restrictions for tenant owners.
- If a tenant has `Basic`, they receive only `Basic` features.
- If a tenant has `Pro`, they receive only `Pro` features.
- If a tenant has `Enterprise`, they receive only `Enterprise` features.
- Only the global platform Master Admin has administrative bypass.

## 3. Pre-Flight Verification & Zero Regression
- Before completing any task, ensure `npm run build` is 100% clean (0 errors).
- Preserve all existing database schemas, columns, POS speeds, shortcuts, and sync mechanisms without disturbance.
