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
import { add, dec, inc } from "./TestHelper";

describe("Observable & Mutable", () => {
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
