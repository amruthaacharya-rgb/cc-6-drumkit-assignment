# Vanilla TypeScript Drumkit

A **TypeScript-based drum kit** inspired by [Wes Bos’ JavaScript30 Challenge – Drum Kit](https://github.com/wesbos/JavaScript30).  
This project allows users to **play, record, and playback drum sequences** with precise timing, pause/resume functionality, and a visual **progress bar**.

---

## 🔊 Features

- **Play Drum Sounds:** Press keyboard keys to play drum notes with **visual feedback**.  
- **Record Mode:** Record keystrokes along with the time intervals between them.  
- **Stop Recording:** Ends the recording session and saves the sequence.  
- **Playback Recorded Sequence:** Play back the recorded notes with **exact timing**.  
- **Pause/Resume:** Pause and resume both recording and playback without losing timing.  
- **Trim Silence:** Automatically removes leading silence from recordings.  
- **Progress Bar:** Visualizes playback progress in real-time.  
- **Safe Controls:**  
  - Cannot record while playback is active and vice versa.  
  - Key presses are ignored during playback to prevent interference.  
  - Buttons dynamically enable/disable based on state.  

---

## 🎹 Controls

| Button  | Functionality |
|---------|---------------|
| **Record** | Start recording keystrokes. Disabled during playback. |
| **Stop**   | Stop recording or playback. |
| **Play**   | Plays the recorded sequence. Disabled if no recording exists. |
| **Pause**  | Temporarily pauses recording or playback. |

---

## 🛠 Implementation Details

- **Data Structure:**
```ts
recordedNotes: { keyCode: number; time: number }[]
