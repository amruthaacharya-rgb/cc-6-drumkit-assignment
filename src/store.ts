export type StateUpdateCallback<S> = (state: S) => void;

export function createStore<S, A>(initialState: S, reducer: (state: S, action: A) => S) {
  let state = initialState;
  const subscribers: StateUpdateCallback<S>[] = [];

  return {
    getState: () => state,

    dispatch(action: A) {
      state = reducer(state, action);
      subscribers.forEach((cb) => cb(state));
    },

    subscribe(callback: StateUpdateCallback<S>) {
      subscribers.push(callback);
      return () => {
        const i = subscribers.indexOf(callback);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },
    
  };
}


 