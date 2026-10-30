export const categories=['Packaging','Cleaning supplies','Dry ingredients','Consumables'];
const id=()=>crypto.randomUUID().replaceAll('-','');
const now=()=>new Date().toISOString();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const validText=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const publicUser=u=>u?{id:u.id,email:u.email,role:u.role,business:u.business,area:u.area,approval:u.approval,isTestProfile:!!u.owner_id}:null;
export async function handleApi(req,db,identity,{adminEmail='',environment='production'}={}){
 const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const q=(sql,...args)=>db.prepare(sql).bind(...args);
 const one=(sql,...args)=>q(sql,...args).first();
 const all=async(sql,...args)=>(await q(sql,...args).all()).results;
 const event=(actor,action,entity)=>q('INSERT INTO supply_audit VALUES(?,?,?,?,?)',id(),actor,action,entity,now());
 try{
  const path=new URL(req.url).pathname.replace(/^\/api/,'');
  if(path==='/health')return reply(200,{product:'Revoltz Supply',environment,database:'PostgreSQL',payments:false});
  if(!identity?.userId||!identity.email)return reply(401,{error:'Sign in to continue'});
  let body={};
  if(['POST','PATCH'].includes(req.method)){
   if(req.headers.get('sec-fetch-site')==='cross-site')fail(403,'Cross-site request blocked');
   const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)fail(403,'Invalid request origin');
   if(!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'JSON required');
   const raw=await req.text();if(raw.length>32768)fail(413,'Request too large');try{body=JSON.parse(raw);}catch{fail(400,'Invalid JSON');}
   if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Invalid request');
  }
  const operator=!!adminEmail&&identity.email.toLowerCase()===adminEmail.toLowerCase();
  let principal=await one('SELECT * FROM supply_users WHERE id=?',identity.userId);
  if(!principal&&operator){await q("INSERT OR IGNORE INTO supply_users(id,email,role,business,area,approval) VALUES(?,?,'admin','Revoltz Operations','Pune','approved')",identity.userId,identity.email).run();principal=await one('SELECT * FROM supply_users WHERE id=?',identity.userId);}
  if(path==='/register'&&req.method==='POST'){
   if(principal)fail(409,'Account already set up');if(!['restaurant','supplier'].includes(body.role)||!validText(body.business,2,100)||!validText(body.area,2,100))fail(400,'Choose account type, business and area');
   await db.batch([q('INSERT INTO supply_users(id,email,role,business,area,approval) VALUES(?,?,?,?,?,?)',identity.userId,identity.email,body.role,body.business.trim(),body.area.trim(),'pending'),event(identity.userId,'account.created',identity.userId)]);
   return reply(201,{ok:true});
  }
  let user=principal;const profile=req.headers.get('x-supply-profile');
  if(profile&&profile!==principal?.id){if(!operator||environment!=='test')fail(403,'Test profiles are disabled');user=await one('SELECT * FROM supply_users WHERE id=? AND owner_id=?',profile,identity.userId);if(!user)fail(404,'Test profile not found');}
  if(path==='/me'&&req.method==='GET')return reply(200,{user:publicUser(user),identity:{email:identity.email},categories,environment,isOperator:operator,testProfiles:operator&&environment==='test'?(await all('SELECT * FROM supply_users WHERE owner_id=?',identity.userId)).map(publicUser):[]});
  if(!user)fail(403,'Set up your business account first');
  if(path==='/test/profiles'&&req.method==='POST'){
   if(!operator||environment!=='test'||profile)fail(403,'Operator test workspace required');
   const existing=await all('SELECT * FROM supply_users WHERE owner_id=?',identity.userId);if(existing.length)return reply(200,{ok:true});
   await db.batch(['restaurant','supplier'].map(role=>q('INSERT INTO supply_users(id,email,owner_id,role,business,area,approval) VALUES(?,?,?,?,?,?,?)',id(),identity.email,identity.userId,role,role==='restaurant'?'TEST — Pune Café':'TEST — Packaging Supplier','Baner, Pune','approved')).concat(event(identity.userId,'test.profiles_created',identity.userId)));
   return reply(201,{ok:true});
  }
  if(path==='/profile'&&req.method==='PATCH'){
   if(!validText(body.business,2,100)||!validText(body.area,2,100))fail(400,'Enter business and area');await db.batch([q('UPDATE supply_users SET business=?,area=? WHERE id=?',body.business.trim(),body.area.trim(),user.id),event(user.id,'profile.updated',user.id)]);return reply(200,{ok:true});
  }
  if(path==='/admin/suppliers'&&req.method==='GET'){
   if(user.role!=='admin'||!operator)fail(403,'Administrator required');return reply(200,{suppliers:(await all("SELECT * FROM supply_users WHERE role='supplier'")).map(publicUser)});
  }
  const supplierMatch=path.match(/^\/admin\/suppliers\/([\w-]+)$/);
  if(supplierMatch&&req.method==='PATCH'){
   if(user.role!=='admin'||!operator)fail(403,'Administrator required');if(!['approved','pending','suspended'].includes(body.approval))fail(400,'Invalid approval status');
   const s=await one("SELECT id FROM supply_users WHERE id=? AND role='supplier'",supplierMatch[1]);if(!s)fail(404,'Supplier not found');await db.batch([q('UPDATE supply_users SET approval=? WHERE id=?',body.approval,s.id),event(user.id,'supplier.'+body.approval,s.id)]);return reply(200,{ok:true});
  }
  if(path==='/rfqs'&&req.method==='GET'){
   const rows=user.role==='admin'&&operator?await all('SELECT * FROM supply_rfqs ORDER BY created DESC LIMIT 200'):user.role==='restaurant'?await all('SELECT * FROM supply_rfqs WHERE restaurant_id=? ORDER BY created DESC LIMIT 200',user.id):user.approval==='approved'?await all('SELECT r.* FROM supply_rfqs r JOIN supply_assignments a ON a.rfq_id=r.id WHERE a.supplier_id=? ORDER BY r.created DESC LIMIT 200',user.id):[];
   return reply(200,{rfqs:rows.map(r=>{const {restaurant_id,...rest}=r;return {...(user.role==='supplier'?rest:r),items:JSON.parse(r.items)};})});
  }
  if(path==='/rfqs'&&req.method==='POST'){
   if(user.role!=='restaurant')fail(403,'Restaurant required');
   if(!validText(body.title,3,100)||!categories.includes(body.category)||!validText(body.area,2,100)||!validDate(body.requiredDate)||body.requiredDate<today())fail(400,'Complete request details and choose a future delivery date');
   if(!Array.isArray(body.items)||body.items.length<1||body.items.length>30||body.items.some(i=>!i||!validText(i.name,2,100)||typeof i.quantity!=='number'||!Number.isFinite(i.quantity)||i.quantity<=0||i.quantity>1000000||!validText(i.unit,1,30)||typeof i.specification!=='string'||i.specification.length>1000))fail(400,'Add valid items, positive quantities, units and specifications');
   const rid=id();await db.batch([q('INSERT INTO supply_rfqs(id,restaurant_id,title,category,items,area,required_date,status,created) VALUES(?,?,?,?,?,?,?,?,?)',rid,user.id,body.title,body.category,JSON.stringify(body.items),body.area,body.requiredDate,'Submitted',now()),event(user.id,'rfq.submitted',rid)]);return reply(201,{id:rid});
  }
  const match=path.match(/^\/rfqs\/([\w-]+)(?:\/(assignments|quotes|select|status))?$/);if(!match)fail(404,'Not found');const [,rid,action]=match;
  const rfq=await one('SELECT * FROM supply_rfqs WHERE id=?',rid);const owner=user.role==='restaurant'&&rfq?.restaurant_id===user.id;const admin=user.role==='admin'&&operator;
  const assigned=user.role==='supplier'&&user.approval==='approved'&&await one('SELECT 1 FROM supply_assignments WHERE rfq_id=? AND supplier_id=?',rid,user.id);
  if(!rfq||!(owner||admin||assigned))fail(404,'Request not found');
  const active=['Submitted','Reviewing','Quotes Requested','Quotes Received'].includes(rfq.status);
  if(!action&&req.method==='GET'){
   const offers=user.role==='supplier'?await all('SELECT * FROM supply_quotes WHERE rfq_id=? AND supplier_id=?',rid,user.id):await all('SELECT q.*,u.business supplier_name,u.approval supplier_approval FROM supply_quotes q JOIN supply_users u ON u.id=q.supplier_id WHERE q.rfq_id=? ORDER BY q.total_paise',rid);
   const selection=await one('SELECT quote_id FROM supply_selections WHERE rfq_id=?',rid);const {restaurant_id,...rest}=rfq;
   return reply(200,{rfq:{...(user.role==='supplier'?rest:rfq),items:JSON.parse(rfq.items)},quotes:offers.map(o=>({...o,lines:JSON.parse(o.lines)})),selectedQuoteId:user.role==='supplier'?offers.find(o=>o.id===selection?.quote_id)?.id:selection?.quote_id});
  }
  if(action==='assignments'&&req.method==='POST'){
   if(!admin)fail(403,'Administrator required');if(!active)fail(409,'Request is closed');if(typeof body.supplierId!=='string')fail(400,'Choose supplier');const s=await one("SELECT * FROM supply_users WHERE id=? AND role='supplier' AND approval='approved'",body.supplierId);if(!s)fail(400,'Choose an approved supplier');
   await db.batch([q("INSERT OR IGNORE INTO supply_assignments SELECT id,?,? FROM supply_rfqs WHERE id=? AND status IN ('Submitted','Reviewing','Quotes Requested','Quotes Received')",s.id,now(),rid),event(user.id,'rfq.assigned',rid),q("UPDATE supply_rfqs SET status='Quotes Requested' WHERE id=? AND status IN ('Submitted','Reviewing')",rid)]);return reply(200,{ok:true});
  }
  if(action==='quotes'&&req.method==='POST'){
   if(!assigned)fail(403,'Assigned approved supplier required');if(!active)fail(409,'Request is closed');const items=JSON.parse(rfq.items);const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
   if(!Array.isArray(body.lines)||body.lines.length!==items.length||body.lines.some((l,i)=>!l||l.itemIndex!==i||!money(l.amountPaise))||!money(body.taxPaise)||!money(body.deliveryPaise)||!validDate(body.validUntil)||body.validUntil<today()||typeof body.notes!=='string'||body.notes.length>2000)fail(400,'Complete every quote line, validity, tax and delivery in integer paise');
   const total=body.lines.reduce((a,l)=>a+l.amountPaise,body.taxPaise+body.deliveryPaise);if(total<=0||total>1000000000)fail(400,'Invalid total');if(await one('SELECT id FROM supply_quotes WHERE rfq_id=? AND supplier_id=?',rid,user.id))fail(409,'An offer already exists');
   const qid=id();const result=await db.batch([q("INSERT INTO supply_quotes SELECT ?,r.id,u.id,?,?,?,?,?,?,? FROM supply_rfqs r JOIN supply_assignments a ON a.rfq_id=r.id JOIN supply_users u ON u.id=a.supplier_id WHERE r.id=? AND u.id=? AND u.approval='approved' AND r.status IN ('Submitted','Reviewing','Quotes Requested','Quotes Received')",qid,JSON.stringify(body.lines.map(l=>({itemIndex:l.itemIndex,amountPaise:l.amountPaise}))),body.taxPaise,body.deliveryPaise,total,body.validUntil,body.notes,now(),rid,user.id),q("INSERT INTO supply_audit SELECT ?,?,?,?,? WHERE changes()=1",id(),user.id,'quote.submitted',qid,now()),q("UPDATE supply_rfqs SET status='Quotes Received' WHERE id=? AND EXISTS(SELECT 1 FROM supply_quotes WHERE id=?) AND status IN ('Submitted','Reviewing','Quotes Requested','Quotes Received')",rid,qid)]);if(!result[0].meta.changes)fail(409,'Request changed. Refresh and try again.');return reply(201,{id:qid,totalPaise:total});
  }
  if(action==='select'&&req.method==='POST'){
   if(!owner)fail(403,'Only the restaurant may select');if(typeof body.quoteId!=='string')fail(400,'Choose offer');const prior=await one('SELECT quote_id FROM supply_selections WHERE rfq_id=?',rid);if(prior){if(prior.quote_id===body.quoteId)return reply(200,{ok:true});fail(409,'A supplier is already selected');}
   const result=await db.batch([q("INSERT OR IGNORE INTO supply_selections SELECT r.id,q.id,? FROM supply_rfqs r JOIN supply_quotes q ON q.rfq_id=r.id JOIN supply_users s ON s.id=q.supplier_id WHERE r.id=? AND q.id=? AND r.restaurant_id=? AND r.status='Quotes Received' AND s.approval='approved' AND q.valid_until>=?",now(),rid,body.quoteId,user.id,today()),q('INSERT INTO supply_audit SELECT ?,?,?,?,? WHERE changes()=1',id(),user.id,'supplier.selected',rid,now()),q("UPDATE supply_rfqs SET status='Supplier Selected' WHERE id=? AND status='Quotes Received' AND EXISTS(SELECT 1 FROM supply_selections WHERE rfq_id=?)",rid,rid)]);if(!result[0].meta.changes)fail(409,'Offer expired, unavailable, or already selected');return reply(200,{ok:true});
  }
  if(action==='status'&&req.method==='PATCH'){
   if(!(owner||admin))fail(403,'Restaurant or admin required');const allowed={Submitted:['Reviewing','Cancelled','Expired'],Reviewing:['Cancelled','Expired'],'Quotes Requested':['Cancelled','Expired'],'Quotes Received':['Cancelled','Expired'],'Supplier Selected':['Completed','Cancelled']};
   if(!allowed[rfq.status]?.includes(body.status))fail(409,'Invalid status transition');if(body.status==='Completed'&&!owner)fail(403,'Restaurant must confirm delivery');if(body.status==='Reviewing'&&!admin)fail(403,'Administrator required');
   const result=await db.batch([q('UPDATE supply_rfqs SET status=? WHERE id=? AND status=?',body.status,rid,rfq.status),q('INSERT INTO supply_audit SELECT ?,?,?,?,? WHERE changes()=1',id(),user.id,'rfq.'+body.status.toLowerCase(),rid,now())]);if(!result[0].meta.changes)fail(409,'Request changed. Refresh.');return reply(200,{ok:true});
  }
  fail(404,'Not found');
 }catch(e){if(e.code==='23505')return reply(409,{error:'This record already exists. Refresh to see the saved version.'});return reply(e.status||500,{error:e.status?e.message:'Unable to complete this action. Please refresh and try again.'});}
}
