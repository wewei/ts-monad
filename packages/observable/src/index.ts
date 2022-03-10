import { chain } from "./Chain";

export type Handler<S> = (state: S) => void;
export type Transition<S> = (state: S) => S;
export type Observation<S> = { state: S; unobserve: () => void };
export type MutableStart<S> = (previousState?: S) => Observation<S>;
export type ObservableStart<S> = (update: Update<S>) => MutableStart<S>;
export type Observe<S> = (observer: Handler<S>) => Observation<S>;
export type Update<S> = (transition: Transition<S>) => S;
export type Observable<S> = { observe: Observe<S> };
export type Mutable<S> = Observable<S> & { update: Update<S> };
export type ObservableRecord<R> = { [K in keyof R]: Observable<R[K]> };

const noop = () => {};

export const startWith =
  <S>(defaultState: S, unobserve = noop): MutableStart<S> =>
  (previousState) => ({
    state: previousState ?? defaultState,
    unobserve,
  });

export const mutable = <S>(start: MutableStart<S>): Mutable<S> => {
  const observers = chain<Handler<S>>();

  const withOb = (() => {
    let observation: Observation<S>;
    return <T>(cb: (ob: Observation<S>) => [S, T]): T => {
      if (!observation) {
        observation = start();
      } else if (observers.isEmpty()) {
        observation = start(observation.state);
      }

      const { state, unobserve } = observation;
      const [newState, result] = cb({ state, unobserve });
      observation.state = newState;

      if (observers.isEmpty()) {
        unobserve();
      }
      return result;
    };
  })();

  const observe: Observe<S> = (observer) =>
    withOb(({ state, unobserve: unob }) => {
      const remove = observers.add(observer);
      const unobserve = () => remove() && observers.isEmpty() && unob();
      return [state, { state, unobserve }];
    });
  const update: Update<S> = (transition) =>
    withOb(({ state }) => {
      const newState = transition(state);
      if (newState !== state) {
        observers.forEach((cb) => cb(newState));
      }
      return [newState, newState];
    });
  return { observe, update };
};

export const observable = <S>(cb: ObservableStart<S>): Observable<S> => {
  const mut: Mutable<S> = mutable((prev) => cb(mut.update)(prev));
  return { observe: mut.observe };
};

export const fmap =
  <S, T>(f: (src: S) => T) =>
  (ob: Observable<S>): Observable<T> =>
    observable((update) => {
      const { state, unobserve } = ob.observe((src) => update(() => f(src)));
      return () => ({ state: f(state), unobserve });
    });

export const join = <R extends Record<string, any>>(
  record: ObservableRecord<R>
): Observable<R> =>
  observable(
    (update) => () =>
      Object.keys(record).reduce(
        ({ state, unobserve }, key: keyof R) => {
          const ob = record[key].observe((value) =>
            update((rec) => ({ ...rec, [key]: value }))
          );
          state[key] = ob.state;
          return {
            state,
            unobserve: () => {
              ob.unobserve();
              unobserve();
            },
          };
        },
        { state: {}, unobserve: noop } as Observation<R>
      )
  );

export const lift =
  <R, T>(f: (record: R) => T) =>
  (obRec: ObservableRecord<R>) =>
    fmap(f)(join(obRec));

export const property = <R>(key: keyof R) => fmap((o: R) => o[key]);

export const propertyOf =
  <R>(obRec: Observable<R>) =>
  (key: keyof R) =>
    property(key)(obRec);
