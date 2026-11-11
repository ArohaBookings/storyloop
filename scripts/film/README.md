# The homepage film

Twenty seconds, silent, with its words on screen. It shows one real note become its real story:
the note and the story are read from the same example the homepage demo plays, so the film cannot
say anything the product did not write.

| File | What it is |
| --- | --- |
| `film.html` | The film as a page. `filmRender(t)` draws the frame at second `t`. Open it in a browser and drag the slider to scrub. |
| `render.mjs` | Photographs 600 frames with Playwright, then encodes them. |
| `encode.swift` | Turns the frames into an H.264 MP4 with AVFoundation (macOS; no ffmpeg needed). |

## Render it again

After the demo's example changes, or after editing `film.html`:

```bash
node scripts/film/render.mjs
```

It writes two variants (`nz` is the Te Whāriki story, `au` the EYLF one), each as a full size file
for desktops, a small one for phones, and a still:

```
public/film/storyloop-nz.mp4         1080 x 1350, about 3 MB
public/film/storyloop-nz-small.mp4    720 x 900, about 1.7 MB
public/film/storyloop-nz-poster.jpg  the still shown before it plays
```

Useful while editing:

```bash
node scripts/film/render.mjs --variant nz --step 30 --frames /tmp/film   # one frame a second, to look at
node scripts/film/render.mjs --frames /tmp/film --encode-only            # encode frames already rendered
```

It needs Playwright (the repo's own, or `.test-local`), the network for the three fonts, and Xcode's
command line tools for `swiftc`.

## Changing what it says

- The scenes and their timing are the `T` and `CAPTIONS` tables near the bottom of `film.html`.
- Every caption is a line the site already makes and can stand behind. Do not add a claim here that
  is not true of the product today.
- The family's reply is the only invented text. It is about the child, never about StoryLoop, and
  the film says "Example from a sample note" throughout.

## A real person, when there is one

The film is not a customer talking, and must never be dressed up as one: a testimonial has to be a
real customer's own words, shown with their agreement. When a real clip exists, fill in
`CUSTOMER_CLIP` in `lib/home-film.ts` (the video, a still, a captions file of exactly what they say,
and a credit line) and the homepage shows it in place of the film.
