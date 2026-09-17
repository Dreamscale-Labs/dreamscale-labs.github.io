# Dreamscale Labs

Static marketing site for Dreamscale Labs, served at `dreamscalelabs.com`.

## Local preview

```sh
python3 -m http.server 8768 --bind 127.0.0.1
```

Open `http://127.0.0.1:8768/`. Design explorations live in `prototypes/`, with the selected layout in concept 12.

## Checks

```sh
node --test tests/static-page.test.mjs
```

The homepage uses `assets/landing/` for its styles, brand, robot video, and model-provider logos. Blog pages retain their existing styles and routes. Demo links point to the Dreamscale Labs Cal.com event.

Changes to this repository do not migrate the dashboard, API, or documentation hosted on Dropbear subdomains.
