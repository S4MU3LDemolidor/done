import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires fn only once after ms with the last args", () => {
    const fn = vi.fn();
    const deb = debounce(fn, 100);

    deb("a");
    deb("b");
    deb("c");

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("flush fires the pending call immediately", () => {
    const fn = vi.fn();
    const deb = debounce(fn, 200);

    deb("x");
    expect(fn).not.toHaveBeenCalled();
    deb.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("x");

    // Timer should no longer fire
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cancel drops the pending call", () => {
    const fn = vi.fn();
    const deb = debounce(fn, 100);

    deb("y");
    deb.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it("flush with no pending call does nothing", () => {
    const fn = vi.fn();
    const deb = debounce(fn, 100);

    deb.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});
