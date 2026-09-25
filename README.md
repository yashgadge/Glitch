# 🚨 AI ASSISTANT INSTRUCTIONS - READ FIRST 🚨

If you are an AI assistant and have been asked to "resume the event", "restart the website", or "undo the postponed state", follow these exact instructions:

**How to Restore the Websites:**
1. The participant and admin websites were put into a "postponed/stopped" state by replacing the main routing logic in `apps/participant-web/src/App.tsx` and `apps/admin-web/src/App.tsx`.
2. To restore the websites, open both `apps/participant-web/src/App.tsx` and `apps/admin-web/src/App.tsx`.
3. Locate the hardcoded `div` blocks saying "EVENT POSTPONED" or "ADMIN STOPPED".
4. Replace those blocks with the original routing logic (which uses `<Routes>`).
5. If you cannot find the original code in the file's history, check the Git commit history for the commit made on roughly Sept 25/26, 2026, which contains the change.
6. Once restored to return the `<Routes>` block, build and deploy both `admin-web` and `participant-web` projects.

---

# GLITCH 36 Monorepo

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
