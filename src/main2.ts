/**
 * @fileoverview
 * Drum Kit Recorder & Playback System
 * -----------------------------------
 * Handles recording, saving, playback, and management of drum pad interactions.
 * Features:
 *  - Keyboard & click-based drum triggering
 *  - Track recording with localStorage persistence
 *  - Playback with progress tracking and UI updates
 *  - Pausing/resuming recording and playback
 */

import { appReducer, type AppState } from "./app-reducer.ts";
import type { KeyType } from "./app-types";
import type { SavedTrack } from "./app-types";
import type { Track } from "./app-types";
import { createPlayer } from "./player.ts";
import { createStore } from "./store";


/** Drum pad key elements */
const keys = Array.from(document.querySelectorAll<HTMLDivElement>(".key"));

/** Record control buttons */
const recordStartBtn = document.getElementById("recordStart") as HTMLButtonElement || null;
const recordStopBtn = document.getElementById("recordStop") as HTMLButtonElement || null;

/**
 * Updates the enabled/disabled state of record control buttons.
 * @param {boolean} [startEnabled] - Whether the start/record button should be disabled.
 * @param {boolean} [stopEnabled] - Whether the stop button should be disabled.
 */
function setControls(startEnabled?: boolean, stopEnabled?: boolean) {
  if (recordStartBtn && startEnabled !== undefined) recordStartBtn.disabled = startEnabled;
  if (recordStopBtn && stopEnabled !== undefined) recordStopBtn.disabled = stopEnabled;
}

setControls(false, true);

/**
 * Retrieves the <audio> element associated with a drum key code.
 * @param {KeyType} keyCode - The key character (e.g., "A", "S").
 * @returns {HTMLAudioElement | null}
 */
function getAudio(keyCode: KeyType) {
  return document.querySelector<HTMLAudioElement>(
    `audio[data-key="${keyCode.charCodeAt(0)}"]`
  );
}

/**
 * Retrieves the corresponding drum pad <div> element for a given key code.
 * @param {KeyType} keyCode
 * @returns {HTMLDivElement | null}
 */
function getKeyElement(keyCode: KeyType) {
  return document.querySelector<HTMLDivElement>(
    `div[data-key="${keyCode.charCodeAt(0)}"]`
  );
}

/**
 * Removes the "playing" visual class after a pad's transition animation ends.
 * @param {TransitionEvent} e
 */
function removeTransition(e: TransitionEvent) {
  if (e.propertyName !== "transform" || !(e.target instanceof HTMLElement)) return;
  e.target.classList.remove("playing");
}

keys.forEach((key) => key.addEventListener("transitionend", removeTransition));

/**
 * Plays the drum sample associated with a pad key and triggers its visual animation.
 * @param {KeyType} key
 */
function playSound(key: KeyType) {
  const audio = getAudio(key);
  const keyEle = getKeyElement(key);
  if (!audio || !keyEle) return;

  keyEle.classList.add("playing");
  audio.currentTime = 0;
  audio.play();
}

/**
 * Checks whether playback is currently active.
 * @returns {boolean}
 */
function isPlaybackActive(): boolean {
  const state = store.getState();
  return ["playbackStarted", "playbackProgress", "playbackResumed"].includes(state.mode);
}

/** Keyboard and click handlers for live drumming and recording */
window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (isPlaybackActive()) return;
  const key = e.key.toUpperCase() as KeyType;
  playSound(key);
  recordAudioUnit(key);
});

keys.forEach((key) =>
  key.addEventListener("click", () => {
    if (isPlaybackActive()) return;
    const keyCode = key.dataset.key as KeyType;
    playSound(keyCode);
    recordAudioUnit(keyCode);
  })
);

/** Redux-like store initialization */
const initialState: AppState = { mode: "normal", tracks: [], currentTrack: -1 };
const store = createStore(initialState, appReducer);
store.subscribe(() => console.log("Mode:", store.getState().mode));

/** Start time of the current drum recording session */
let recordingStartTime: number | null = null;

/**
 * Stops all ongoing drum track playbacks and unsubscribes their listeners.
 */
function stopAllPlayback() {
  Object.keys(trackPlayers).forEach(i => {
    trackPlayers[Number(i)]?.stop();
  });
  store.dispatch({ type: "stopPlayback" });
  updateSavedTracksUI();
}

/** Handle "Record / Pause / Resume" button click */
recordStartBtn?.addEventListener("click", () => {
  const state = store.getState();

  if (["playbackStarted", "playbackProgress", "playbackResumed"].includes(state.mode)) {
    stopAllPlayback();
  }

  const now = Date.now();
  setControls(false, false);

  switch (state.mode) {
    case "normal":
    case "recordingStopped":
      recordingStartTime = now;
      store.dispatch({ type: "startRecording", data: { time: now } });
      recordStartBtn.textContent = "Pause";
      break;

    case "recordingPaused":
      store.dispatch({ type: "resumeRecording", data: { time: now } });
      recordStartBtn.textContent = "Pause";
      break;

    case "recordingStarted":
    case "recordingProgress":
      store.dispatch({ type: "pauseAudioRecording", data: { time: now } });
      recordStartBtn.textContent = "Resume";
      break;
  }
});

