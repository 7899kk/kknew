import assert from 'node:assert/strict';
import { validMoney,validDate,monthlyTotals,localDate } from '../utils/financeValidation';
assert(validMoney('250.50'));assert(validMoney('0',true));assert(validMoney('',true,true));
for(const amount of ['','-1','Infinity','NaN','10abc','1e20'])assert(!validMoney(amount));
assert(!validMoney('0'));assert(!validMoney('-1',true));
assert(validDate('2024-02-29'));assert(!validDate('2026-02-29'));assert(!validDate('2026-04-31'));assert(!validDate('2026-13-01'));assert(validDate('',true));
const expenses=[{date:'2026-09-30',amount:900},{date:'2026-10-01',amount:100},{date:'2026-11-01',amount:300}];
assert.deepEqual(monthlyTotals('2026-10',5000,[],expenses),{income:5000,expenses:100});
assert.deepEqual(monthlyTotals('2026-10',5000,[{date:'2026-10-02',amount:4500},{date:'2026-09-01',amount:1000}],expenses),{income:4500,expenses:100});
console.log('Finance checks passed: invalid amounts, real dates, same-month totals and planned-income fallback.');

// Regression: Number accepts these, but parseFloat used by forms saves a different value.
for(const amount of ['1e3','0x10','0b10','1,000','1.234'])assert(!validMoney(amount));
assert(validMoney(' 250.50 '));assert(validMoney('.50'));
const oldTZ=process.env.TZ;process.env.TZ='Asia/Kolkata';
assert.equal(localDate(new Date('2026-10-06T20:00:00Z')),'2026-10-07');
if(oldTZ===undefined)delete process.env.TZ;else process.env.TZ=oldTZ;
