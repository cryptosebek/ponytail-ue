#!/usr/bin/env node
// The Unreal benchmark's scorers are the instrument: if one can't tell a good reference edit from a
// bad one, every number it reports is noise. No agent, no API, no engine (UBT builds: --selftest --compile).

const test = require('node:test');
const assert = require('node:assert/strict');
const { TASKS, checkRefs, problems } = require('../benchmarks/run');

for (const id of Object.keys(TASKS)) {
  test(`benchmark ${id}: good ref passes, bad ref and untouched fixture are caught`, () => {
    assert.deepEqual(problems(checkRefs(id)), []);
  });
}
