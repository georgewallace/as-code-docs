# Dashboard Docs

Single-page Dashboard API reference site built as static HTML with Redocly.

## Development

Run the local dev server:

```bash
npm run dev
```

Open http://localhost:3000 to view the site.

This previews the generated static output from `dist/`.

## Build pipeline

- `openapi/kibana-openapi.yaml` is the source OpenAPI spec.
- `generated/dashboard-openapi.yaml` is the filtered spec generated during build.
- `dist/index.html` is the generated static site entry point.
- `scripts/redoc-template.hbs` defines the static reference page shell.

To produce the static site bundle:

```bash
npm run build
```

To preview an already-built bundle:

```bash
npm run start
```

## Validation

```bash
npm run lint
npm run build
```

## Deployment

GitHub Pages publishes the generated static site from GitHub Actions.

- Workflow: `.github/workflows/deploy-pages.yml`
- Published artifact: `dist/`
- Automatic trigger: pushes to the default branch when `openapi/kibana-openapi.yaml`, `scripts/**`, `package.json`, `package-lock.json`, or `favicon.ico` changes
- Manual trigger: `workflow_dispatch`

Before the first deployment, configure the repository's GitHub Pages source to `GitHub Actions` in the repository settings.
