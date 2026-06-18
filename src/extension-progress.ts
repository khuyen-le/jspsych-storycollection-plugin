import { JsPsych, JsPsychExtension, JsPsychExtensionInfo } from "jspsych";

import { version } from "../package.json";

declare global {
  interface Window { confetti: any; }
}

interface ProgressParams {
  show_progress_bar?: boolean;
  total_pages?: number;
  pages_completed?: number;
  celebration_sound?: string | null;
  /** Text shown in the celebration banner once all pages are completed. */
  celebration_message?: string;
  /** Character used for each star in the progress bar. */
  star_symbol?: string;
  /** CSS color for a filled star (and the celebration banner text). */
  star_color?: string;
  /** Font size of each star, in pixels. Spacing and outline thickness scale with this. */
  star_size?: number;
}

/**
 * **extension-progress**
 *
 * Star progress bar, confetti, and final-page celebration banner for plugin-storybook.
 * Renders into the display container element (not the trial's display element), since
 * it must survive plugins that clear/replace display_element content during the trial.
 *
 * @author Aiden Brown
 */
class StorybookProgressExtension implements JsPsychExtension {
  static info: JsPsychExtensionInfo = {
    name: "storybook-progress",
    version: version,
    data: {},
  };

  // appearance config from the trial's on_start params, kept around so a host
  // plugin can update pages_completed mid-trial via setPagesCompleted() without
  // having to repeat it — on_start only fires once per trial, but a single trial
  // can contain many pages (e.g. plugin-storycollection)
  private config: {
    total_pages: number;
    celebration_sound: string | null;
    celebration_message: string;
    star_symbol: string;
    star_color: string;
    star_size: number;
  } | null = null;

  private pagesCompleted = 0;

  constructor(private jsPsych: JsPsych) {}

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  on_start(params: ProgressParams = {}): void {
    const {
      show_progress_bar = false,
      total_pages = 1,
      pages_completed = 0,
      celebration_sound = null,
      celebration_message = '⭐  Great job!  ⭐',
      star_symbol = '★',
      star_color = '#FFD700',
      star_size = 38,
    } = params;

    this.config = show_progress_bar
      ? { total_pages, celebration_sound, celebration_message, star_symbol, star_color, star_size }
      : null;
    this.pagesCompleted = pages_completed;

    const container = this.jsPsych.getDisplayContainerElement();
    container.querySelector('#storybook-progress-bar')?.remove();
    container.querySelector('#storybook-celebration-banner')?.remove();

    if (show_progress_bar) {
      this.renderProgressBar(container, total_pages, pages_completed, celebration_sound, {
        celebration_message,
        star_symbol,
        star_color,
        star_size,
      });
    }
  }

  /**
   * Re-renders the bar with an updated pages_completed count, reusing the
   * appearance set in on_start. For host plugins whose own internal navigation
   * (e.g. paging through several pages inside one jsPsych trial) needs to update
   * progress more than once per trial. No-op if show_progress_bar wasn't set.
   */
  setPagesCompleted(pagesCompleted: number): void {
    this.pagesCompleted = pagesCompleted;
    this.rerender();
  }

  /**
   * Overrides total_pages after on_start, e.g. so a host plugin can force it to
   * match its own authoritative page count instead of trusting a hand-typed
   * trial param that can drift out of sync with it.
   */
  setTotalPages(totalPages: number): void {
    if (!this.config) return;
    this.config = { ...this.config, total_pages: totalPages };
    this.rerender();
  }

  private rerender(): void {
    if (!this.config) return;
    const { total_pages, celebration_sound, ...appearance } = this.config;
    const container = this.jsPsych.getDisplayContainerElement();
    container.querySelector('#storybook-progress-bar')?.remove();
    container.querySelector('#storybook-celebration-banner')?.remove();
    this.renderProgressBar(container, total_pages, this.pagesCompleted, celebration_sound, appearance);
  }

  on_load(): void {}

  private prefersReducedMotion(): boolean {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  on_finish(): Record<string, any> {
    const container = this.jsPsych.getDisplayContainerElement();
    container.querySelector('#storybook-progress-bar')?.remove();
    container.querySelector('#storybook-celebration-banner')?.remove();
    return {};
  }

  private renderProgressBar(
    container: HTMLElement,
    totalPages: number,
    pagesCompleted: number,
    celebrationSound: string | null,
    appearance: { celebration_message: string; star_symbol: string; star_color: string; star_size: number }
  ): void {
    const { celebration_message, star_symbol, star_color, star_size } = appearance;
    const starGap = star_size * 0.37;
    const starStroke = Math.max(1.5, star_size * 0.065);
    if (!document.getElementById('storybook-star-keyframes')) {
      const style = document.createElement('style');
      style.id = 'storybook-star-keyframes';
      style.textContent = `
        @keyframes storybook-star-pop {
          0%   { transform: scale(0.2); }
          60%  { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        @keyframes storybook-celebrate {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.5); }
          70%  { transform: translateX(-50%) scale(1.08); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    const reduceMotion = this.prefersReducedMotion();

    const bar = document.createElement('div');
    bar.id = 'storybook-progress-bar';
    bar.style.cssText = `
      position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
      display: flex; gap: ${starGap}px; z-index: 100;
    `;

    for (let i = 0; i < totalPages; i++) {
      const star = document.createElement('span');
      star.textContent = star_symbol;
      const isNew = i === pagesCompleted - 1;
      star.style.cssText = `
        font-size: ${star_size}px; line-height: 1; display: inline-block;
        color: ${i < pagesCompleted ? star_color : 'transparent'};
        -webkit-text-stroke: ${starStroke}px ${star_color};
        opacity: ${i < pagesCompleted ? 1 : 0.3};
        ${isNew && !reduceMotion ? 'animation: storybook-star-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;' : ''}
      `;
      bar.appendChild(star);
    }

    container.appendChild(bar);

    if (pagesCompleted >= totalPages) {
      const banner = document.createElement('div');
      banner.id = 'storybook-celebration-banner';
      banner.textContent = celebration_message;
      banner.style.cssText = reduceMotion
        ? `
          position: absolute; top: ${star_size + 30}px; left: 50%; white-space: nowrap; transform: translateX(-50%);
          font-size: 26px; font-family: Georgia, serif; font-weight: bold;
          color: ${star_color}; z-index: 100; opacity: 1;
        `
        : `
          position: absolute; top: ${star_size + 30}px; left: 50%; white-space: nowrap;
          font-size: 26px; font-family: Georgia, serif; font-weight: bold;
          color: ${star_color}; z-index: 100; opacity: 0;
          animation: storybook-celebrate 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards;
        `;
      container.appendChild(banner);

      if (celebrationSound) {
        const audio = new Audio(celebrationSound);
        audio.play().catch(() => {});
      }
    }

    if (reduceMotion || typeof window.confetti !== 'function') return;

    if (pagesCompleted >= totalPages) {
      const deadline = Date.now() + 2500;
      const fire = () => {
        if (Date.now() > deadline) return;
        window.confetti({ particleCount: 55, angle:  60, spread: 60, origin: { x: 0 } });
        window.confetti({ particleCount: 55, angle: 120, spread: 60, origin: { x: 1 } });
        requestAnimationFrame(fire);
      };
      setTimeout(fire, 400);
    } else if (pagesCompleted > 0) {
      window.confetti({ particleCount: 70, spread: 55, startVelocity: 35, origin: { x: 0.5, y: 0.2 } });
    }
  }
}

export default StorybookProgressExtension;
