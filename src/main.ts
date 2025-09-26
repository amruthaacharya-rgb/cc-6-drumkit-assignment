/**
 * @fileoverview Drum kit recorder and player with pause/resume functionality and progress bar.
 * @author
 */

/** --- Recording State --- */
let isRecording = false;
let isPaused = false;
let startTime = 0;
let pauseTime = 0;
let recordedNotes: { keyCode: number; time: number }[] = [];
let playbackTimeouts: number[] = []; // Array of timeout IDs used during playback
let isPlaying = false;
let playbackIndex = 0; // Current index of note being played in playback

/** --- Progress Bar --- */
const progressBar = document.getElementById("progressBar") as HTMLDivElement | null;
let playbackStartTime = 0; // timestamp when playback starts
let elapsedBeforePause = 0; // total elapsed time before pause
let progressAnimationFrame: number | null = null;

/** --- Buttons --- */
const startBtn = document.getElementById("startBtn") as HTMLButtonElement | null;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement | null;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement | null;
const playBtn = document.getElementById("playBtn") as HTMLButtonElement | null;

setControls(false, true, true, true);
/** --- Keys --- */
const keys = Array.from(document.querySelectorAll<HTMLDivElement>(".key"));

/**
 * Get the audio element for a given key code.
 * @param {number} keyCode - The key code of the key.
 * @returns {HTMLAudioElement | null} The corresponding audio element or null.
 */
function getAudio(keyCode: number): HTMLAudioElement | null {
  return document.querySelector<HTMLAudioElement>(`audio[data-key="${keyCode}"]`);
}

/**
 * Get the key DOM element for a given key code.
 * @param {number} keyCode - The key code of the key.
 * @returns {HTMLDivElement | null} The corresponding key element or null.
 */
function getKeyElement(keyCode: number): HTMLDivElement | null {
  return document.querySelector<HTMLDivElement>(`div[data-key="${keyCode}"]`);
}

/**
 * Remove the 'playing' class after the key transition ends.
 * @param {TransitionEvent} e - The transition event.
 */
function removeTransition(e: TransitionEvent) {
  if (e.propertyName !== "transform") return;
  (e.target as HTMLElement).classList.remove("playing");
}
keys.forEach((key) => key.addEventListener("transitionend", removeTransition));

/**
 * Play the sound for a given key.
 * @param {KeyboardEvent | number} e - Keyboard event during recording or keyCode during playback.
 * @param {boolean} [isReplay=false] - Whether the sound is being replayed (during playback).
 */
function playSound(e: KeyboardEvent | number, isReplay: boolean = false) {
  const keyCode = isReplay ? (e as number) : (e as KeyboardEvent).keyCode;
  if (!isReplay && (isPlaying || isPaused)) return;

  const audio = getAudio(keyCode);
  const key = getKeyElement(keyCode);
  if (!audio || !key) return;

  key.classList.add("playing");
  audio.currentTime = 0;
  audio.play();

  if (isRecording && !isReplay && !isPaused) {

    if (recordedNotes.length === 0) startTime = Date.now();
    recordedNotes.push({ keyCode, time: Date.now() - startTime });
  }
}

/**
 * Enable or disable control buttons.
 * @param {boolean} [start] - Disable start button if true.
 * @param {boolean} [stop] - Disable stop button if true.
 * @param {boolean} [pause] - Disable pause button if true.
 * @param {boolean} [play] - Disable play button if true.
 */
function setControls(start?: boolean, stop?: boolean, pause?: boolean, play?: boolean) {
  if (startBtn && start !== undefined) startBtn.disabled = start;
  if (stopBtn && stop !== undefined) stopBtn.disabled = stop;
  if (pauseBtn && pause !== undefined) pauseBtn.disabled = pause;
  if (playBtn && play !== undefined) playBtn.disabled = play;
}

/** --- Recording Functions --- */

/**
 * Start recording keyboard input.
 */
function startRecording() {
  isRecording = true;
  isPaused = false;
  startTime = Date.now();
  recordedNotes = [];
  setControls(true, false, false, true);
}

/**
 * Pause or resume recording.
 */
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

/**
 * Stop recording.
 */
function stopRecording() {
  isRecording = false;
  isPaused = false;
  setControls(false, true, true, recordedNotes.length === 0);
  if (pauseBtn) pauseBtn.textContent = "Pause";
}

/** --- Playback Functions --- */

/**
 * Start playback of the recorded notes.
 */
function startPlayback() {
  if (recordedNotes.length === 0 || isPlaying) return;

  // trimRecording();
  isPlaying = true;
  isPaused = false;
  playbackIndex = 0;
  elapsedBeforePause = 0;
  playbackStartTime = Date.now();

  setControls(true, false, false, true);
  updateProgress();
  playNext();
}

/**
 * Pause or resume playback.
 */
function pausePlayback() {
  if (!isPaused) {
    // Pause
    isPaused = true;
    playbackTimeouts.forEach(clearTimeout);
    playbackTimeouts = [];
    if (progressAnimationFrame) cancelAnimationFrame(progressAnimationFrame);

    elapsedBeforePause += Date.now() - playbackStartTime;

    if (pauseBtn) pauseBtn.textContent = "Resume";
  } else {
    // Resume
    isPaused = false;
    playbackStartTime = Date.now();
    if (pauseBtn) pauseBtn.textContent = "Pause";
    updateProgress();
    playNext();
  }
}

/**
 * Stop playback.
 */
function stopPlayback() {
  isPlaying = false;
  isPaused = false;
  playbackTimeouts.forEach(clearTimeout);
  playbackTimeouts = [];
  playbackIndex = 0;
  elapsedBeforePause = 0;
  setControls(false, true, true, recordedNotes.length === 0);
  if (pauseBtn) pauseBtn.textContent = "Pause";
  if (progressAnimationFrame) cancelAnimationFrame(progressAnimationFrame);
  if (progressBar) progressBar.style.width = "0%";
}

/**
 * Play the next note in the recorded sequence.
 */
function playNext() {
  if (!isPlaying || isPaused || playbackIndex >= recordedNotes.length) {
    stopPlayback();
    return;
  }

  const now = Date.now();
  const note = recordedNotes[playbackIndex];

  const elapsed = elapsedBeforePause + (now - playbackStartTime);
  const delay = Math.max(0, note.time - elapsed);

  const timeoutId = setTimeout(() => {
    if (!isPlaying || isPaused) return;
    playSound(note.keyCode, true);
    playbackIndex++;
    playNext();
  }, delay);

  playbackTimeouts.push(timeoutId);
}

/**
 * Update the playback progress bar.
 */
function updateProgress() {
  if (!progressBar) return;

  const totalDuration = recordedNotes[recordedNotes.length - 1]?.time || 0;
  if (totalDuration === 0) return;

  const elapsed = elapsedBeforePause + (isPlaying && !isPaused ? (Date.now() - playbackStartTime) : 0);
  let percent = (elapsed / totalDuration) * 100;

  if (percent > 100 || playbackIndex >= recordedNotes.length) percent = 100;
  progressBar.style.width = percent + "%";

  if (percent < 100) {
    progressAnimationFrame = requestAnimationFrame(updateProgress);
  }
}

/** --- Event Listeners --- */
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
