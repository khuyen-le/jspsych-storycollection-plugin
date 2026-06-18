# plugin-storycollection

## Overview

Collection of story pages

## Loading

*Enter instructions for loading the plugin package here.*

## Compatibility

`plugin-storycollection` requires jsPsych v8.0.0 or later.

## Extensions

### `jspsych-extension-progress`

Renders a gold star progress bar at the top of the screen, fires confetti, and
shows a celebration banner (with an optional sound) once all pages are
complete. It's a standalone jsPsych extension — opted into per trial via
jsPsych's standard `extensions` array, so it isn't coupled to
`plugin-storycollection`'s internals. Attach it to each top-level trial in
your timeline (e.g. one `jsPsychStorycollection` trial per "chapter") and set
`pages_completed`/`total_pages` for that trial to track progress across the
timeline.

To use it, also load the extension browser bundle alongside the plugin:

```html
<script src="dist/index.browser.min.js"></script>
<script src="dist/extension-progress.browser.min.js"></script>
```

```js
const jsPsych = initJsPsych({
  extensions: [{ type: jsPsychExtensionProgress }],
});

const trial = {
  type: jsPsychStorycollection,
  pages: [...],
  extensions: [
    {
      type: jsPsychExtensionProgress,
      params: {
        show_progress_bar: true,   // show the star bar for this trial
        total_pages: 5,            // total number of stars
        pages_completed: 2,        // how many are filled in so far
        celebration_sound: null,   // path to an audio file, played on the final page
      },
    },
  ],
};
```

| Param                  | Type            | Default              | Description |
| ----------------------- | --------------- | -------------------- | ----------- |
| `show_progress_bar`     | boolean         | `false`               | Whether to render the star bar for this trial. |
| `total_pages`           | int             | `1`                   | Total number of stars in the bar. |
| `pages_completed`       | int             | `0`                   | How many stars are filled in. Once this reaches `total_pages`, the celebration banner and confetti cannon fire. |
| `celebration_sound`     | string \| null  | `null`                | Path to an audio file to play alongside the celebration banner. |
| `celebration_message`   | string          | `'⭐  Great job!  ⭐'` | Text shown in the celebration banner. |
| `star_symbol`           | string          | `'★'`                 | Character used for each star. |
| `star_color`            | string          | `'#FFD700'`           | CSS color for a filled star and the celebration text. |
| `star_size`             | int             | `38`                  | Font size of each star, in pixels. Spacing and outline thickness scale with it. |

Confetti requires [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
to be loaded separately (e.g. via CDN `<script>` tag); the extension degrades
gracefully — no confetti, no error — if it isn't present.

Respects the OS-level `prefers-reduced-motion: reduce` setting: skips the star
pop-in, the celebration banner's pop-in, and all confetti, while still landing
on the same end state (filled stars, banner visible).

### `jspsych-extension-animations`

Animates an image within a page, identified by `image_id` (matches the
`id` of an entry in that page's `images` array) — e.g. wiggling `arlo-hi`
once it appears, instead of it just popping in.

Unlike `extension-progress` (which attaches to the trial via the normal
`extensions` array), each `plugin-storycollection` trial only contains one
real jsPsych trial internally — its `pages` are run via direct method calls
as the user navigates, not as separate jsPsych trials, so jsPsych never calls
`on_start`/`on_load` for them. `plugin-storycollection` instead reads
`animations` (and `render_mode`) directly off each page object and drives
the extension itself when that page loads. So unlike the progress extension,
`animations` goes directly on the page, not inside an `extensions` block:

```html
<script src="dist/index.browser.min.js"></script>
<script src="dist/extension-animations.browser.min.js"></script>
```

```js
const jsPsych = initJsPsych({
  extensions: [{ type: jsPsychExtensionAnimations }],
});

const trial = {
  type: jsPsychStorycollection,
  pages: [
    {
      images: [{ id: "arlo-hi", src: "arlo-hi.png", time_onset: 5000 }],
      animations: [
        { image_id: "arlo-hi", type: "wiggle", duration: 1000, time_onset: 5200 },
      ],
      // ...
    },
  ],
};
```

| Animation param      | Type   | Default | Description |
| --------------------- | ------ | ------- | ----------- |
| `image_id`             | string | —       | Must match the `id` of an image in the page's `images` array. |
| `type`                  | string | —       | One of the 7 built-ins (`wiggle`, `loom`, `translate`, `fadeIn`, `fadeOut`, `bounce`, `shake`), or any custom name paired with `keyframes`. |
| `time_onset`            | int    | `0`     | Milliseconds to wait (from when the page itself starts) before the animation starts. |
| `duration`              | int    | `1000`  | How long the animation runs, in milliseconds. |
| `x`, `y`                | int    | `0`     | Pixel offset for the `translate` animation only. |
| `keyframes`             | object | —       | Custom (non-built-in) animation definition; see `plugin-storybook`'s README for the format. |
| `holds_final_state`     | boolean| `false` | For a custom animation: hold the final computed value once finished, instead of reverting to identity. |

Respects the OS-level `prefers-reduced-motion: reduce` setting: animations
jump straight to their end state with no tween.

## Documentation

See [documentation](/plugin-storycollection/README.md)

## Author / Citation

Khuyen Le, Urvi Suwal, Valeria Inojosa, Aiden Brown, Becky Gilbert, Siying Zhang