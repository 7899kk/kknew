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
export function monthlyTotals(month:string,planned:number,incomes:{date:string;amount:number}[],expenses:{date:string;amount:number}[]) {
  const recorded=incomes.filter(e=>e.date.startsWith(month));
  return {income:recorded.length?recorded.reduce((sum,e)=>sum+e.amount,0):planned,expenses:expenses.filter(e=>e.date.startsWith(month)).reduce((sum,e)=>sum+e.amount,0)};
}
