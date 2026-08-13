# sanjayrv-dev.github.io

Personal landing page. Static HTML/CSS/JS — no framework, no build step, no
dependencies. Push to `main` and GitHub Pages serves it.

```
index.html   structure + all meta tags
style.css    everything visual
main.js      starfield, lorenz attractor, parallax, jazz, loadout, github stats
og.png       link preview card (generated — see below)
tools/       the og.png generator
```

~15 KB gzipped for the whole page.

## Editing content

Nearly everything you'd want to change is plain text in `index.html`:

| What | Where |
| --- | --- |
| The tagline that types itself | `line` in `main.js` |
| Reading / goals / stats columns | the three `.meta` blocks in the hero |
| Scattered annotations | the `.tag` elements in the hero |
| Ticker items | `#tapeTrack` |
| `position` table | the `.row` list |
| Skill tiles | the `.slot` buttons (`data-tier` 1/2/3 sets the colour) |
| Music | the `.art` tiles |

## The attractor

The pattern behind the page is the Lorenz system, integrated live — not a
video, not an SVG.

```
dx/dt = σ(y − x)      σ = 10
dy/dt = x(ρ − z) − y  ρ = 28
dz/dt = xy − βz       β = 8/3
```

It's in the `ambient lorenz attractor` block in `main.js`. Worth knowing:

- `MAX` is the trail length. Longer = more of the shape visible, more to redraw.
- `ang += .0013` is the rotation speed. Scroll position also feeds into the
  angle (`scrollAng`) so the page and the pattern move together.
- Rotation near `ang = 0` is the x–z projection — that's the view that reads as
  the classic butterfly. Other angles collapse the two lobes together.
- `#lorenz` opacity lives in `style.css`. `main` carries a scrim that fades in
  past the hero, which is what stops the attractor competing with body text.
  If you raise the opacity, raise the scrim too.

Anything sitting on top of it must have an **opaque** background — using
`opacity` on a tile makes the attractor show through and it reads as a hole.
See `.slot.empty`.

## The music

There is no audio file. The jazz is synthesised in the browser with the Web
Audio API — a I–vi–ii–V turnaround in C, played on a 2-operator FM electric
piano, with an upright-ish bass, brushed noise on 2 and 4, convolution reverb
built from a generated impulse, and vinyl crackle over the top. About 5 KB of
code and no network request.

It's generated rather than sampled for a boring reason: shipping a real jazz
recording means licensing it. This way the thing is yours.

To change it, look at the `ambient jazz` block in `main.js`:

- `CHANGES` — the chord loop. Voicings are rootless (no root in the right
  hand) because the bass covers it; that's why they sound like a pianist and
  not like a MIDI file. Add bars by adding entries.
- `BPM` — tempo. It's slow on purpose.
- `master.gain` ramps to `.5` in `start()` — that's the volume.
- `keys()` is the FM patch. Raising the `f * 1.9` modulator index makes it
  brighter and more bell-like; lowering it moves toward a plain sine.

It never autoplays. Browsers block audio without a user gesture, and it would
be obnoxious anyway, so the toggle starts off and the `AudioContext` isn't
even constructed until the first click. Turning it off suspends the context so
it stops costing anything.

### Moving things around the hero

Each floating item carries its own position and parallax depth inline:

```html
<p class="f t2 tag" style="--x:6%;--y:38%;--d:.42">…</p>
```

- `--x` / `--y` — position as a percentage of the hero box
- `--d` — parallax depth; higher moves more with the cursor
- `t1` / `t2` / `t3` — the width at which it disappears

`t1` shows always, `t2` hides below 760px, `t3` hides below 1040px. Put
anything that needs room on `t3`.

**Careful:** because `--x`/`--y` are set inline, a media query that overrides
them needs `!important` — inline custom properties win otherwise. See the
mobile `#heroStats` rule in `style.css`.

## Regenerating the link preview

`og.png` is what Instagram, LinkedIn and iMessage show when the link is
pasted. It's the same attractor as the live page, integrated with the same
constants and composited the same way, so the preview and the site agree.

```bash
python3 tools/make-og.py
```

Needs Pillow (`pip install pillow`). Takes ~40s. Edit the text near the bottom
of the script; `ANG`/`ELEV` change the viewing angle and `CX`/`CY`/`SCALE`
change where it sits on the card.

After changing the deployed URL, update `og:image`, `og:url` and `canonical`
in `index.html` to match — social scrapers need absolute URLs.

## Notes

- `BUILD` in `main.js` is the build stamp in the footer. Bump it when you
  deploy, or it'll keep claiming an old date.
- The `output` section pulls live GitHub stats. It hides itself when there are
  no public commits in the window rather than displaying a row of zeroes, and
  caches for 6h in `localStorage` so a rate-limited reload still shows numbers.
- The attractor and the starfield stop drawing entirely when the tab is hidden,
  and integrate straight to a finished still under `prefers-reduced-motion`.
