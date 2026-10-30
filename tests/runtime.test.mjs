import {test} from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {getMigrations} from 'better-auth/db/migration';
import {createAuth} from '../src/auth.mjs';
import {buildServer} from '../src/server.mjs';
import {migrate} from '../src/migrate.mjs';

test('Render runtime: genuine auth sessions, PostgreSQL persistence and supplier workflow',{timeout:60000},async()=>{
 const data=await PGlite.create();const socket=new PGLiteSocketServer({db:data,host:'127.0.0.1',port:0,maxConnections:5});await socket.start();
 const pool=new pg.Pool({connectionString:`postgresql://postgres:postgres@${socket.getServerConn()}/postgres`,options:'-c search_path=supply_app',max:1});
 let server;
 try{
  await migrate(pool);await migrate(pool);await pool.query('SET search_path TO supply_app');
  const origin='http://localhost:3199';const auth=createAuth(pool,{origin,secret:'test-only-secret-longer-than-thirty-two-characters',secure:false,validateSchema:false});const migrations=await getMigrations(auth.options);await migrations.runMigrations();
  const app=buildServer({pool,auth,origin,environment:'test'});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
  async function call(path,method='GET',body,cookie){const r=await fetch(base+path,{method,headers:{origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
  assert.equal((await call('/api/me')).status,401);
  const signup=async(email)=>call('/api/auth/sign-up/email','POST',{name:'Test operator',email,password:'secure-test-password-123'});
  const first=await signup('restaurant@example.com');assert.equal(first.status,200,JSON.stringify(first.data));assert.ok(first.cookie);
  assert.equal((await call('/api/session','GET',null,first.cookie)).data.signedIn,true);
  assert.equal((await call('/api/register','POST',{role:'restaurant',business:'Test café',area:'Pune'},first.cookie)).status,201);
  const payload={title:'Weekly packaging',category:'Packaging',area:'Pune',requiredDate:'2099-12-31',items:[{name:'Paper bowls',quantity:100,unit:'pieces',specification:'500ml'}]};
  const request=await call('/api/rfqs','POST',payload,first.cookie);assert.equal(request.status,201,JSON.stringify(request.data));
  const second=await signup('other@example.com');await call('/api/register','POST',{role:'restaurant',business:'Other café',area:'Pune'},second.cookie);
  assert.equal((await call('/api/rfqs/'+request.data.id,'GET',null,second.cookie)).status,404);
  const badOrigin=await fetch(base+'/api/rfqs',{method:'POST',headers:{origin:'https://evil.invalid','Content-Type':'application/json',cookie:first.cookie},body:JSON.stringify(payload)});assert.equal(badOrigin.status,403);
  assert.equal((await call('/api/admin/suppliers','GET',null,first.cookie)).status,403);
  const supplier=await signup('supplier@example.com');await call('/api/register','POST',{role:'supplier',business:'Supplier',area:'Pune'},supplier.cookie);
  const supplierId=supplier.data.user.id;await pool.query("UPDATE supply_users SET approval='approved' WHERE id=$1",[supplierId]);await pool.query('INSERT INTO supply_assignments VALUES($1,$2,$3)',[request.data.id,supplierId,new Date().toISOString()]);
  const quote=await call('/api/rfqs/'+request.data.id+'/quotes','POST',{lines:[{itemIndex:0,amountPaise:10000}],taxPaise:1800,deliveryPaise:500,validUntil:'2099-12-31',notes:'Direct fulfilment'},supplier.cookie);assert.equal(quote.status,201,JSON.stringify(quote.data));assert.equal(quote.data.totalPaise,12300);
  assert.equal((await call('/api/rfqs/'+request.data.id+'/select','POST',{quoteId:quote.data.id},first.cookie)).status,200);
  assert.equal((await call('/api/rfqs/'+request.data.id+'/select','POST',{quoteId:quote.data.id},first.cookie)).status,200);
  assert.equal((await pool.query('SELECT count(*)::int n FROM supply_selections')).rows[0].n,1);
  assert.equal((await call('/api/rfqs/'+request.data.id+'/status','PATCH',{status:'Completed'},first.cookie)).status,200);
  assert.equal((await call('/api/auth/sign-out','POST',{},first.cookie)).status,200);
  assert.equal((await call('/api/me','GET',null,first.cookie)).status,401);
  assert.equal((await pool.query('SELECT count(*)::int n FROM supply_rfqs')).rows[0].n,1);
 }finally{if(server)await new Promise(r=>server.close(r));await pool.end();await socket.stop();await data.close();}
});
