import { noop, Observable, observable } from "./Observable";

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
