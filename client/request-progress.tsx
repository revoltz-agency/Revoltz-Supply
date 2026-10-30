const stages=['Request sent','Compare quotes','Supplier selected','Delivered'];
export default function RequestProgress({status}:{status:string}){
 if(['Cancelled','Expired'].includes(status))return <p className="workflow-closed">Request {status.toLowerCase()}. No further offers can be selected.</p>;
 const current=status==='Completed'?3:status==='Supplier Selected'?2:status==='Quotes Received'?1:0;
 return <ol className="request-progress" aria-label="Sourcing progress">{stages.map((label,index)=><li key={label} className={index<=current?'reached':''} aria-current={index===current?'step':undefined}><span aria-hidden="true">{index<current?'✓':index+1}</span><span>{label}</span></li>)}</ol>;
}
