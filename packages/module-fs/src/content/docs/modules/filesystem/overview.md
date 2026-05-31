---
title: Filesystem module
description: Virtual filesystem (ZenFS) for Open Web Desktop
---

# @owdproject/module-fs

The filesystem module mounts a virtual filesystem in the browser using ZenFS. It powers the Explorer experience when your theme includes it.

## Enable

Add both documentation and FS modules to `desktop.config.ts` (docs first):

```ts
modules: ['@owdproject/module-docs', '@owdproject/module-fs'],
```

## Configuration

Use the top-level `fs` key in `desktop.config.ts` for mounts, default home, and folder shortcuts. See the module README for mount paths and zip bundles in `public/`.
