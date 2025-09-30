import type { AudioUnit, PauseTime, Track, KeyType } from './app-types';

type TimerType = ReturnType<typeof setTimeout>;

/*
function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined;
}
*/
function isPauseTimeUnit(unit: PauseTime | AudioUnit): unit is PauseTime {
  return (unit as PauseTime).startTime !== undefined;
}

export const createPlayer = (
  track: Track,
  playSoundForKey: (key: KeyType) => void
) => {
  const currentTrack = track;
  // Normalise audio units, by updating
  // the relative times of each track
  // by considering intermittent pauses present.
  // also remove the pauses.
  const { units: normalisedUnits } = track?.audioUnits?.reduce(
    (
      accumulated: { units: AudioUnit[]; pauseTimeAccumulated: number },
      currentUnit: AudioUnit | PauseTime,
      index,
      tracks
    ) => {
      if (isPauseTimeUnit(currentUnit)) {
        // skip pause times at the beginning
        if (accumulated.units.length === 0) {
          // no proper audio unit encountered yet.
          return accumulated;
        }
        accumulated.pauseTimeAccumulated += currentUnit.endTime - currentUnit.startTime;
      } else {
        const firstUnitStartTime = accumulated.units[0]?.relativeTime ?? 0;
        let relativeTime = 0;
        relativeTime = currentUnit.relativeTime - accumulated.pauseTimeAccumulated - firstUnitStartTime;
        accumulated.units.push({ ...currentUnit, relativeTime, });
      }
      if (index === tracks.length - 1) {
        accumulated.units[0].relativeTime = 0;
      }
      return accumulated;
    },
    { units: [], pauseTimeAccumulated: 0 }
  ) ?? { units: [] };

  console.log('normalised units: ', normalisedUnits);

  let playbackTimers: TimerType[] = [];
  let currentUnitIndex = 0;

  return {
    play() {
      // build the timers that will ensure playback happens
      // from where we had left.
      playbackTimers.forEach((t) => clearTimeout(t));
      if (currentUnitIndex === normalisedUnits.length) {
        currentUnitIndex = 0; // reset to the beginning.
      }
      playbackTimers = normalisedUnits.reduce(
        (
          accumulated: TimerType[],
          currentUnit: AudioUnit,
          currentIndex: number
        ) => {
          if (currentIndex < currentUnitIndex) {
            return accumulated;
          }
          const timer: TimerType = setTimeout(() => {
            playSoundForKey(currentUnit.key);
            currentUnitIndex += 1;
          }, currentUnit.relativeTime - normalisedUnits[currentUnitIndex].relativeTime);
          accumulated.push(timer);
          return accumulated;
        },
        [] as TimerType[]
      );
    },
    pause() {
      playbackTimers.forEach((t) => clearTimeout(t));
      playbackTimers = [];
    },
  };
};
