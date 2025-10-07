import { type Track, type KeyType, type AudioUnit, type PauseTime } from "./app-types";

export type AppMode =
  | "recordingStarted"
  | "recordingProgress"
  | "recordingPaused"
  | "recordingStopped"
  | "playbackStarted"
  | "playbackProgress"
  | "playbackPaused"
  | "normal";

export interface AppState {
  mode: AppMode;
  tracks: Track[];
  currentTrack: number;
}

export type AppAction =
  | { type: 'startRecording'; data: { time: number } }
  | { type: 'recordAudioUnit'; data: { keyCode: KeyType; relativeTime: number } }
  | { type: 'pauseAudioRecording'; data: { time: number } }
  | { type: 'resumeRecording'; data: { time: number } }  
  | { type: 'stopAudioRecording' }
  | { type: 'startPlayback'; data: { trackNumber: number; audioUnitIndex?: number } }
  | { type: 'playbackProgress' }
  | { type: 'pausePlayback' }
  | { type: 'resumePlayback' }
  | { type: 'stopPlayback' }
  | { type: 'playbackCompleted' };   

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "startRecording": {
      const newTrack: Track = { audioUnits: [], playbackUnitIndex: 0 };
      return {
        ...state,
        mode: "recordingStarted",
        tracks: [...state.tracks, newTrack],
        currentTrack: state.tracks.length,
      };
    }

    case "recordAudioUnit": {
      const { currentTrack, tracks } = state;
      const { keyCode, relativeTime } = action.data;
      if (currentTrack < 0 || !tracks[currentTrack]) return state;
      const updatedTrack: Track = {
        ...tracks[currentTrack],
        audioUnits: [
          ...tracks[currentTrack].audioUnits,
          { key: keyCode, relativeTime } as AudioUnit
        ],
      };
      const updatedTracks = tracks.map((t, i) => i === currentTrack ? updatedTrack : t);
      return { ...state, tracks: updatedTracks, mode: "recordingProgress" };
    }

    case "pauseAudioRecording": {
      const { currentTrack, tracks } = state;
      if (currentTrack < 0 || !tracks[currentTrack]) return state;
      const updatedTrack: Track = {
        ...tracks[currentTrack],
        audioUnits: [
          ...tracks[currentTrack].audioUnits,
          { startTime: action.data.time, endTime: 0 } as PauseTime
        ],
      };
      const updatedTracks = tracks.map((t, i) => i === currentTrack ? updatedTrack : t);
      return { ...state, tracks: updatedTracks, mode: "recordingPaused" };
    }

    case "resumeRecording": {
      const { currentTrack, tracks } = state;
      if (currentTrack < 0 || !tracks[currentTrack]) return state;
      const updatedAudioUnits = tracks[currentTrack].audioUnits.map(unit => {
        if ("startTime" in unit && unit.endTime === 0) {
          return { ...unit, endTime: action.data.time };
        }
        return unit;
      });
      const updatedTrack: Track = {
        ...tracks[currentTrack],
        audioUnits: updatedAudioUnits,
      };
      const updatedTracks = tracks.map((t, i) => i === currentTrack ? updatedTrack : t);

      return { ...state, tracks: updatedTracks, mode: "recordingProgress" };
    }

    case "stopAudioRecording": {
      return { ...state, mode: "recordingStopped" };
    }

    case "startPlayback":
      return { ...state, mode: "playbackStarted", currentTrack: action.data.trackNumber };

    case "pausePlayback":
      return { ...state, mode: "playbackPaused" };

    case "resumePlayback":
      return { ...state, mode: "playbackProgress" };

    case "stopPlayback":
    case "playbackCompleted":
      return { ...state, mode: "normal", currentTrack: -1 };

    default:
      return state;
  }
}

