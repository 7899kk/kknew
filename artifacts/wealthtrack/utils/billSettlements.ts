import type { BillGroup } from '../context/AppContext';
export function calculateSettlements(group:BillGroup):{from:string;to:string;amount:number}[] {
  const members=[...new Set(group.members)];
  const balances=new Map(members.map(name=>[name,0]));
  for(const expense of group.expenses) {
    const participants=[...new Set(expense.splitAmong)];
    const paisa=Math.round(expense.amount*100);
    if(!Number.isSafeInteger(paisa)||paisa<=0||!balances.has(expense.paidBy)||!participants.length||participants.some(name=>!balances.has(name))) continue;
    balances.set(expense.paidBy,balances.get(expense.paidBy)!+paisa);
    const share=Math.floor(paisa/participants.length), remainder=paisa%participants.length;
    participants.forEach((name,index)=>balances.set(name,balances.get(name)!-share-(index<remainder?1:0)));
  }
  const debtors=[...balances].filter(([,value])=>value<0).sort((a,b)=>a[1]-b[1]);
  const creditors=[...balances].filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]);
  const result:{from:string;to:string;amount:number}[]=[];
  let i=0,j=0;
  while(i<debtors.length&&j<creditors.length) {
    const paisa=Math.min(-debtors[i][1],creditors[j][1]);
    result.push({from:debtors[i][0],to:creditors[j][0],amount:paisa/100});
    debtors[i][1]+=paisa;creditors[j][1]-=paisa;
    if(debtors[i][1]===0)i++;if(creditors[j][1]===0)j++;
  }
  return result;
}
