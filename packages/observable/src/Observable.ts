import { chain } from "./Chain";

export type Handler<S> = (state: S) => void;
export type Transition<S> = (state: S) => S;
export type Observation<S> = { state: S; unobserve: () => void };
export type MutableStart<S> = (previousState?: S) => Observation<S>;
export type Observe<S> = (observer: Handler<S>) => Observation<S>;
export type Update<S> = (transition: Transition<S>) => S;
export type Observable<S> = { observe: Observe<S> };
export type Mutable<S> = Observable<S> & { update: Update<S> };
export type ObservableStart<S> = (update: Update<S>) => MutableStart<S>;

export const noop = () => {};

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
