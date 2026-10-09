export function validMoney(value:string,allowZero=false,optional=false):boolean {
  if(!value.trim()) return optional;
  if(!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value.trim())) return false;
  const amount=Number(value);
  return Number.isFinite(amount) && amount<=1e12 && (allowZero?amount>=0:amount>0);
}
export function validDate(value:string,optional=false):boolean {
  if(!value) return optional;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split('-').map(Number);const date=new Date(y,m-1,d);
  return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d;
}
export function localDate(date=new Date()):string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function monthlyTotals(month:string,planned:number,incomes:{date:string;amount:number;category?:string}[],expenses:{date:string;amount:number}[],plannedSalary=planned) {
  const recorded=incomes.filter(e=>e.date.startsWith(month));
  const cents=(value:number)=>Math.round(value*100);
  const received=recorded.reduce((sum,e)=>sum+cents(e.amount),0);
  const salary=recorded.filter(e=>e.category?.trim().toLowerCase()==='salary').reduce((sum,e)=>sum+cents(e.amount),0);
  // Extra credits increase the budget. Explicit salary entries replace only the
  // matching salary estimate, including instalments or salary above the estimate.
  return {income:(cents(planned)+received-Math.min(cents(plannedSalary),salary))/100,expenses:expenses.filter(e=>e.date.startsWith(month)).reduce((sum,e)=>sum+cents(e.amount),0)/100};
}
