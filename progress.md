Original prompt: Build an installable iPad-friendly Three.js adventure game where kids choose a koala or jaguar and roam a stylized Canberra.

## 2026-05-04

- Added this progress log while iterating on character-touch movement.
- Goal: let kids touch the animal and drag to move it, while preserving the bottom-left joystick, keyboard, jump, dash, collection, restart, and GitHub Pages deployment.
- Testing plan: build, run the Playwright smoke suite locally, visually inspect gameplay, then push and run against the public GitHub Pages URL.
- Implemented canvas pointer capture when a touch starts near the projected animal. Dragging away from the animal now feeds the same movement vector pipeline as keyboard and the joystick.
- Added `window.render_game_to_text` for concise game-state inspection and extended smoke tests to verify character-drag movement.
- Verified locally with `npm run build`, `npx playwright test`, and an iPad-sized gameplay screenshot after dragging the koala.
