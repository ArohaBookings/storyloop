import assert from "node:assert/strict";
import test from "node:test";
import { suggestEmailFix } from "../lib/email-typo";

test("common domain typos get a suggestion, keeping the person's own part", () => {
  assert.equal(suggestEmailFix("jane@gmial.com"), "jane@gmail.com");
  assert.equal(suggestEmailFix("Jane.Smith@gmail.con"), "Jane.Smith@gmail.com");
  assert.equal(suggestEmailFix("kiri@hotmial.com"), "kiri@hotmail.com");
  assert.equal(suggestEmailFix("aroha@xtra.co.nx"), "aroha@xtra.co.nz");
  assert.equal(suggestEmailFix("sam@bigpond.con"), "sam@bigpond.com");
  assert.equal(suggestEmailFix("mere@outlok.com"), "mere@outlook.com");
});

test("correct addresses, centre domains and half-typed input get no suggestion", () => {
  assert.equal(suggestEmailFix("jane@gmail.com"), null);
  assert.equal(suggestEmailFix("manager@kidsfirst.co.nz"), null);
  assert.equal(suggestEmailFix("office@mychildcare.com.au"), null);
  assert.equal(suggestEmailFix("jane@"), null);
  assert.equal(suggestEmailFix("jane"), null);
  assert.equal(suggestEmailFix(""), null);
});
