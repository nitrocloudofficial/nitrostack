# bottle-cap-mcp

NitroStack MCP server exposing three tools for the bottle-cap-cad workflow.
Vision/dimension extraction from the source photo happens **client-side**
(in Claude, the MCP client) — none of these tools re-derive dimensions from
pixels; `generate_visual_mesh` is the one exception, since Meshy infers
geometry directly from the image itself.

## Tools

| Tool | Input | Backend | Network |
|---|---|---|---|
| `generate_precise_cap` | dimensions JSON | CadQuery (Python — local subprocess, or remote via `CAD_API_URL`) | none / HTTPS |
| `fill` | hole/cavity geometry JSON (circle/rectangle/polygon, uniform or tapered) | CadQuery (Python — local subprocess, or remote via `CAD_API_URL`) | none / HTTPS |
| `repair_mesh` | mesh URL or base64 | PyMeshLab (Python — local subprocess, or remote via `CAD_API_URL`) | none / HTTPS |
| `generate_visual_mesh` | raw image (base64) | Meshy API | HTTPS |

## Setup

```bash
npm install
pip install -r requirements.txt --break-system-packages   # or your own venv
cp .env.example .env   # set MESHY_API_KEY
npm run build
npm start
```

For local iteration without a build step: `npm run dev`.

## Deploying to NitroCloud (or any Node-only host)

NitroCloud's managed hosting runs this server in a Node-only container —
there's no `python3` there for `getPythonCommand()` to find, so
`fill`/`generate_precise_cap`/`repair_mesh` fail with "Could not find a
working Python interpreter" if deployed as-is.

The fix: run `api/server.py` (a small FastAPI wrapper around the same three
CAD scripts) somewhere that *does* have Python — your own machine, a VPS,
Render, Railway, Fly.io, etc. — and point the NitroCloud deployment at it.

**1. Run the API somewhere with Python:**

```bash
# locally, for testing (tunnel with ngrok/cloudflared if NitroCloud needs to reach it)
pip install -r requirements.txt --break-system-packages
export CAD_API_KEY=<pick-a-secret>
uvicorn api.server:app --host 0.0.0.0 --port 8787

# or as a container, anywhere that runs Docker:
docker build -f api/Dockerfile -t bottle-cap-cad-api .
docker run -d -p 8787:8787 -e CAD_API_KEY=<pick-a-secret> bottle-cap-cad-api
```

> `pymeshlab`'s mesh I/O plugins are Qt-based and need `libgl1`/`libglu1-mesa`
> present on the host even for fully headless use — the Dockerfile already
> includes them, but a bare VPS/Render/Railway box may need them installed
> separately (`apt-get install libgl1 libglu1-mesa`), or `/repair` calls will
> fail with `Unknown format for load: stl`.

**2. Point the NitroCloud deployment at it** — set these in NitroCloud's
environment variables dashboard (not just your local `.env`, since that
doesn't travel with the deploy):

```
CAD_API_URL=https://<wherever-you-ran-the-api-above>
CAD_API_KEY=<same secret as above>
```

That's it — `fill.tools.ts`/`cap.tools.ts`/`repair.tools.ts` check for
`CAD_API_URL` at call time and switch to HTTP automatically. Leave it unset
for local NitroStudio dev and they fall back to the original local-subprocess
behavior, unchanged.

## Structure

```
bottle-cap-mcp/
├── src/
│   ├── app.module.ts        # registers the tool providers
│   ├── main.ts               # bootstrap / entrypoint
│   └── tools/
│       ├── shapes.ts          # shared circle/rectangle/polygon zod schema
│       ├── cap.tools.ts       # generate_precise_cap
│       ├── fill.tools.ts      # fill
│       ├── repair.tools.ts    # repair_mesh
│       ├── mesh.tools.ts      # generate_visual_mesh (pure TS, calls Meshy)
│       ├── python-runtime.ts  # local python3/python/py auto-detection
│       └── cad-api-client.ts  # optional HTTP client for api/server.py (CAD_API_URL)
├── cad/
│   ├── precise_cap.py         # CadQuery threaded-cap builder
│   ├── fill.py                # CadQuery plug builder
│   └── repair_mesh.py         # PyMeshLab repair pipeline
├── api/
│   ├── server.py              # FastAPI wrapper exposing /fill /cap /repair over HTTP
│   └── Dockerfile              # standalone image for hosting api/server.py
├── package.json
├── tsconfig.json
└── requirements.txt
```

## Known gaps (carried over from the design discussion)

- ~~**Real threads**~~ — resolved: `precise_cap.py` now builds a solid,
  closed top and cuts a blind bore (not a through-hole), and unions one or
  more real helical thread ridges onto the skirt's inner wall via a
  triangular/trapezoidal profile swept along a `cq.Wire.makeHelix()` path
  (see `make_thread_solid`). `threadStarts` (1-4), `threadDepth`, and
  `topThickness` are new optional fields on `generate_precise_cap` —
  `threadPitch` still falls back to an approximate PCO 1810-style pitch
  (3.18mm, single start) when omitted. This is a parametric approximation
  tuned for FDM printing, not a certified thread-spec generator; swap in
  `cq_warehouse`'s generators if you need an exact standard spec (e.g. a
  certified PCO 1881 mating thread).
- **Polygon flush caps**: `fill`'s `capStyle: "flush"` is implemented for
  circle/rectangle top shapes only. A polygon top with `flush` is
  downgraded to `none` by `fill.tools.ts` (with a warning returned to the
  caller) rather than silently failing.
- **Loft corner fillets**: for tapered holes, rectangle corner radii are
  applied at the wire level before lofting (an approximation), since
  filleting a lofted solid's edges directly is more involved than
  filleting a simple extrusion's vertical edges.
- ~~**NitroCloud deployment target**~~ — resolved: NitroCloud's managed
  hosting is Node-only (no Python interpreter available for the `execFile`
  calls). CadQuery/PyMeshLab now run behind a separate `api/server.py`
  microservice, called over HTTP when `CAD_API_URL` is set — see "Deploying
  to NitroCloud" above. Local NitroStudio dev is unaffected (falls back to
  the original subprocess path when `CAD_API_URL` is unset).
- **`main.ts` bootstrap call**: `NitroFactory.createMcpServer(...).listen()`
  follows NitroStack's documented NestJS-style pattern, but the exact
  factory method wasn't pinned down in the source discussion — confirm
  against your installed NitroStack version.
- **Meshy polling**: `mesh.tools.ts` polls for task completion; swap for
  Meshy's webhook callback in production to avoid long-held connections.
