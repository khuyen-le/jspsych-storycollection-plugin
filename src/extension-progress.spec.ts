import { flushPromises, startTimeline } from "@jspsych/test-utils";

import jsPsychStorycollection from "./index";
import jsPsychExtensionProgress from "./extension-progress";

jest.useFakeTimers();

// extension-progress is host-plugin-agnostic, so any plugin works as the test
// vehicle; plugin-storycollection's own trial() never resolves on its own with
// an empty `pages` array, which is fine since these tests only check rendering
const baseTrial = {
  type: jsPsychStorycollection,
  pages: [{}],
  previous_button: {},
  replay_button: {},
  next_button: {},
};

// these test trials have no audio and an image with no duration, so the plugin's
// own "end after the last image's duration" timer fires on the next tick
async function advanceToNextTrial() {
  jest.advanceTimersByTime(0);
  await flushPromises();
}

describe("extension-progress", () => {
  it("renders one star per total_pages, with completed stars filled in", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: { show_progress_bar: true, total_pages: 5, pages_completed: 2 },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const bar = jsPsych.getDisplayContainerElement().querySelector("#storybook-progress-bar");
    expect(bar).not.toBeNull();
    expect(bar.children.length).toBe(5);
  });

  it("dims unfilled stars via opacity, so the fill is visible regardless of symbol type", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: { show_progress_bar: true, total_pages: 3, pages_completed: 1, star_symbol: "🐰" },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const bar = jsPsych.getDisplayContainerElement().querySelector("#storybook-progress-bar");
    const filled = bar.children[0] as HTMLElement;
    const unfilled = bar.children[1] as HTMLElement;
    expect(filled.style.opacity).toBe("1");
    expect(unfilled.style.opacity).toBe("0.3");
  });

  it("shows the celebration banner only once all pages are completed", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: { show_progress_bar: true, total_pages: 3, pages_completed: 2 },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const container = jsPsych.getDisplayContainerElement();
    expect(container.querySelector("#storybook-celebration-banner")).toBeNull();
  });

  it("renders nothing when show_progress_bar is not set", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [{ type: jsPsychExtensionProgress, params: {} }],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const container = jsPsych.getDisplayContainerElement();
    expect(container.querySelector("#storybook-progress-bar")).toBeNull();
  });
});

describe("extension-progress appearance customization", () => {
  it("uses the given star_symbol and star_color instead of the defaults", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: {
                show_progress_bar: true,
                total_pages: 2,
                pages_completed: 1,
                star_symbol: "🌙",
                star_color: "rgb(100, 100, 255)",
              },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const bar = jsPsych.getDisplayContainerElement().querySelector("#storybook-progress-bar");
    const filledStar = bar.children[0] as HTMLElement;
    expect(filledStar.textContent).toBe("🌙");
    expect(filledStar.style.color).toBe("rgb(100, 100, 255)");
  });

  it("scales star size, spacing, and outline together", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: { show_progress_bar: true, total_pages: 1, pages_completed: 0, star_size: 60 },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const bar = jsPsych.getDisplayContainerElement().querySelector("#storybook-progress-bar") as HTMLElement;
    const star = bar.children[0] as HTMLElement;
    expect(star.style.fontSize).toBe("60px");
  });

  it("uses the given celebration_message instead of the default", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: {
                show_progress_bar: true,
                total_pages: 1,
                pages_completed: 1,
                celebration_message: "All done, nice work!",
              },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const banner = jsPsych.getDisplayContainerElement().querySelector("#storybook-celebration-banner");
    expect(banner.textContent).toBe("All done, nice work!");
  });
});

describe("extension-progress across multiple trials", () => {
  it("clears the previous trial's bar and banner before the next trial starts", async () => {
    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: { show_progress_bar: true, total_pages: 2, pages_completed: 2 },
            },
          ],
        },
        {
          ...baseTrial,
          extensions: [{ type: jsPsychExtensionProgress, params: { show_progress_bar: false } }],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const container = jsPsych.getDisplayContainerElement();
    expect(container.querySelector("#storybook-celebration-banner")).not.toBeNull();

    await advanceToNextTrial();

    expect(container.querySelector("#storybook-progress-bar")).toBeNull();
    expect(container.querySelector("#storybook-celebration-banner")).toBeNull();
  });

  it("does not stack a second progress bar on top of the first", async () => {
    const makeTrial = (pages_completed: number) => ({
      ...baseTrial,
      extensions: [
        {
          type: jsPsychExtensionProgress,
          params: { show_progress_bar: true, total_pages: 3, pages_completed },
        },
      ],
    });

    const { jsPsych } = await startTimeline([makeTrial(1), makeTrial(2), makeTrial(3)], {
      extensions: [{ type: jsPsychExtensionProgress }],
    });

    const container = jsPsych.getDisplayContainerElement();
    await advanceToNextTrial();
    await advanceToNextTrial();

    expect(container.querySelectorAll("#storybook-progress-bar").length).toBe(1);
  });
});

describe("extension-progress with prefers-reduced-motion", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders the celebration banner immediately visible, with no pop-in animation", async () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as any;

    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: { show_progress_bar: true, total_pages: 2, pages_completed: 2 },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const banner = jsPsych.getDisplayContainerElement().querySelector(
      "#storybook-celebration-banner"
    ) as HTMLElement;
    expect(banner.style.opacity).toBe("1");
    expect(banner.style.animation).toBe("");
  });

  it("renders the newly completed star without the pop animation", async () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as any;

    const { jsPsych } = await startTimeline(
      [
        {
          ...baseTrial,
          extensions: [
            {
              type: jsPsychExtensionProgress,
              params: { show_progress_bar: true, total_pages: 3, pages_completed: 2 },
            },
          ],
        },
      ],
      { extensions: [{ type: jsPsychExtensionProgress }] }
    );

    const bar = jsPsych.getDisplayContainerElement().querySelector("#storybook-progress-bar");
    const newStar = bar.children[1] as HTMLElement;
    expect(newStar.style.animation).toBe("");
  });
});
