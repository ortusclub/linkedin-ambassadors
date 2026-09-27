const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
const m={exports:{}};new Function('require','exports','module',ts.transpileModule(fs.readFileSync('src/lib/application-ownership.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(require,m.exports,m);
const where=m.exports.submittedApplicationsWhere({id:'sam',email:'sam@example.test'});
function matches(app){return where.OR.some(clause=>Object.entries(clause).every(([key,value])=>typeof value==='object'&&value!==null?app[key].toLowerCase()===value.equals.toLowerCase():app[key]===value))}
test('logged-in submitter sees an application with a different contact email',()=>assert.equal(matches({submittedByUserId:'sam',email:'owner@example.test'}),true));
test('legacy anonymous applications use case-insensitive contact email',()=>assert.equal(matches({submittedByUserId:null,email:'SAM@example.test'}),true));
test('explicit attribution prevents another login claiming a submission by email',()=>assert.equal(matches({submittedByUserId:'other-user',email:'sam@example.test'}),false));
test('unrelated anonymous applications stay private',()=>assert.equal(matches({submittedByUserId:null,email:'other@example.test'}),false));
