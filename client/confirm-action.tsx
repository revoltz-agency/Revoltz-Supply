import {useEffect,useRef} from 'react';
export type Confirmation={title:string;description:string;label:string;destructive?:boolean;run:()=>Promise<void>};
export default function ConfirmAction({action,onClose,onConfirm}:{action:Confirmation|null;onClose:()=>void;onConfirm:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=dialog.current;if(!node)return;if(action&&!node.open)node.showModal();if(!action&&node.open)node.close();},[action]);
 return <dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={onClose} onClose={onClose}>
  <h2 id="confirm-title">{action?.title}</h2><p id="confirm-description">{action?.description}</p><div className="confirm-actions"><button autoFocus type="button" onClick={onClose}>Go back</button><button type="button" className={action?.destructive?'destructive':'primary'} onClick={onConfirm}>{action?.label}</button></div>
 </dialog>;
}
