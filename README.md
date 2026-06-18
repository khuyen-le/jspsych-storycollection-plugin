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

## Documentation

See [documentation](/plugin-storycollection/README.md)

## Author / Citation

Khuyen Le, Urvi Suwal, Valeria Inojosa, Aiden Brown, Becky Gilbert, Siying Zhang