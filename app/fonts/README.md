# Inter (self-hosted, #51)

- `inter-latin-400-normal.woff2`, `inter-latin-500-normal.woff2`, `inter-latin-600-normal.woff2`: Inter, latin subset, from the `@fontsource/inter` 5.3.0 npm package (`files/`), which repackages the Google Fonts build of Inter (rsms/inter). Downloaded once with `npm pack`; the package is not a dependency.
- `LICENSE.txt`: SIL Open Font License 1.1, copied from the same package.

Loaded by `app/layout.js` with `next/font/local`, so the build never downloads fonts. To add a weight, add it to the design system first, then add its file here and to `app/layout.js`.
