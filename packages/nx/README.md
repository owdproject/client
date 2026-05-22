# @owdproject/nx (workspace)

Nx plugin for OWD install executors (`install-app`, `install-module`, `install-theme`).

This copy lives in the client monorepo so we do not need a **pnpm patch** on the broken npm `@owdproject/nx@0.0.3` tarball (missing `dist/**/schema.json`).

Canonical source: [github.com/owdproject/nx](https://github.com/owdproject/nx). Publish **0.0.4+** from that repo (`pnpm run build` copies non-TypeScript assets) so generated projects can depend on npm instead of `workspace:*`.
