import express from 'express';
import pg from 'pg';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {getMigrations} from 'better-auth/db/migration';
import {fileURLToPath} from 'node:url';
import {createAuth} from './auth.mjs';
import {migrate} from './migrate.mjs';
import {postgresAdapter} from './postgres.mjs';
import {handleApi} from './procurement.mjs';

export function buildServer({pool,auth,origin,environment='production',adminUserId=''}){
 const app=express();const db=postgresAdapter(pool);app.disable('x-powered-by');app.set('trust proxy',1);
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");next();});
 app.all('/api/auth/*splat',toNodeHandler(auth));
 app.use(express.json({limit:'32kb'}));
 app.get('/api/session',async(req,res)=>{try{const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});res.setHeader('Cache-Control','no-store');res.json({signedIn:!!session,user:session?{id:session.user.id,email:session.user.email}:null,environment});}catch{res.status(503).json({error:'Sign-in service unavailable. Try again.'});}});
 app.use('/api',async(req,res)=>{
  try{
   const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
   const identity=session?{userId:session.user.id,email:session.user.email}:null;
   // Request headers from the public internet are never trusted as visitor identity.
   // Administrator access is pinned to the authenticated user's immutable ID, not email.
   const adminEmail=identity&&adminUserId&&identity.userId===adminUserId?identity.email:'';
   const headers=new Headers();for(const key of ['content-type','origin','sec-fetch-site','x-supply-profile'])if(typeof req.headers[key]==='string')headers.set(key,req.headers[key]);
   const request=new Request(new URL(req.originalUrl,origin),{method:req.method,headers,body:['POST','PATCH'].includes(req.method)?JSON.stringify(req.body||{}):undefined});
   const response=await handleApi(request,db,identity,{adminEmail,environment});
   res.status(response.status);for(const[key,value]of response.headers)res.setHeader(key,value);res.send(await response.text());
  }catch{res.status(503).json({error:'Workspace temporarily unavailable. Your saved requests are not removed. Try again.'});}
 });
 app.use(express.static(fileURLToPath(new URL('../dist/',import.meta.url)),{maxAge:'1h',index:false}));
 app.get('/{*path}',(req,res)=>{res.setHeader('Cache-Control','no-store');res.sendFile(fileURLToPath(new URL('../dist/index.html',import.meta.url)));});
 app.use((error,req,res,next)=>{res.status(error.status===413?413:400).json({error:error.status===413?'Request too large':'Invalid request'});});
 return app;
}
export async function start(){
 const origin=process.env.BETTER_AUTH_URL||process.env.RENDER_EXTERNAL_URL;const secret=process.env.BETTER_AUTH_SECRET;const connectionString=process.env.SUPPLY_DATABASE_URL;
 if(!origin||!secret||secret.length<32||!connectionString)throw new Error('Supply requires its own URL, authentication secret and PostgreSQL connection.');
 const pool=new pg.Pool({connectionString,options:'-c search_path=supply_app',max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
 await migrate(pool);const migrationAuth=createAuth(pool,{origin,secret,validateSchema:false});const authMigrations=await getMigrations(migrationAuth.options);await authMigrations.runMigrations();const auth=createAuth(pool,{origin,secret});
 const app=buildServer({pool,auth,origin,environment:process.env.SUPPLY_ENVIRONMENT||'production',adminUserId:process.env.SUPPLY_ADMIN_USER_ID||''});
 const server=app.listen(Number(process.env.PORT||3100),'0.0.0.0',()=>console.log('Revoltz Supply is accepting requests.'));server.requestTimeout=15000;server.headersTimeout=10000;
 process.on('SIGTERM',()=>{server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),25000).unref();});return {server,pool};
}
if(process.argv[1]===fileURLToPath(import.meta.url))start().catch(()=>{console.error('Supply startup failed. Check the isolated database, authentication settings and migration compatibility.');process.exitCode=1;});
