import { fmap, property, propertyOf } from "../Functor";
import { mutable, startWith } from "../Observable";
import { inc } from "./TestHelper";

describe("Functor", () => {
  describe("#fmap", () => {
    it("should work correctly as a Functor map", () => {
      const unobserve = jest.fn();
      const counter = mutable(startWith(0, unobserve));
      const message = fmap((c: number) => `Current count is ${c}`)(counter);
      const cb = jest.fn();

      // Convert the value correctly
      const ob1 = message.observe(cb);
      expect(ob1.state).toBe("Current count is 0");

      // Multiple observation
      const ob2 = message.observe(cb);
      expect(ob2.state).toBe("Current count is 0");

      // Notify on change
      counter.update(inc);
      expect(cb).toBeCalledTimes(2);
      expect(cb).toBeCalledWith("Current count is 1");

      // Duplicated unobserve & cascaded unobserve
      ob1.unobserve();
      ob1.unobserve();
      ob2.unobserve();
      expect(unobserve).toBeCalledTimes(1);
    });
  });

  describe("#property & #propertyOf", () => {
    it("should extract a property of observable object", () => {
      const unobserve = jest.fn();
      const obj = mutable(startWith({ x: 1, y: 5 }, unobserve));
      const x = property<{ x: number }>("x")(obj);
      const y = propertyOf(obj)("y");

      const cbX = jest.fn();
      const obX = x.observe(cbX);

      const cbY = jest.fn();
      const obY = y.observe(cbY);

      expect(obX.state).toBe(1);

      obj.update(({ x, y }) => ({ x, y: y - 1 }));
      expect(cbX).not.toBeCalled();
      expect(cbY).toBeCalledTimes(1);
      expect(cbY).toBeCalledWith(4);

      obj.update(({ x, y }) => ({ x: x + 1, y }));
      expect(cbY).toBeCalledTimes(1);
      expect(cbX).toBeCalledTimes(1);
      expect(cbX).toBeCalledWith(2);

      // Cascaded unobserve
      obX.unobserve();
      obY.unobserve();
      expect(unobserve).toBeCalledTimes(1);
    });
  });
});
