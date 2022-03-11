import { join, lift, pure } from "../Applicative";
import { mutable, startWith } from "../Observable";
import { dec, inc } from "./TestHelper";

describe("Applicative", () => {
  describe("#join", () => {
    it("should join multiple observables", () => {
      const unobserveX = jest.fn();
      const x = mutable(startWith(1, unobserveX));
      const unobserveY = jest.fn();
      const y = mutable(startWith(5, unobserveY));

      const joined = join({ x, y });
      const cb = jest.fn();
      const ob = joined.observe(cb);

      // Get the joined state
      expect(ob.state).toEqual({ x: 1, y: 5 });

      // Notify about changes on each field
      x.update(inc);
      expect(cb).toBeCalledTimes(1);
      expect(cb).toBeCalledWith({ x: 2, y: 5 });

      y.update(dec);
      expect(cb).toBeCalledTimes(2);
      expect(cb).toBeCalledWith({ x: 2, y: 4 });

      // Unobserve all joined obervers
      ob.unobserve();
      expect(unobserveX).toBeCalledTimes(1);
      expect(unobserveY).toBeCalledTimes(1);
    });
  });

  describe("#pure", () => {
    it("should return a constant observable", () => {
      const value = pure(42);
      const { state } = value.observe(() => {});
      expect(state).toBe(42);
    });
  });

  describe("#lift", () => {
    it("should work correctly as an Applicative Functor lift", () => {
      const unobserveX = jest.fn();
      const x = mutable(startWith(1, unobserveX));
      const unobserveY = jest.fn();
      const y = mutable(startWith(5, unobserveY));

      const prodXY = ({ x, y }: { x: number; y: number }) => x * y;
      const prod = lift(prodXY)({ x, y });

      const cb = jest.fn();
      const ob = prod.observe(cb);

      // Do the initial calculation
      expect(ob.state).toEqual(5);

      // Notify about changes on each field
      x.update(inc);
      expect(cb).toBeCalledTimes(1);
      expect(cb).toBeCalledWith(10);

      y.update(dec);
      expect(cb).toBeCalledTimes(2);
      expect(cb).toBeCalledWith(8);

      // Unobserve all joined obervers
      ob.unobserve();
      expect(unobserveX).toBeCalledTimes(1);
      expect(unobserveY).toBeCalledTimes(1);
    });
  });
});
