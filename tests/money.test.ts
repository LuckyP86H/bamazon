import { describe, expect, test } from "bun:test";
import { formatUsd, parseDollarsToCents } from "../src/lib/money";

describe("money", () => {
  test("formats cents as US dollars", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(16999)).toBe("$169.99");
    expect(formatUsd(5)).toBe("$0.05");
  });

  test("parses plain dollar amounts into whole cents", () => {
    expect(parseDollarsToCents("12.5")).toBe(1250);
    expect(parseDollarsToCents("3")).toBe(300);
    expect(parseDollarsToCents(" 0.99 ")).toBe(99);
  });

  test("rejects anything that is not a plain amount", () => {
    for (const bad of ["", "-1", "1.234", "abc", "1,000", "$5"]) {
      expect(parseDollarsToCents(bad)).toBeNull();
    }
  });
});
