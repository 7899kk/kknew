import assert from 'node:assert/strict';
import { financeSummary, contributeToGoal } from '../artifacts/wealthtrack/utils/financeSummary';
import { applyCapturedPayments, resolveCapturedPayment } from '../artifacts/wealthtrack/utils/capturedPayments';
import { debitReasonDetails, pendingDebitReasons } from '../artifacts/wealthtrack/utils/debitReasons';
import type { UserProfile, Expense, IncomeEntry, AutoExpense, SavingsGoal, PaymentReview } from '../artifacts/wealthtrack/context/AppContext';
import type { CapturedPayment } from '../artifacts/wealthtrack/utils/paymentModels';

// A repeatable, independent integer-paisa oracle, including overspent budgets.
let seed = 20261009;
const random = (max:number) => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed % max; };
const month = '2026-10';
for (let trial = 0; trial < 1000; trial++) {
  const opening = random(10000000), salary = random(10000000), other = random(1000000);
  const profile:UserProfile = {name:'Tester',username:'tester',monthlySalary:salary/100,yearlySalary:salary*12/100,otherIncome:other/100,currentSavings:opening/100,onboardingComplete:true};
  const expenseCents = [random(10000000),random(10000000)];
  const recordedCents = random(2) ? [random(10000000),random(1000000)] : [];
  const expenses:Expense[] = expenseCents.map((amount,i)=>({id:`e${i}`,date:`${month}-08`,category:'Others',paymentType:'Cash',amount:amount/100}));
  expenses.push({id:'old',date:'2026-09-08',category:'Others',paymentType:'Cash',amount:999999});
  const incomes:IncomeEntry[] = recordedCents.map((amount,i)=>({id:`i${i}`,date:`${month}-08`,amount:amount/100}));
  incomes.push({id:'old-income',date:'2026-09-08',amount:999999});
  const reserve = random(500000), bill = random(500000);
  const goals:SavingsGoal[] = [{id:'goal',name:'Dream',targetAmount:20000,savedAmount:reserve/100}];
  const autoExpenses:AutoExpense[] = [{id:'bill',description:'Rent',category:'Rent',paymentType:'Bank',isActive:true,amount:bill/100},{id:'inactive',description:'Inactive',category:'Others',paymentType:'Cash',isActive:false,amount:999999}];
  const state = {profile,expenses,incomes,goals,autoExpenses};
  const actual = financeSummary(state,month);
  const income = salary+other+recordedCents.reduce((a,b)=>a+b,0);
  const spent = expenseCents.reduce((a,b)=>a+b,0);
  const balance = opening+income-spent, available = balance-reserve-bill;
  assert.equal(actual.balance,balance/100,`balance trial ${trial}`);
  assert.equal(actual.availableBalance,available/100,`available trial ${trial}`);
  assert.equal(actual.monthlySurplus,(income-spent-bill)/100);
  assert.deepEqual(financeSummary(JSON.parse(JSON.stringify(state)),month),actual);
  const before = JSON.stringify(state), contribution = random(2000000)+1;
  const next = contributeToGoal(state,'goal',contribution/100,month);
  const accepted = contribution<=Math.max(0,available) && contribution<=2000000-reserve;
  assert.equal(next.goals[0].savedAmount,(reserve+(accepted?contribution:0))/100);
  assert.equal(financeSummary(next,month).balance,balance/100);
  assert.equal(financeSummary(next,month).availableBalance,(available-(accepted?contribution:0))/100);
  assert.equal(JSON.stringify(state),before,'contribution must not mutate previous state');
  assert.equal(contributeToGoal(state,'goal',Math.max(0,available)/100+0.01,month),state);
}

// Batch replay, restart, naming, review and deletion must not duplicate money.
const empty={expenses:[] as Expense[],incomes:[] as IncomeEntry[],paymentReviews:[] as PaymentReview[],capturedIds:[] as string[]};
const timestamp=new Date(2026,9,8,12).getTime();
const events:CapturedPayment[]=Array.from({length:200},(_,i)=>({id:`payment-${i}`,amount:(i+1)/100,kind:i%4===0?'expense':i%4===1?'income':i%4===2?'review':'transfer',source:'com.phonepe.app',timestamp,reference:`ref-${i}`}));
let ledger=applyCapturedPayments(empty,[...events,...events.slice().reverse()]);
assert.equal(ledger.expenses.length,50);
assert.equal(ledger.incomes.length,50);
assert.equal(ledger.paymentReviews.length,100);
assert.equal(ledger.capturedIds.length,200);
assert.equal(pendingDebitReasons(ledger.expenses).length,50);
ledger=JSON.parse(JSON.stringify(ledger));
assert.equal(applyCapturedPayments(ledger,events),ledger);
const totalBefore=ledger.expenses.reduce((sum,e)=>sum+Math.round(e.amount*100),0);
const details=debitReasonDetails(' Groceries ','Food');
assert(details);
ledger={...ledger,expenses:ledger.expenses.map(e=>({...e,...details}))};
assert.equal(pendingDebitReasons(ledger.expenses).length,0);
assert.equal(ledger.expenses.reduce((sum,e)=>sum+Math.round(e.amount*100),0),totalBefore);
ledger=resolveCapturedPayment(ledger,'payment-2','income',125.25,{name:' Salary ',category:'Salary'});
assert.equal(ledger.incomes[0].name,'Salary');
assert.equal(ledger.incomes[0].amount,125.25);
assert.equal(ledger.incomes.length,51);
assert.equal(ledger.paymentReviews.length,99);
assert.equal(resolveCapturedPayment(ledger,'payment-2','income'),ledger);
const deleted={...ledger,expenses:[],incomes:[],paymentReviews:[]};
assert.equal(applyCapturedPayments(deleted,events),deleted);
console.log('Stress checks passed: 1,000 budgets against an independent paisa oracle; 200 payment events with replay, restart, naming, review and deletion.');
