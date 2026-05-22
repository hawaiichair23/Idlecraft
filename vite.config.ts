import { defineConfig } from 'vite'

// base: './' makes built asset URLs relative instead of absolute. itch.io
// serves the game from a subpath inside an iframe, not a domain root, so
// absolute '/assets/...' paths would 404 and the game would load blank.
export default defineConfig({
  base: './',
})
