


let isRecording = false;
let isPaused = false;
let startTime = 0;
let pauseTime = 0;
let recordedNotes: { keyCode: number; time: number }[] = [];
let playbackTimeouts: number[] = [];  
let isPlaying = false;
let playbackIndex = 0; //Keeps track of which note in recordedNotes is currently being played back.


function removeTransition(e: Event) {
  const transitionEvent = e as TransitionEvent;
  if (transitionEvent.propertyName !== "transform") return;
  (transitionEvent.target as HTMLElement).classList.remove("playing");
}

// Play sound
function playSound(e: any, isReplay = false) {
  const keyCode = isReplay ? e : e.keyCode;   
  // e.keyCode is dynamic — it changes for every key you press.
  // e is already a number taken from recordedNotes (stored earlier).
  const audio = document.querySelector<HTMLAudioElement>(`audio[data-key="${keyCode}"]`);
  const key = document.querySelector<HTMLDivElement>(`div[data-key="${keyCode}"]`);
  if (!audio || !key) return;

  // play animation and sound
  key.classList.add("playing");  //"playing" --> CSS class
  audio.currentTime = 0;
  audio.play();

  if (isRecording && !isReplay && !isPaused) {
    const time = Date.now() - startTime;
    recordedNotes.push({ keyCode, time });
  }
}

// Buttons
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const playBtn = document.getElementById("playBtn") as HTMLButtonElement;

// Initial state
playBtn.disabled = true;
stopBtn.disabled = true;
pauseBtn.disabled = true;

// Start recording
startBtn.addEventListener("click", () => {
  isRecording = true;
  isPaused = false;
  startTime = Date.now();
  recordedNotes = [];   // cleared
  playBtn.disabled = true;
  stopBtn.disabled = false;
  pauseBtn.disabled = false;
});

// Pause/Resume recording or playback
pauseBtn.addEventListener("click", () => {
  if (isRecording) {
    if (!isPaused) {
      isPaused = true;
      pauseTime = Date.now() - startTime;
      pauseBtn.textContent = "Resume";
    } else {
      isPaused = false;
      startTime = Date.now() - pauseTime;
      pauseBtn.textContent = "Pause";
    }
  } else if (isPlaying) {
    if (!isPaused) {
      // Pause playback
      isPaused = true;
      playbackTimeouts.forEach(clearTimeout);
      playbackTimeouts = [];
      pauseBtn.textContent = "Resume";
    } else {
      // Resume playback
      isPaused = false;
      pauseBtn.textContent = "Pause";
      playNext();
    }
  }
});

stopBtn.addEventListener("click", () => {
  // Stop recording
  if (isRecording) {
    isRecording = false;
    isPaused = false;
    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause";
    startBtn.disabled = false;
    playBtn.disabled = recordedNotes.length === 0;
  }

  // Stop playback
  if (isPlaying) {
    isPlaying = false;
    isPaused = false;
    playbackTimeouts.forEach(clearTimeout); // cancel all scheduled notes
    playbackTimeouts = [];
    playbackIndex = 0;
    startBtn.disabled = false;
    playBtn.disabled = recordedNotes.length === 0;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause";
    stopBtn.disabled = true;
  }
});


// Play recording
playBtn.addEventListener("click", () => {
  if (recordedNotes.length === 0 || isPlaying) return;

  isPlaying = true;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
  playbackIndex = 0;
  playBtn.disabled = true;

  playNext();
});

function playNext() {
  if (!isPlaying || isPaused) return;
  if (playbackIndex >= recordedNotes.length) {
    // Playback finished
    isPlaying = false;
    startBtn.disabled = false;
    playBtn.disabled = recordedNotes.length === 0;
    pauseBtn.disabled = true;
    return;
  }

  const note = recordedNotes[playbackIndex];
  const delay = playbackIndex === 0 ? note.time : note.time - recordedNotes[playbackIndex - 1].time;

  const timeoutId = window.setTimeout(() => {
    if (!isPlaying || isPaused) return;
    playSound(note.keyCode, true);
    playbackIndex++;
    playNext();
  }, delay);

  playbackTimeouts.push(timeoutId);
}

// Transition event for key animation
const keys = Array.from(document.querySelectorAll(".key"));
keys.forEach((key) => key.addEventListener("transitionend", removeTransition));

// Keyboard events
window.addEventListener("keydown", (e) => {  //in-built function  //Pressing keys triggers  // e --> callbackFunction
// if (isRecording && !isPaused) 
  playSound(e);
});