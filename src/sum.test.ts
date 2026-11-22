import { expect, test } from "bun:test";
import { sum } from "./sum";

test("sum adds", () => {
  expect(sum(2, 3)).toBe(5);
});

test("sum zero", () => {
  expect(sum(0, 0)).toBe(0);
});
