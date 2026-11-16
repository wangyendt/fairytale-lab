# Third-party notices

The Windows executable includes Python and dependencies installed from the following distributions:

- Three.js r187 (0.187.0) — MIT: https://github.com/mrdoob/three.js ; locally bundled, including OrbitControls. Notice in `third_party_licenses/THREE-LICENSE.txt`.
- esbuild 0.28.2 — MIT: https://github.com/evanw/esbuild ; build-time bundler, not a runtime service.

- Python — Python Software Foundation license: https://www.python.org/psf/license/
- pywebview — BSD-3-Clause: https://github.com/r0x0r/pywebview
- pythonnet / clr_loader — https://github.com/pythonnet/pythonnet / https://github.com/pythonnet/clr-loader
- cffi / pycparser — https://cffi.readthedocs.io/ / https://github.com/eliben/pycparser
- Bottle / proxy_tools / typing_extensions — dependency distributions; license files copied where provided.
- PyInstaller bootloader and build-time tooling — https://pyinstaller.org/
- Microsoft WebView2 SDK loader / managed assemblies distributed with pywebview — https://developer.microsoft.com/en-us/microsoft-edge/webview2/

The WebView2 browser runtime is installed separately by Microsoft and is not included in this executable. This app does not bundle Chromium/Electron.

License and notice files supplied by the installed Python distributions are reproduced under `third_party_licenses/`. Icon artwork and experiment scene graphics were authored for this project; there are no downloaded book illustrations, external fonts, or copied story pages.

## Astronomy imagery (3.0)

Earth and lunar imagery from NASA’s official [NASA-3D-Resources repository](https://github.com/nasa/NASA-3D-Resources), with exact paths and limitations in `web/assets/cosmos/SOURCES.md`. All galaxy and black-hole scenes are procedural visualizations, not EHT photographs or movie footage.

## Interaction reference (3.1)

The continuous scroll/LOD interaction is inspired by [Stellar Odyssey](https://stellar.guushu.com/), whose source is AGPL-3.0. This app independently implements its own logarithmic scale renderer; no Stellar Odyssey code, survey catalogue, imagery or audio is included. The original project is not embedded or redistributed.
