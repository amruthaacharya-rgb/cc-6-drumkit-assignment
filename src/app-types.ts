export type KeyType = 'A' | 'S' | 'D' | 'F' | 'G' | 'H' | 'J' | 'K' | 'L';

export interface AudioUnit {
  key: KeyType;
  relativeTime: number;
}

export interface PauseTime {
  startTime: number;
  endTime: number;
}

export interface Track {
  audioUnits: (AudioUnit | PauseTime)[];
  playbackUnitIndex: number;
}

export interface SavedTrack {
  name: string;
  track: Track;
  duration: string; 
}
