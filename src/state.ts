import { Track, type KeyType, type PauseTime } from './app-types';

export type AppMode =
  | 'recordingStarted'
  | 'recordingProgress'
  | 'recordingPaused'
  | 'playbackStarted'
  | 'playbackProgress'
  | 'playbackPaused'
  | 'normal';
/**
 * App state that will hold the mode the app is in
 * maintains the current recording and playback if happening.
 */
export interface AppState {
  mode: AppMode;
  tracks: Track[]; // we might want to have multiple recordings.
  currentTrack: number;
}

export type AppAction =
  | {
      type: 'startRecording';
      data: {
        time: number;
      };
    }
  | {
      type: 'recordNote';
      data: {
        keyCode: KeyType;
        relativeTime: number;
      };
    }
  | {
      type: 'pauseAudioRecording';
      data: {
        time: number;
      };
    }
  | {
      type: 'stopAudioRecording';
    }
  | {
      type: 'startPlayback';
      data: {
        trackNumber: number;
        audioUnitIndex?: number;
      };
    }
  | {
      type: 'playBackProgress';
    }
  | {
      type: 'pausePlayback';
    }
  | {
      type: 'playbackCompleted';
    };

export type StateUpdateCallback = (state: AppState) => void;

export function createStore(
  initialState: AppState,
  reducer: (state: AppState, action: AppAction) => AppState
) {
  let state = initialState;
  const callbacks: StateUpdateCallback[] = [];
  return {
    getState() {
      return state;
    },
    dispatch(action: AppAction) {
      const prevState = state;
      state = reducer(state, action);

      console.log('----');
      console.log(prevState);
      console.log(state);
      console.log('----');

      // Notify all callbacks on new state updates
      callbacks.forEach((callback) => callback(state));
    },
    subscribe(updateCallBack: (state: AppState) => void) {
      callbacks.push(updateCallBack);
    },
  };
}

export function appReducer(state: AppState, action: AppAction) {
  switch (action.type) {
    case 'startRecording': {
      let newState = { ...state };
      if (newState.mode === 'recordingPaused') {
        newState.mode = 'recordingProgress';
        let audioUnits = newState.tracks[newState.tracks.length - 1].audioUnits;
        // add a pause time unit
        audioUnits = [...audioUnits];
        const lastUnit = audioUnits[audioUnits.length - 1];
        if (lastUnit) {
          (lastUnit as PauseTime).endTime = action.data.time;
        }
        newState.tracks[newState.tracks.length - 1].audioUnits = audioUnits;
      } else {
        newState.mode = 'recordingProgress';
        newState.tracks = [...state.tracks];
        newState.tracks.push({
          audioUnits: [],
          playbackUnitIndex: 0,
        });
      }
      return newState;
    }
    case 'recordNote': {
      let newState = { ...state };
      const tracks = [...newState.tracks];
      newState.tracks = tracks;
      const track = { ...tracks[tracks.length - 1] };
      track.audioUnits = [
        ...track.audioUnits,
        {
          key: action.data.keyCode as KeyType,
          relativeTime: action.data.relativeTime,
        },
      ];

      newState.tracks[newState.tracks.length - 1] = track;

      return newState;
    }
    case 'pauseAudioRecording': {
      let newState = { ...state };
      newState.mode = 'recordingPaused';
      let audioUnits = newState.tracks[newState.tracks.length - 1].audioUnits;
      // add a pause time unit
      audioUnits = [...audioUnits, { startTime: action.data.time, endTime: 0 }];
      newState.tracks[newState.tracks.length - 1].audioUnits = audioUnits;
      return newState;
    }
    case 'stopAudioRecording': {
      let newState = { ...state };
      newState.mode = 'normal';
      return newState;
    }
    case 'startPlayback': {
      let newState = { ...state };
      newState.currentTrack = 0;
      newState.mode = 'playbackStarted';
      return newState;
    }
    case 'playBackProgress': {
      let newState = { ...state };
      newState.currentTrack = 0;
      newState.mode = 'playbackProgress';
      return newState;
    }
    case 'pausePlayback': {
      let newState = { ...state };
      newState.mode = 'playbackPaused';
      return newState;
    }

    case 'playbackCompleted': {
      let newState = { ...state };
      newState.mode = 'normal';
      return newState;
    }

    default:
      return state;
  }
}
