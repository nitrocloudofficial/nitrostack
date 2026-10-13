export const formatCurrency=(value:number|undefined,currency='GBP')=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(value??0);
export const formatDateTime=(value:string|undefined)=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
export const formatDuration=(hours:number|undefined)=>hours==null?'—':hours<24?`${hours.toFixed(1)} h`:`${(hours/24).toFixed(1)} d`;
export const formatPercentage=(value:number|undefined)=>`${Math.round(value??0)}%`;
export const statusColor=(status:string)=>/critical|failed|down|out of stock|rejected/i.test(status)?'#dc2626':/warning|low|delayed|pending|degrading/i.test(status)?'#d97706':/complete|sent|delivered|available|running|operational|approved/i.test(status)?'#059669':'#64748b';
