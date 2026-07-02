import assert from "node:assert/strict";
import test from "node:test";

import { decodeCtc } from "../extension/ctc.js";

function logits(indices, classCount) {
  const values = new Float32Array(indices.length * classCount).fill(-10);
  indices.forEach((index, step) => {
    values[step * classCount + index] = 10;
  });
  return values;
}

test("decodes sequence-first CTC output", () => {
  const charset = ["", "a", "b", "3"];
  const indices = [0, 1, 1, 0, 2, 3, 3];
  assert.equal(
    decodeCtc(logits(indices, charset.length), [indices.length, 1, 4], charset),
    "ab3"
  );
});

test("decodes batch-first CTC output", () => {
  const charset = ["", "x", "7"];
  const indices = [1, 0, 1, 2];
  assert.equal(
    decodeCtc(logits(indices, charset.length), [1, indices.length, 3], charset),
    "xx7"
  );
});

test("rejects a mismatched charset", () => {
  assert.throws(
    () => decodeCtc(new Float32Array(6), [2, 1, 3], ["", "a"]),
    /modelCharsetMismatch/
  );
});
