import assert from 'node:assert/strict';
import { applyCapturedPayments, resolveCapturedPayment } from '../utils/capturedPayments';
import type { Expense, IncomeEntry, PaymentReview } from '../context/AppContext';
import type { CapturedPayment } from '../utils/paymentModels';
const empty:{expenses:Expense[];incomes:IncomeEntry[];paymentReviews:PaymentReview[];capturedIds:string[];profile:{name:string}}={expenses:[],incomes:[],paymentReviews:[],capturedIds:[],profile:{name:'Existing user'}};
const event:CapturedPayment={id:'upi-1',amount:250.5,kind:'expense',source:'com.phonepe.app',timestamp:new Date('2026-10-07T10:00:00+05:30').getTime(),reference:'123456789012'};
const debit=applyCapturedPayments(empty,[event,event]);
assert.equal(debit.expenses.length,1);assert.equal(debit.expenses[0].amount,250.5);assert.equal(debit.expenses[0].paymentType,'UPI');
assert.equal(debit.profile.name,'Existing user');assert.equal(debit.capturedIds.length,1);
assert.equal(applyCapturedPayments(debit,[event]),debit);
const deleted={...debit,expenses:[]};assert.equal(applyCapturedPayments(deleted,[event]).expenses.length,0);
const income=applyCapturedPayments(debit,[{...event,id:'credit-1',kind:'income'}]);assert.equal(income.incomes.length,1);assert.equal(income.incomes[0].name,'Money received');assert.equal(income.incomes[0].category,'Uncategorized');assert.equal(income.expenses.length,1);
const review=applyCapturedPayments(income,[{...event,id:'ambiguous-1',kind:'review'},{...event,id:'transfer-1',kind:'transfer'}]);assert.equal(review.paymentReviews.length,2);assert.equal(review.incomes.length,1);assert.equal(review.expenses.length,1);
assert.equal(review.paymentReviews[1].status,'review');assert.equal(review.paymentReviews[0].status,'transfer');
assert.equal(applyCapturedPayments(empty,[{...event,amount:NaN},{...event,amount:-1},{...event,amount:0},{...event,timestamp:Infinity}]),empty);
const restored=JSON.parse(JSON.stringify(debit));assert.equal(applyCapturedPayments(restored,[event]).expenses.length,1);
console.log('Payment import checks passed: deduplication, deleted-entry replay, income/expense separation, review/transfer exclusion, invalid input, data preservation and saved-state replay.');

const named={...income,incomes:income.incomes.map(e=>({...e,name:'October salary',category:'Salary'}))};
assert.equal(applyCapturedPayments(named,[{...event,id:'credit-1',kind:'income'}]).incomes[0].name,'October salary');
assert.equal(JSON.parse(JSON.stringify(named)).incomes[0].category,'Salary');

assert.equal(applyCapturedPayments(empty,[{...event,timestamp:1e20}]),empty);

const reviewedDebit=resolveCapturedPayment(review,'ambiguous-1','expense',125.25);
assert.equal(reviewedDebit.paymentReviews.length,1);assert.equal(reviewedDebit.expenses[0].amount,125.25);
assert.equal(reviewedDebit.expenses[0].paymentType,'UPI');assert.equal(reviewedDebit.expenses[0].upiRef,event.reference);
assert.deepEqual(reviewedDebit.capturedIds,review.capturedIds);
assert.equal(resolveCapturedPayment(reviewedDebit,'ambiguous-1','expense'),reviewedDebit);
const reviewedCredit=resolveCapturedPayment(review,'ambiguous-1','income',300,{name:' October salary ',category:'Salary',notes:'Confirmed'});
assert.equal(reviewedCredit.incomes[0].name,'October salary');assert.equal(reviewedCredit.incomes[0].category,'Salary');assert.equal(reviewedCredit.incomes[0].amount,300);
assert.equal(reviewedCredit.incomes[0].notes,'Confirmed');
const ignored=resolveCapturedPayment(review,'transfer-1','ignore');assert.equal(ignored.paymentReviews.length,1);assert.equal(ignored.expenses,review.expenses);assert.equal(ignored.incomes,review.incomes);
assert.equal(applyCapturedPayments(ignored,[{...event,id:'transfer-1',kind:'transfer'}]),ignored);
for(const value of [0,-1,NaN,Infinity,1e13])assert.equal(resolveCapturedPayment(review,'ambiguous-1','expense',value),review);
console.log('Review checks passed: corrected amounts, income naming, UPI/reference preservation, ignored transfers and duplicate resolution.');
