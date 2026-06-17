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
    /** The instructions to display to the participant. */
    instruction: {
      type: ParameterType.STRING,
      default: "Please read the following instructions carefully.",
    },
    
    /** The button to go to the previous story page. */
    previous_button: {
      type: ParameterType.COMPLEX,
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
      (buttonGroupElement.lastChild as HTMLElement).addEventListener("click", () => this.goToPage(this.currentIndex - 1));
    }
    if (trial.replay_button.button_visible) {
      buttonGroupElement.insertAdjacentHTML("beforeend", `<button class="jspsych-btn">${trial.replay_button.button_text}</button>`);
      (buttonGroupElement.lastChild as HTMLElement).addEventListener("click", () => this.goToPage(this.currentIndex));
    }
    if (trial.next_button.button_visible) {
      buttonGroupElement.insertAdjacentHTML("beforeend", `<button class="jspsych-btn">${trial.next_button.button_text}</button>`);
      (buttonGroupElement.lastChild as HTMLElement).addEventListener("click", () => this.goToPage(this.currentIndex + 1));
    }
    display_element.appendChild(buttonGroupElement);
    
    on_load();

    // start at page 0
    this.goToPage(0)
    
    return new Promise<void>(() => {}); // flag only — finishTrial happens in goToPage
  }
  
  private goToPage = async (index: number) => {
    if (index < 0 || index >= this.params.pages.length) return;
    
    this.currentStorybook?.cancel(); // stop whatever page is currently playing
    
    this.currentIndex = index;
    const storybook = new jsPsychStorybook(this.jsPsych); 
    this.currentStorybook = storybook;
    
    // wait for a story page to finish
    const data = await storybook.trial(this.storybookSlot, this.params.pages[index], () => {});

    // ignore results from a page that got cancelled before it could finish naturally
    // so that storybook isn't overwritten by a cancelled page
    if (storybook !== this.currentStorybook) return;
    this.pageData[index] = data;

    this.goToPage(index + 1);
    
    if (index === this.params.pages.length - 1) {
      this.jsPsych.finishTrial({ pages: this.pageData });
    }
  };
}

export default StorycollectionPlugin;
