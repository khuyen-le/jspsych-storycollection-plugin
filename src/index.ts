import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import jsPsychStorybook from "./StoryPage"; // might have to change this once storybook is published to npm

import { version } from "../package.json";

const info = <const>{
  name: "plugin-storycollection",
  version: version,
  parameters: {
    
    /** An array of story pages to display. */
    pages: {
      type: ParameterType.COMPLEX,
      array: true,
      nested: jsPsychStorybook.info.parameters,
    },

    /** If true, the navigation buttons (previous/replay/next) remain enabled while a story page is playing, so the participant can respond before the page finishes. If false, the buttons are disabled until the current page finishes playing. */
    response_allowed_while_playing: {
      type: ParameterType.BOOL,
      default: true,
    },

    /** The instructions to display to the participant. */
    instruction: {
      type: ParameterType.STRING,
      default: "Please read the following instructions carefully.",
    },
    
    /** The button to go to the previous story page. */
    previous_button: {
      type: ParameterType.COMPLEX,
      default: { button_visible: true, button_text: "Previous" },
      nested: {
        /** The text to display on the button. */
        button_text: {
          type: ParameterType.STRING,
          default: "Previous",
        },
        /** Whether the button is visible. */
        button_visible: {
          type: ParameterType.BOOL,
          default: true,
        }
      }
    }, 
    /** The button to replay the current story page. */
    replay_button: {
      type: ParameterType.COMPLEX,
      default: { button_visible: true, button_text: "Replay" },
      nested: {
        /** The text to display on the button. */
        button_text: {
          type: ParameterType.STRING,
          default: "Replay",
        },
        /** Whether the button is visible. */
        button_visible: {
          type: ParameterType.BOOL,
          default: true,
        }
      }
    },
    /** The button to go to the next story page. */
    next_button: {
      type: ParameterType.COMPLEX,
      default: { button_visible: true, button_text: "Next" },
      nested: {
        /** The text to display on the button. */
        button_text: {
          type: ParameterType.STRING,
          default: "Next",
        },
        /** Whether the button is visible. */
        button_visible: {
          type: ParameterType.BOOL,
          default: true,
        }
      }
    },
    
  },
  data: {
    /** An object containing the response for each question. The object will have a separate key (variable) for each question, with the first question in the trial being recorded in `Q0`, the second in `Q1`, and so on. The responses are recorded as integers, representing the position selected on the likert scale for that question. If the `name` parameter is defined for the question, then the response object will use the value of `name` as the key for each question. This will be encoded as a JSON string when data is saved using the `.json()` or `.csv()` functions. */
    response: {
      type: ParameterType.OBJECT,
    },
    
    /** The response time in milliseconds for the participant to make a response. The time is measured from when the questions first appear on the screen until the participant's response(s) are submitted. */
    rt: {
      type: ParameterType.INT,
    },
  },
  // When you run build on your plugin, citations will be generated here based on the information in the CITATION.cff file.
  citations: '__CITATIONS__',
};

type Info = typeof info;

/**
* **plugin-storycollection**
*
* Collection of story pages
*
* @author Khuyen Le, Urvi Suwal, Valeria Inojosa, Aiden Brown, Becky Gilbert, Siying Zhang
* @see {@link /plugin-storycollection/README.md}}
*/
class StorycollectionPlugin implements JsPsychPlugin<Info> {
  static info = info;
  private params!: TrialType<Info>;
  private storybookSlot!: HTMLElement;
  private currentIndex = 0;
  private currentStorybook: jsPsychStorybook | null = null;
  private pageData: any[] = [];
  private finish!: (data: any) => void;
  private previousButtonEl: HTMLButtonElement | null = null;
  private replayButtonEl: HTMLButtonElement | null = null;
  private nextButtonEl: HTMLButtonElement | null = null;
  
  constructor(private jsPsych: JsPsych) {}
  
