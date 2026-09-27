const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript'), fs = require('fs');
const m = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/account-pricing.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m.exports);
test('agreed connection and age thresholds, including zero-data floor', () => {
  for (const [connections, age, price] of [[0,null,45],[99,12,45],[100,5,45],[100,6,50],[499,12,50],[500,11,50],[500,12,75],[1000,11,50],[1000,12,110],[2000,0,150]]) {
    assert.equal(m.exports.monthlyRentalPrice({connectionCount:connections,accountAgeMonths:age}), price);
  }
});
test('verified and existing Sales Navigator premiums stack', () => {
  assert.equal(m.exports.monthlyRentalPrice({connectionCount:500,accountAgeMonths:12,linkedinVerified:true,hasSalesNav:true}),155);
});
