// Bounded adapter for the procurement module's prepared-query interface.
// All values remain parameters. Batch writes execute on one PostgreSQL transaction.
export function postgresAdapter(pool){
 function compile(sql,previousChanges=0){
  let out='',quoted=false,n=0;
  for(let i=0;i<sql.length;i++){
   const c=sql[i];
   if(c==="'"){out+=c;if(quoted&&sql[i+1]==="'"){out+=sql[++i];continue;}quoted=!quoted;continue;}
   out+=!quoted&&c==='?'?'$'+(++n):c;
  }
  out=out.replace(/changes\(\)/g,String(previousChanges));
  if(/^INSERT OR IGNORE /i.test(out))out=out.replace(/^INSERT OR IGNORE /i,'INSERT ')+' ON CONFLICT DO NOTHING';
  return out;
 }
 const statement=(sql,args=[])=>({sql,args,bind:(...values)=>statement(sql,values),
  first:async()=>(await pool.query(compile(sql),args)).rows[0]||null,
  all:async()=>({results:(await pool.query(compile(sql),args)).rows}),
  run:async()=>({meta:{changes:(await pool.query(compile(sql),args)).rowCount}})
 });
 return {prepare:statement,batch:async statements=>{
  const client=await pool.connect();
  try{await client.query('BEGIN');const results=[];let changes=0;for(const s of statements){const result=await client.query(compile(s.sql,changes),s.args);changes=result.rowCount||0;results.push({meta:{changes},results:result.rows});}await client.query('COMMIT');return results;}
  catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }};
}
