import {
  bind,
  fmap,
  join,
  lift,
  Mutable,
  mutable,
  property,
  propertyOf,
  pure,
  startWith,
} from "..";

const add = (n: number) => (m: number) => n + m;
const inc = add(1);
const dec = add(-1);

describe("Observable", () => {
  describe("observable & mutable", () => {
    it("should create an observable object", () => {
      const unobserve = jest.fn();
      const counter = mutable(startWith(0, unobserve));

      const cb1 = jest.fn();
      const ob1 = counter.observe(cb1);
      expect(ob1.state).toBe(0);

      counter.update(inc);
      expect(cb1).toBeCalledTimes(1);
      expect(cb1).toBeCalledWith(1);

      ob1.unobserve();
      expect(unobserve).toBeCalledTimes(1);

      const cb2 = jest.fn();
      const ob2 = counter.observe(cb2);
      expect(ob2.state).toBe(1);

      counter.update(inc);
      expect(cb1).toBeCalledTimes(1);
      expect(cb2).toBeCalledTimes(1);
      expect(cb2).toBeCalledWith(2);

      counter.update(add(0));
      expect(cb2).toBeCalledTimes(1);

      ob2.unobserve();
      expect(unobserve).toBeCalledTimes(2);
    });

    it("should be lazy (scenario 1)", () => {
      const unobserve = jest.fn();
      const start = jest.fn(startWith(0, unobserve));
      const counter = mutable(start);

      // Lazy start
      expect(start).not.toBeCalled();

      // Start & unobserve on initial update
      counter.update(inc);
      expect(start).toBeCalledTimes(1);
      expect(unobserve).toBeCalledTimes(1);

      // Always start & unobserve on update with no observer
      counter.update(inc);
      expect(start).toBeCalledTimes(2);
      expect(unobserve).toBeCalledTimes(2);

      // Start on adding the first observer
      const cb = jest.fn();
      const ob1 = counter.observe(cb);
      expect(start).toBeCalledTimes(3);
      expect(unobserve).toBeCalledTimes(2);

      // No more starts on adding more observers
      const ob2 = counter.observe(cb);
      expect(start).toBeCalledTimes(3);
      expect(unobserve).toBeCalledTimes(2);

      // No more starts on updates
      counter.update(inc);
      expect(start).toBeCalledTimes(3);
      expect(unobserve).toBeCalledTimes(2);

      // Cascaded unobserve
      ob1.unobserve();
      ob2.unobserve();
      expect(unobserve).toBeCalledTimes(3);

      // Start & unobserve on update with no observer
      counter.update(inc);
      expect(start).toBeCalledTimes(4);
      expect(unobserve).toBeCalledTimes(4);
    });

    it("should be lazy (scenario 2)", () => {
      const start = jest.fn(startWith(0));
      const counter = mutable(start);

      // Lazy start
      expect(start).not.toBeCalled();

      // Start on adding the first observer
      const cb = jest.fn();
      const ob1 = counter.observe(cb);
      expect(start).toBeCalledTimes(1);

      // No more starts on adding more observers
      const ob2 = counter.observe(cb);
      expect(start).toBeCalledTimes(1);

      ob1.unobserve();
      ob2.unobserve();

      // Start again on adding first observer after unobserve
      const ob3 = counter.observe(cb);
      expect(start).toBeCalledTimes(2);
    });

    it("should allow multiple observation", () => {
      const unobserve = jest.fn();
      const counter = mutable(startWith(0, unobserve));
      const cb = jest.fn();

      const ob1 = counter.observe(cb);
      const ob2 = counter.observe(cb);
      counter.update(inc);
      expect(cb).toBeCalledTimes(2);
      expect(cb).toBeCalledWith(1);

      // No unobserve while there're observers
      ob1.unobserve();
      expect(unobserve).not.toBeCalled();

      // Duplicated unobserve does nothing
      ob1.unobserve();
      expect(unobserve).not.toBeCalled();

      // Unobserve when all observers are removed
      ob2.unobserve();
      expect(unobserve).toBeCalledTimes(1);
    });
  });

  describe("fmap", () => {
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

  describe("join", () => {
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

  describe("pure", () => {
    it("should return a constant observable", () => {
      const value = pure(42);
      const { state } = value.observe(() => {});
      expect(state).toBe(42);
    });
  });

  describe("lift", () => {
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

  describe("bind", () => {
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
      mutM.update((a) => a + 10);
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

  describe("property & propertyOf", () => {
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
