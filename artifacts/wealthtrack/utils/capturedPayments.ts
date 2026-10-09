import type { Expense, IncomeEntry, PaymentReview } from '../context/AppContext';
import { sourceNames } from './paymentModels';
import type { PaymentEvent } from './paymentModels';
type PaymentState = { expenses:Expense[]; incomes:IncomeEntry[]; paymentReviews:PaymentReview[]; capturedIds:string[] };
export function applyCapturedPayments<T extends PaymentState>(previous:T, events:PaymentEvent[]):T {
          let next = previous;
          const seen = new Set(previous.capturedIds);
          for (const event of events) {
            if (event.kind === 'reason') {
              if (!event.id || seen.has(event.id) || !event.captureId || typeof event.reason !== 'string') continue;
              const reason=event.reason.trim();
              if (!reason || reason.length>200) continue;
              const expense=next.expenses.find(item=>item.captureId===event.captureId);
              // A reply can arrive before JS imports the debit; retain it for retry.
              if (!expense && !seen.has(event.captureId)) continue;
              seen.add(event.id);
              next={...next,expenses:next.expenses.map(item=>item.captureId===event.captureId?{...item,notes:reason,needsReason:false}:item)};
              continue;
            }
            if (!event.id || seen.has(event.id) || !Number.isFinite(event.amount) || event.amount <= 0 || !Number.isFinite(event.timestamp)) continue;
            const date = new Date(event.timestamp);
            const localDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
            if (!Number.isFinite(date.getTime())) continue;
            seen.add(event.id);
            const source = sourceNames[event.source] || event.source;
            if (event.kind === "expense") {
              next = { ...next, expenses: [{ id: event.id, captureId: event.id, source, date: localDate, time: date.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }), amount: event.amount, category:"Others", paymentType: ["com.phonepe.app", "net.one97.paytm", "com.google.android.apps.nbu.paisa.user", "in.org.npci.upiapp"].includes(event.source) ? "UPI" : "Bank", notes:`Payment notification · ${source}`, upiRef: event.reference || undefined, needsReason:true }, ...next.expenses] };
            } else if (event.kind === "income") {
              next = { ...next, incomes: [{ id:event.id, captureId:event.id, source, date:localDate, amount:event.amount, name:"Money received", category:"Uncategorized", notes:`Credit notification · ${source}` }, ...next.incomes] };
            } else {
              next = { ...next, paymentReviews:[{ ...event, status:event.kind === "transfer" ? "transfer" : "review" }, ...next.paymentReviews] };
            }
          }
          return next === previous ? previous : { ...next, capturedIds:[...seen] };
}

export function resolveCapturedPayment<T extends PaymentState>(previous:T,id:string,kind:'expense'|'income'|'transfer'|'ignore',amount?:number,details?:{name?:string;category?:string;notes?:string}):T {
  const event=previous.paymentReviews.find(item=>item.id===id);
  if(!event) return previous;
  const next={...previous,paymentReviews:previous.paymentReviews.filter(item=>item.id!==id)};
  if(kind==='ignore'||kind==='transfer') return next;
  const value=amount??event.amount;
  if(!Number.isFinite(value)||value<=0||value>1e12||!Number.isFinite(new Date(event.timestamp).getTime())) return previous;
  // Reuse the importer for consistent dates, UPI type and transaction references.
  const imported=applyCapturedPayments({...next,capturedIds:next.capturedIds.filter(item=>item!==id)},[{...event,amount:value,kind}]);
  if(kind==='income') imported.incomes=imported.incomes.map(item=>item.id===id?{...item,name:details?.name?.trim()||'Money received',category:details?.category||'Uncategorized',notes:details?.notes||'Reviewed credit notification'}:item);
  else imported.expenses=imported.expenses.map(item=>item.id===id?{...item,notes:'Reviewed payment notification'}:item);
  return {...imported,capturedIds:previous.capturedIds};
}
