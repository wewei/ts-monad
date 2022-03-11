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
    let obn: Observation<S>;
    return <T>(cb: (ob: Observation<S>) => [S, T]): T => {
      if (!obn) {
        obn = start();
      } else if (observers.isEmpty()) {
        obn = start(obn.state);
      }

      const { state, unobserve } = obn;
      const [newState, result] = cb({ state, unobserve });
      obn.state = newState;

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
  (obSrc: Observable<S>): Observable<T> =>
    observable((update) => {
      const { state, unobserve } = obSrc.observe((src) => update(() => f(src)));
      return () => ({ state: f(state), unobserve });
    });

export const join = <R extends Record<string, any>>(
  obr: ObservableRecord<R>
): Observable<R> =>
  observable(
    (update) => () =>
      Object.keys(obr).reduce(
        ({ state, unobserve }, key: keyof R) => {
          const ob = obr[key].observe((value) =>
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

export const pure = <S>(state: S): Observable<S> =>
  observable(() => () => ({ state, unobserve: noop }));

export const lift =
  <R, T>(f: (rec: R) => T) =>
  (obr: ObservableRecord<R>) =>
    fmap(f)(join(obr));

export const bind =
  <S, T>(f: (src: S) => Observable<T>) =>
  (obSrc: Observable<S>): Observable<T> =>
    observable((update) => (prevState) => {
      let unobserveTar = noop;
      const setSrc = (src: S) => {
        const obnTar = f(src).observe((tar) => update(() => tar));
        unobserveTar();
        unobserveTar = obnTar.unobserve;
        return obnTar.state;
      };
      const obnSrc = obSrc.observe((src) => update(() => setSrc(src)));
      const state = setSrc(obnSrc.state);
      return {
        state,
        unobserve: () => {
          unobserveTar();
          obnSrc.unobserve();
        },
      };
    });

export const property = <R>(key: keyof R) => fmap((o: R) => o[key]);

export const propertyOf =
  <R>(ob: Observable<R>) =>
  (key: keyof R) =>
    property(key)(ob);
