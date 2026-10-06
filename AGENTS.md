# Repository Guidelines

## Project Structure & Module Organization

This repository is a React 19 single-page app built with Vite. Keep application components in `src/` (`App.jsx` is the current screen and `main.jsx` mounts it), and keep global and component styles in `src/index.css` and `src/App.css`. Imported image assets belong in `src/assets/`; files served directly by URL, such as icons, belong in `public/`. The app shell is `index.html`, and Vite configuration is in `vite.config.js`.

## Build, Test, and Development Commands

Use the package scripts from the repository root:

- `npm install` installs dependencies from the lockfile.
- `npm run dev` starts the Vite development server with hot reload.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the built bundle locally for review.
- `npm run lint` runs Oxlint against the project.

There is no test script or test suite currently defined. Run lint and build to check changes before submitting.

## Coding Style & Naming Conventions

Use the existing JavaScript ES module style and React function components. Match the project’s two-space indentation, omit statement-ending semicolons, and use single quotes in JavaScript. Name component files and components in PascalCase; use camelCase for variables and functions. Keep styles in the existing CSS files unless a component-specific stylesheet improves clarity. Prefer descriptive class names and semantic HTML.

## Testing Guidelines

Automated test infrastructure is not configured. For UI changes, run `npm run lint` and `npm run build`, then use `npm run dev` to check the affected screen in a browser. If adding tests, first introduce a test framework and document its command and conventions here.

## Commit & Pull Request Guidelines

Git history was unavailable in the current workspace, so no repository-specific commit convention could be verified. Write concise, imperative commit subjects (for example, `Add responsive navigation`). Pull requests should explain the user-visible change, note validation performed, and include screenshots for visual updates. Link related issues when applicable.

## Security & Configuration Tips

Do not commit credentials or local environment files. Keep dependencies reproducible by updating `package-lock.json` whenever `package.json` changes.
