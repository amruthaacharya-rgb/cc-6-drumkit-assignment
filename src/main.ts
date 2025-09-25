let isRecording = false;
let isPaused = false;
let startTime = 0;
let pauseTime = 0;
let recordedNotes: { keyCode: number; time: number }[] = [];
let playbackTimeouts: number[] = [];
let isPlaying = false;
let playbackIndex = 0;

// --- Button existence checks ---
const startBtn = document.getElementById("startBtn") as HTMLButtonElement | null;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement | null;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement | null;
const playBtn = document.getElementById("playBtn") as HTMLButtonElement | null;

// --- Keys ---
const keys = Array.from(document.querySelectorAll<HTMLDivElement>(".key"));

// --- Utility functions ---
/**
 * Get the audio element for a given key code.
 * @param {number} keyCode - Keyboard key code (e.g., 65 for 'A').
 * @returns {HTMLAudioElement | null} The matching audio element, or null if not found.
 */
function getAudio(keyCode: number): HTMLAudioElement | null {
  return document.querySelector<HTMLAudioElement>(`audio[data-key="${keyCode}"]`);
}
/**
 * Get the key element (visual button) for a given key code.
 * @param {number} keyCode - Keyboard key code (e.g., 65 for 'A').
 * @returns {HTMLDivElement | null} The matching key div element, or null if not found.
 */

function getKeyElement(keyCode: number): HTMLDivElement | null {
  return document.querySelector<HTMLDivElement>(`div[data-key="${keyCode}"]`);
}

// Remove animation class after transition
/**
 * Remove the 'playing' animation class when transition ends.
 * @param {TransitionEvent} e - Transition event triggered by CSS animation.
 */
function removeTransition(e: TransitionEvent) {
  if (e.propertyName !== "transform") return;
  (e.target as HTMLElement).classList.remove("playing");
}

keys.forEach((key) => key.addEventListener("transitionend", removeTransition));

// Play a sound

/**
 * Play a sound based on key press or replayed note.
 * @param {KeyboardEvent | number} e - Either:
 *   - `KeyboardEvent` when user presses a key.
 *   - `number` (keyCode) when replaying a recorded note.
 * @param {boolean} [isReplay=false] - Flag indicating if this is a replayed note.
 *   - `false`: User pressed a key.
 *   - `true`: Note is being replayed from recording.
 */
function playSound(e: KeyboardEvent | number, isReplay: boolean = false) {
  const keyCode = isReplay ? (e as number) : (e as KeyboardEvent).keyCode;
  const audio = getAudio(keyCode);
  const key = getKeyElement(keyCode);
  if (!audio || !key) return;

  key.classList.add("playing");
  audio.currentTime = 0;
  audio.play();

  if (isRecording && !isReplay && !isPaused) {
    recordedNotes.push({ keyCode, time: Date.now() - startTime });
  }
}

// --- Control functions ---
/**
 * Enable/disable control buttons.
 * @param {boolean} [start] - If true, disable Start button.
 * @param {boolean} [stop] - If true, disable Stop button.
 * @param {boolean} [pause] - If true, disable Pause button.
 * @param {boolean} [play] - If true, disable Play button.
 */
function setControls(start?: boolean, stop?: boolean, pause?: boolean, play?: boolean) {
  if (startBtn && start !== undefined) startBtn.disabled = start;
  if (stopBtn && stop !== undefined) stopBtn.disabled = stop;
  if (pauseBtn && pause !== undefined) pauseBtn.disabled = pause;
  if (playBtn && play !== undefined) playBtn.disabled = play;
}

/** Start a new recording session. */
function startRecording() {
  isRecording = true;
  isPaused = false;
  startTime = Date.now();
  recordedNotes = [];
  setControls(true, false, false, true);
}

/** Toggle pause/resume during recording. */
function pauseRecording() {
  if (!isPaused) {
    isPaused = true;
    pauseTime = Date.now() - startTime;
    if (pauseBtn) pauseBtn.textContent = "Resume";
  } else {
    isPaused = false;
    startTime = Date.now() - pauseTime;
    if (pauseBtn) pauseBtn.textContent = "Pause";
  }
}


/** Stop the current recording session. */
function stopRecording() {
  isRecording = false;
  isPaused = false;
  setControls(false, true, true, recordedNotes.length === 0);
  if (pauseBtn) pauseBtn.textContent = "Pause";
}

/** Start playback of recorded notes. */
function startPlayback() {
  if (recordedNotes.length === 0 || isPlaying) return;
  isPlaying = true;
  playbackIndex = 0;
  setControls(true, false, false, true);
  playNext();
}

/** Toggle pause/resume during playback. */
function pausePlayback() {
  if (!isPaused) {
    isPaused = true;
    playbackTimeouts.forEach(clearTimeout);
    playbackTimeouts = [];
    if (pauseBtn) pauseBtn.textContent = "Resume";
  } else {
    isPaused = false;
    if (pauseBtn) pauseBtn.textContent = "Pause";
    playNext();
  }
}

/** Stop the current playback. */
function stopPlayback() {
  isPlaying = false;
  isPaused = false;
  playbackTimeouts.forEach(clearTimeout);
  playbackTimeouts = [];
  playbackIndex = 0;
  setControls(false, true, true, recordedNotes.length === 0);
  if (pauseBtn) pauseBtn.textContent = "Pause";
}

// Play next note in playback
/**
 * Play the next note in the recorded sequence.
 * Handles timing gaps between notes.
 */
function playNext() {
  if (!isPlaying || isPaused || playbackIndex >= recordedNotes.length) {
    stopPlayback();
    return;
  }

  const note = recordedNotes[playbackIndex];
  const delay = playbackIndex === 0 ? note.time : note.time - recordedNotes[playbackIndex - 1].time;

  const timeoutId = setTimeout(() => {
    if (!isPlaying || isPaused) return;
    playSound(note.keyCode, true);
    playbackIndex++;
    playNext();
  }, delay);

  playbackTimeouts.push(timeoutId);
}

// --- Event listeners ---
window.addEventListener("keydown", playSound);

startBtn?.addEventListener("click", startRecording);

pauseBtn?.addEventListener("click", () => {
  if (isRecording) pauseRecording();
  else if (isPlaying) pausePlayback();
});

stopBtn?.addEventListener("click", () => {
  if (isRecording) stopRecording();
  if (isPlaying) stopPlayback();
});

playBtn?.addEventListener("click", startPlayback);
