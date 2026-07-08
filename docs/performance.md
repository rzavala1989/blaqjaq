# Performance

## Demand Rendering

The Canvas switches `frameloop` between `always` and `demand` based on scene activity. Animation windows that force the full loop: camera intro (`!controlsReady`), card motion (`!dealtReady`), shuffle animation (1.5s after shoe reset), and the FPS stats overlay. A 500ms trailing hold (`useHeldFlag` in Scene) lets settling frames finish before the loop drops to demand. While idle between hands the GPU renders nothing; React state changes (card reveals, chip updates) auto-invalidate single frames.

## Bundle Splitting

- `TendenciesPanel` (recharts, ~313KB) is `React.lazy`-loaded on first open; the toggle button lives in Scene so nothing chart-related ships in the main bundle.
- `manualChunks` in vite.config: a `three` chunk (three, fiber, drei, postprocessing; ~1.2MB, cacheable across deploys) and a `react` chunk (react, react-dom, styled-components).
- App code chunk after the split: ~193KB (was a single 1.4MB bundle).

## Debug Panel

Toggle with `perf` button (bottom-right). Controls:
- **FPS Stats**: drei Stats overlay (FPS, MS, MB)
- **PostProcessing**: Vignette render pass
- **ContactShadows**: Ground shadow plane
- **Film Grain**: CSS keyframe animation on pseudo-element

## Optimization Decisions

| Feature | Cost | Decision |
|---|---|---|
| `backdrop-filter: blur()` | 20+ FPS drop | Removed. Solid backgrounds (rgba(0,0,0,0.85)) instead |
| Bloom (postprocessing) | ~15 FPS drop | Removed. CSS text-shadow fakes the glow |
| AccumulativeShadows | 1400ms+ rAF block, 29 GL errors | Replaced with ContactShadows (single-pass) |
| drei Html overlays | Layout recalc per frame | Removed (3D score pills). Scores in DOM panels only |
| THREE.Clock deprecation | Console spam from r3f 9.x | Filtered via console.warn override |

## Chip Texture Caching

Card face textures and chip face textures are cached at module level (`Map<string, CanvasTexture>`). Created once on first use, never regenerated.

## Current Baseline

With all features enabled: ~55-60 FPS, 9-13ms per frame, ~145MB GPU memory. The GLTF models (table, gun, hat, glass) account for most of the memory.
