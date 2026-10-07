# Portfolio — Gaurav Sharma

A personal site built around a live 3D system: a GPU particle network of
service nodes with event packets flowing between them, which the camera flies
through as you scroll.

The concept is deliberate. Avatar-driven portfolios are everywhere now and they
say nothing about the work — a 3D cartoon of you is not evidence you can design
a distributed system. This one *is* the work: the background is a service
topology, and section 02 is the actual architecture of the autonomous
bug-resolution agent, annotated node by node.

## Running it

Any static server. ES modules need a real origin, so opening `index.html` from
the filesystem will not work.

```bash
python3 -m http.server 8080
# then http://localhost:8080
```

There is no build step and no `node_modules`. Three.js is loaded from a CDN via
an import map, so deployment is "upload the folder".

## Deploying

Works as-is on any static host:

- **GitHub Pages** — push to a repo, Settings → Pages → deploy from branch root.
- **Netlify / Vercel / Cloudflare Pages** — drag the folder in, or connect the
  repo. No build command, publish directory is the root.

Then point your domain at it and update `links.portfolio` in your resume.

## Editing content

**`assets/data/profile.js` is the only file you need to touch for copy.** Name,
tagline, metrics, timeline, skills and links all live there. The DOM is a
skeleton; everything visible is rendered from that object, so there is no risk
of the page and the data disagreeing.

Two things to update before going live:

1. **`links.github` and `links.linkedin`** — these are guesses at your slugs.
2. **`Gaurav-Sharma-Resume.pdf`** in the root — currently the version the job
   agent generated for Monzo. Replace it with whichever general resume you want
   public.

To change the architecture diagram, edit the `NODES` and `EDGES` arrays at the
top of `assets/js/ui/sysmap.js`. Layout is hand-placed on purpose: it reads
left-to-right as signals → reasoning → action, and a force-directed layout
would destroy that meaning.

## Structure

```
index.html                  skeleton markup only
assets/css/style.css        all styling
assets/data/profile.js      ← all content lives here
assets/js/main.js           entry point, progressive enhancement
assets/js/scene/
  system-scene.js           renderer, camera path, particle systems
  network.js                procedural graph + packet buffers
  shaders.js                GLSL for nodes and packets
assets/js/ui/
  content.js                renders profile data into the DOM
  reveal.js                 scroll reveals, nav highlight, count-up
  sysmap.js                 interactive architecture diagram
```

## Performance and accessibility

The 3D is an enhancement layered on a page that works without it:

- **Content never waits on WebGL.** The loader dismisses as soon as the markup
  is rendered; the scene fades in over live content whenever it is ready.
- **`prefers-reduced-motion` is honoured properly** — Three.js is dynamically
  imported, so a reduced-motion visitor never downloads it at all. Counters jump
  to their final values instead of animating.
- **No WebGL, no problem.** Feature-detected; the page simply has a dark
  background.
- **Quality scales to the device.** Particle counts and pixel ratio step down on
  narrow screens and low-core machines.
- **The scene steps back.** Past the hero it fades to 30% so it stops competing
  with body copy — full impact where it earns attention, ambience where it does
  not.
- **A motion toggle** sits bottom-right for anyone who wants it to stop.
- Everything animated runs in the vertex shader off one clock uniform, so it is
  three draw calls regardless of particle count.
