/**
 * @fileoverview
 * Drum Track Player Utility
 * -------------------------
 * Handles precise playback, pausing, resuming, and stopping of recorded drum sequences.
 * Uses `setTimeout` scheduling and `requestAnimationFrame` for smooth progress updates.
 */
import type { AudioUnit, Track, KeyType } from "./app-types";


/**
 * Creates a drum track player instance that manages playback timing and state.
 *
 * @param {Track} track - The recorded drum track containing a list of audio units.
 * @param {(key: KeyType) => void} playSoundForKey - Callback to trigger the sound of a specific drum pad key.
 * @returns {{
 *   toggle: () => void,
 *   stop: () => void,
 *   subscribe: (cb: (progress: number, completed?: boolean) => void) => () => void,
 *   getProgress: () => number
 * }}
 * Returns an object with player controls and subscription management.
 *
 */
export const createPlayer = (track: Track, playSoundForKey: (key: KeyType) => void) => {

  /** @type {AudioUnit[]} Normalized list of audio units adjusted for pause gaps */
  const normalizedAudioUnits: AudioUnit[] = [];

  /** @type {number} Total accumulated paused time between resume segments */
  let pauseTimeAccumulated = 0;

  /** @type {number} The first playable audio unit's timestamp */
  const firstUnitTime =
  track.audioUnits.find((u): u is AudioUnit => !("startTime" in u))?.relativeTime ?? 0;

  // Flatten track timeline and remove pause gaps
  track.audioUnits.forEach(unit => {
    if ("startTime" in unit) {
      if (normalizedAudioUnits.length > 0) pauseTimeAccumulated += unit.endTime - unit.startTime;
    } else {
      // Normal drum hit
      normalizedAudioUnits.push({ ...unit, relativeTime: unit.relativeTime - pauseTimeAccumulated - firstUnitTime });
    }
  });

  /** @type {ReturnType<typeof setTimeout>[]} All active scheduled timeouts */
  let activeTimeouts: ReturnType<typeof setTimeout>[] = [];

  /** @type {number} Current playback index */
  let currentIndex = 0;

  /** @type {((progress: number, completed?: boolean) => void)[]} Progress listeners */
  const subscribers: ((progress: number, completed?: boolean) => void)[] = [];

  /** @type {boolean} Whether playback is currently active */
  let isPlaying = false;

  /** @type {number | null} Timestamp when current playback started */
  let startTime: number | null = null;

  /** @type {number} Total playback time accumulated before last pause */
  let pausedTime = 0;

  /** @type {number} Total duration of the normalized drum track */
  const totalDuration = normalizedAudioUnits.length
    ? normalizedAudioUnits[normalizedAudioUnits.length - 1].relativeTime
    : 0;

  /**
   * Notifies all subscribed listeners with the current playback progress.
   * @param {boolean} [completed=false] - Whether the track has finished playing.
   */
  const notifySubscribers = (completed = false) => {
    const progress = totalDuration === 0
      ? 0
      : Math.min(((startTime ? Date.now() - startTime : 0) + pausedTime) / totalDuration, 1);
    subscribers.forEach(cb => cb(progress, completed));
  };


  /**
     * Schedules all remaining drum hits for playback based on relative times.
     */
  const schedulePlayback = () => {
    if (currentIndex >= normalizedAudioUnits.length) {
      isPlaying = false;
      currentIndex = 0;
      pausedTime = 0;
      startTime = null;
      notifySubscribers(true);
      return;
    }

    normalizedAudioUnits.slice(currentIndex).forEach((unit, _idx) => {
      const delay = unit.relativeTime - (normalizedAudioUnits[currentIndex].relativeTime);
      activeTimeouts.push(setTimeout(() => {
        playSoundForKey(unit.key);
        currentIndex++;
        if (currentIndex >= normalizedAudioUnits.length) {
          isPlaying = false;
          currentIndex = 0;
          pausedTime = 0;
          startTime = null;
          notifySubscribers(true);
        } else {
          notifySubscribers();
        }
      }, delay));
    });
  };

  /** @type {number} requestAnimationFrame handle */
  let animFrame: number;

  /** Continuously updates UI progress while track is playing */
  const animateProgress = () => {
    if (!isPlaying) return;
    notifySubscribers();
    animFrame = requestAnimationFrame(animateProgress);
  };

  return {
    /**
    * Toggles playback state — starts, pauses, or resumes the drum track.
    */
    toggle() {
      if (isPlaying) {
        activeTimeouts.forEach(clearTimeout);
        activeTimeouts = [];
        isPlaying = false;
        if (startTime) pausedTime += Date.now() - startTime;
        startTime = null;
        cancelAnimationFrame(animFrame);
        notifySubscribers();
      } else {
        isPlaying = true;
        startTime = Date.now();
        schedulePlayback();
        animateProgress();
      }
    },

    /**
    * Stops playback completely and resets state.
    */
    stop() {
      activeTimeouts.forEach(clearTimeout);
      activeTimeouts = [];
      isPlaying = false;
      currentIndex = 0;
      pausedTime = 0;
      startTime = null;
      cancelAnimationFrame(animFrame);
      notifySubscribers(true);
    },

    /**
    * Subscribes to progress updates during playback.
    * @param {(progress: number, completed?: boolean) => void} cb - Callback fired with current progress and completion flag.
    * @returns {() => void} A function to unsubscribe this listener.
    */
    subscribe(cb: (progress: number, completed?: boolean) => void) {
      subscribers.push(cb);
      return () => {
        const i = subscribers.indexOf(cb);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },

    /**
     * Gets the current normalized playback progress (0–1).
     * @returns {number}
     */
    getProgress() {
      if (totalDuration === 0) return 0;
      return ((startTime ? Date.now() - startTime : 0) + pausedTime) / totalDuration;
    },
  };
};

