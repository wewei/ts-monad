import { Observable, observable } from "./Observable";

export const fmap =
  <S, T>(f: (src: S) => T) =>
  (obSrc: Observable<S>): Observable<T> =>
    observable((update) => {
      const { state, unobserve } = obSrc.observe((src) => update(() => f(src)));
      return () => ({ state: f(state), unobserve });
    });

export const property = <R>(key: keyof R) => fmap((o: R) => o[key]);

export const propertyOf =
  <R>(ob: Observable<R>) =>
  (key: keyof R) =>
    property(key)(ob);
