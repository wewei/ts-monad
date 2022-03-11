import { bind } from "../Monad";
import { mutable, Mutable, startWith } from "../Observable";
import { add, inc } from "./TestHelper";

describe("Monad", () => {
  describe("#bind", () => {
    it("should work correctly as a Monad Functor bind", () => {
      let mutM: Mutable<number>;
      const unobserveN = jest.fn();
      const mutN = mutable(startWith(1, unobserveN));
      const unobserveM = jest.fn();
      const obM = bind(
        (n: number) => (mutM = mutable(startWith(n * 10, unobserveM)))
      )(mutN);

      const cb = jest.fn();
      const obn = obM.observe(cb);
      expect(obn.state).toBe(10);

      // Inner update
      mutM.update(inc);
      expect(cb).toBeCalledTimes(1);
      expect(cb).toHaveBeenLastCalledWith(11);

      // Outer update
      mutN.update(inc);
      expect(cb).toBeCalledTimes(2);
      expect(cb).toHaveBeenLastCalledWith(20);
      expect(unobserveM).toBeCalledTimes(1);

      // Outer update without value change
      mutM.update(add(10));
      expect(cb).toBeCalledTimes(3);
      expect(cb).toHaveBeenLastCalledWith(30);

      mutN.update(inc);
      expect(cb).toBeCalledTimes(3);
      expect(unobserveM).toBeCalledTimes(2);

      // Cascaded unobserve
      obn.unobserve();
      expect(unobserveM).toBeCalledTimes(3);
      expect(unobserveN).toBeCalledTimes(1);
    });
  });
});