/** Handle stop recording and save drum track */
recordStopBtn?.addEventListener("click", () => {
  const state = store.getState();

  if (!["recordingStarted", "recordingProgress", "recordingPaused"].includes(state.mode)) return;

  store.dispatch({ type: "stopAudioRecording" });
  setControls(false, true);

  const currentTrack = state.tracks[state.currentTrack];
  if (!currentTrack) return alert("No track to save!");

  if (!currentTrack.audioUnits || currentTrack.audioUnits.length === 0) {
    alert("Recording discarded — no keys were pressed!");
    recordingStartTime = null;
    recordStartBtn.textContent = "Record";
    updateSavedTracksUI();
    return;
  }

  const saved: SavedTrack[] = JSON.parse(localStorage.getItem("savedTracks") || "[]");
  const trackName = prompt("Enter a name for this track:", `Track ${saved.length + 1}`)?.trim();
  if (!trackName) {
    recordingStartTime = null;
    updateSavedTracksUI();
    return;
  }

  saved.push({
    name: trackName,
    track: { ...currentTrack, audioUnits: currentTrack.audioUnits.map(u => ({ ...u })) },
    duration: getTrackDuration(currentTrack)
  });

  localStorage.setItem("savedTracks", JSON.stringify(saved));
  alert(`Track "${trackName}" saved! Duration: ${getTrackDuration(currentTrack)}`);

  recordingStartTime = null;
  recordStartBtn.textContent = "Record";

  initSavedTracksUI();
  updateSavedTracksUI();
});

/**
 * Records an individual drum hit during recording mode.
 * @param {KeyType} key - Key or pad hit.
 */
function recordAudioUnit(key: KeyType) {
  const { mode, currentTrack } = store.getState();
  if (!["recordingStarted", "recordingProgress"].includes(mode) || recordingStartTime === null || currentTrack < 0) return;
  store.dispatch({ type: "recordAudioUnit", data: { keyCode: key, relativeTime: Date.now() - recordingStartTime } });
}

/**
 * Computes the duration of a drum track in mm:ss format.
 * @param {Track} track
 * @returns {string}
 */
function getTrackDuration(track: Track): string {
  if (!track.audioUnits.length) return "00:00";
  const lastTime = Math.max(...track.audioUnits.map(u => "relativeTime" in u ? u.relativeTime : u.endTime - u.startTime));
  return `${String(Math.floor(lastTime / 60000)).padStart(2, "0")}:${String(Math.floor((lastTime % 60000) / 1000)).padStart(2, "0")}`;
}

/** Track playback players mapped by index */
const trackPlayers: Record<number, ReturnType<typeof createPlayer>> = {};

/** Saved drum tracks container element */
const savedTracksContainer = document.getElementById("savedTracksList");
let currentPlayingIndex: number | null = null;

/**
 * Handles play/pause toggle for a saved drum track.
 * Manages subscription cleanup and UI updates.
 * @param {number} index - Track index in savedTracks.
 */
function handlePlayTrack(index: number) {
  const saved: SavedTrack[] = JSON.parse(localStorage.getItem("savedTracks") || "[]");
  const track = saved[index]?.track;
  if (!track) return;
  // Stop all other playbacks
  Object.entries(trackPlayers).forEach(([i, p]) => {
    const idx = Number(i);
    if (idx !== index) {
      p.stop();
      if ((p as any)._unsubscribe) {
        (p as any)._unsubscribe();
        delete (p as any)._unsubscribe;
      }
    }
  });

  let player = trackPlayers[index];
  if (!player) {
    player = createPlayer(track, playSound as (key: any) => void);
    trackPlayers[index] = player;
  }

  if ((player as any)._unsubscribe) {
    (player as any)._unsubscribe();
    delete (player as any)._unsubscribe;
  }

  const unsubscribe = player.subscribe((progress, completed) => {
    const pb = document.getElementById(`progress-${index}`) as HTMLProgressElement;
    if (pb) {
      pb.style.display = "block";
      pb.value = Math.min(progress * 100, 100);
    }
    if (completed) {
      if (pb) {
        pb.style.display = "none";
        pb.value = 0;
      }
      store.dispatch({ type: "stopPlayback" });
      updateSavedTracksUI();
    }
  });
  (player as any)._unsubscribe = unsubscribe;

  player.toggle();
  store.dispatch({ type: "startPlayback", data: { trackNumber: index } });
  updateSavedTracksUI();
}

/**
 * Stops a specific drum track's playback and cleans up subscription.
 * @param {number} index
 * @param {HTMLButtonElement} [btn]
 */