  trial(display_element: HTMLElement, trial: TrialType<Info>, on_load: () => void) {
    this.params = trial;
    display_element.innerHTML = "";
    
    this.storybookSlot = document.createElement("div");
    this.storybookSlot.id = "jspsych-storybook-slot";
    display_element.appendChild(this.storybookSlot);
    
    if (trial.instruction !== null) {
      display_element.insertAdjacentHTML("beforeend", trial.instruction);
    }
    const buttonGroupElement = document.createElement("div");
    buttonGroupElement.id = "jspsych-storybook-btngroup";
    buttonGroupElement.classList.add("jspsych-btn-group-flex");
    
    if (trial.previous_button.button_visible) {
      buttonGroupElement.insertAdjacentHTML("beforeend", `<button class="jspsych-btn">${trial.previous_button.button_text}</button>`);
      this.previousButtonEl = buttonGroupElement.lastChild as HTMLButtonElement;
      this.previousButtonEl.addEventListener("click", () => this.goToPage(this.currentIndex - 1));
    }
    if (trial.replay_button.button_visible) {
      buttonGroupElement.insertAdjacentHTML("beforeend", `<button class="jspsych-btn">${trial.replay_button.button_text}</button>`);
      this.replayButtonEl = buttonGroupElement.lastChild as HTMLButtonElement;
      this.replayButtonEl.addEventListener("click", () => this.goToPage(this.currentIndex));
    }
    if (trial.next_button.button_visible) {
      buttonGroupElement.insertAdjacentHTML("beforeend", `<button class="jspsych-btn">${trial.next_button.button_text}</button>`);
      this.nextButtonEl = buttonGroupElement.lastChild as HTMLButtonElement;
      this.nextButtonEl.addEventListener("click", () => this.goToPage(this.currentIndex + 1));
    }
    // loop through the pages and check for audio, if there is no audio, then throw a warning on the console that there should be a next button
    for (let i = 0; i < this.params.pages.length; i++) {
      if (!this.params.pages[i].audio || this.params.pages[i].audio.length === 0) {
        console.warn(`Page ${i} has no audio. Consider adding a next button.`);
      }
    }
    display_element.appendChild(buttonGroupElement);

    // override whatever total_pages the extensions param declared — this trial's
    // own pages array is the authoritative count, so the two can't drift apart
    (this.jsPsych.extensions["storybook-progress"] as { setTotalPages?: (n: number) => void })
      ?.setTotalPages?.(this.params.pages.length);

    on_load();

    // start at page 0
    this.goToPage(0)
    
    return new Promise<void>(() => {}); // flag only — finishTrial happens in goToPage
  }

  /** Enables or disables the previous/replay/next navigation buttons. Used to block responses while a page is playing when `response_allowed_while_playing` is false. */
  private setNavigationButtonsDisabled(disabled: boolean) {
    if (this.previousButtonEl) this.previousButtonEl.disabled = disabled;
    if (this.replayButtonEl) this.replayButtonEl.disabled = disabled;
    if (this.nextButtonEl) this.nextButtonEl.disabled = disabled;
  }
  
  private goToPage = async (index: number) => {
    if (index < 0 || index >= this.params.pages.length) return;
    
    this.currentStorybook?.cancel(); // stop whatever page is currently playing
    
    this.currentIndex = index;
    const storybook = new jsPsychStorybook(this.jsPsych); 
    this.currentStorybook = storybook;

    // if responses aren't allowed while a page is playing, disable navigation until it finishes
    if (!this.params.response_allowed_while_playing) {
      this.setNavigationButtonsDisabled(true);
    }
    
    // extensions only get on_start/on_load automatically for real jsPsych trials, but
    // each page here is run via a direct method call rather than the Timeline/Trial
    // machinery, so drive the animations extension's lifecycle manually per page
    const page = this.params.pages[index];
    const animationsExt = this.jsPsych.extensions["storybook-animations"] as
      | { on_start?: (params: any) => void; on_load?: (params: any) => void }
      | undefined;
    animationsExt?.on_start?.({ animations: page.animations, render_mode: page.render_mode });

    // wait for a story page to finish
    const data = await storybook.trial(this.storybookSlot, page, () =>
      animationsExt?.on_load?.({ animations: page.animations, render_mode: page.render_mode })
    );

    // ignore results from a page that got cancelled before it could finish naturally
    // so that storybook isn't overwritten by a cancelled page
    if (storybook !== this.currentStorybook) return;
    this.pageData[index] = data;

    // extension on_start only fires once per trial, but this trial can contain
    // many pages, so tell the progress extension directly when one completes
    (this.jsPsych.extensions["storybook-progress"] as { setPagesCompleted?: (n: number) => void })
      ?.setPagesCompleted?.(index + 1);

    if (index === this.params.pages.length - 1) {
      this.jsPsych.finishTrial({ pages: this.pageData });
    }
    this.goToPage(index + 1);
  };
}

export default StorycollectionPlugin;