function handleStopTrack(index: number, btn?: HTMLButtonElement) {
  const player = trackPlayers[index];
  if (!player) return;
  player.stop();

  if ((player as any)._unsubscribe) {
    (player as any)._unsubscribe();
    delete (player as any)._unsubscribe;
  }

  const state = store.getState();
  if (state.currentTrack === index) {
    store.dispatch({ type: "stopPlayback" });
  }

  if (btn) btn.textContent = "▶";
  currentPlayingIndex = currentPlayingIndex === index ? null : currentPlayingIndex;
}

/**
 * Initializes the UI for saved drum tracks and binds play/stop/delete controls.
 */
function initSavedTracksUI() {
  const saved: SavedTrack[] = JSON.parse(localStorage.getItem("savedTracks") || "[]");
  if (!savedTracksContainer) return;

  savedTracksContainer.innerHTML = "";

  if (saved.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "empty-placeholder";
    emptyMsg.innerHTML = `
      <p style="
        text-align:center;
        margin-top:3rem;
        color:#e0d5a1;
        font-size:1.5rem;
        font-weight:600;
        letter-spacing:0.5px;
      ">
        🎶 No saved tracks yet! <br> 
        <span style="font-size:1.2rem; font-weight:400; ">
          Hit <b style="color:#e48108;">Record</b> and make your first masterpiece.
        </span>
      </p>
    `;
    savedTracksContainer.appendChild(emptyMsg);
    return;
  }

  Object.keys(trackPlayers).forEach(k => delete trackPlayers[Number(k)]);
  saved.forEach((t, i) => {
    const trackDiv = document.createElement("div");
    trackDiv.className = "saved-track";
    trackDiv.id = `track-${i}`;

    const topDiv = document.createElement("div");
    topDiv.style.display = "flex";
    topDiv.style.alignItems = "center";
    topDiv.style.justifyContent = "space-between";

    const leftDiv = document.createElement("div");
    leftDiv.style.display = "flex";
    leftDiv.style.alignItems = "center";
    leftDiv.style.gap = "0.5rem";

    const startBtn = document.createElement("button");
    startBtn.id = `play-${i}`;
    startBtn.className = "start-btn";
    startBtn.textContent = "▶";
    startBtn.onclick = () => handlePlayTrack(i);


    const stopBtn = document.createElement("button");
    stopBtn.id = `stop-${i}`;
    stopBtn.textContent = "■";
    stopBtn.disabled = true;
    stopBtn.onclick = () => handleStopTrack(i);

    leftDiv.append(startBtn, stopBtn);

    const infoDiv = document.createElement("div");
    infoDiv.className = "track-info";
    infoDiv.innerHTML = `
      <div class="track-name">${t.name}</div>
      <div class="track-duration">${t.duration}</div>
    `;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    deleteBtn.onclick = () => {
      if (confirm(`Delete "${t.name}"?`)) {
        const all = JSON.parse(localStorage.getItem("savedTracks") || "[]");
        all.splice(i, 1);
        localStorage.setItem("savedTracks", JSON.stringify(all));
        initSavedTracksUI();
        updateSavedTracksUI();
      }
    };

    const progressBar = document.createElement("progress");
    progressBar.id = `progress-${i}`;
    progressBar.max = 100;
    progressBar.value = 0;
    progressBar.className = "track-progress";
    Object.assign(progressBar.style, {
      width: "100%",
      marginTop: "2rem",
      display: "none"
    });

    topDiv.append(leftDiv, infoDiv, deleteBtn);
    trackDiv.append(topDiv, progressBar);
    savedTracksContainer.appendChild(trackDiv);

  });

  saved.forEach((t, i) => {
    trackPlayers[i] = createPlayer(t.track, playSound);
  });
}

/**
 * Synchronizes playback and control button states with the current app state.
 */
function updateSavedTracksUI() {
  const state = store.getState();
  const saved: SavedTrack[] = JSON.parse(localStorage.getItem("savedTracks") || "[]");

  saved.forEach((_, i) => {
    const startBtn = document.getElementById(`play-${i}`) as HTMLButtonElement | null;
    const stopBtn = document.getElementById(`stop-${i}`) as HTMLButtonElement | null;
    const progressBar = document.getElementById(`progress-${i}`) as HTMLProgressElement | null;

    if (!startBtn || !stopBtn || !progressBar) return;

    const isActive = state.currentTrack === i;
    const playing = ["playbackStarted", "playbackResumed", "playbackProgress"].includes(state.mode);
    const paused = state.mode === "playbackPaused";

    startBtn.textContent = isActive && playing ? "⏸" : "▶";
    stopBtn.disabled = !(isActive && (playing || paused));
    progressBar.style.display = isActive && (playing || paused) ? "block" : "none";
  });
}

// Initialize saved beat list and subscribe to UI updates
initSavedTracksUI();
updateSavedTracksUI();

store.subscribe(updateSavedTracksUI);

