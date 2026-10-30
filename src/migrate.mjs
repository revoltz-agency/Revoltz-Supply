import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function migrate(pool){
 const sql=await readFile(new URL('../migrations/001_supply.sql',import.meta.url),'utf8');const hash=createHash('sha256').update(sql).digest('hex');const client=await pool.connect();
 try{await client.query('BEGIN');const schema=await client.query("SELECT 1 FROM pg_namespace WHERE nspname='supply_app'");if(!schema.rowCount){await client.query('CREATE SCHEMA supply_app');await client.query('REVOKE ALL ON SCHEMA supply_app FROM PUBLIC');}await client.query('SET LOCAL search_path TO supply_app');await client.query("SELECT pg_advisory_xact_lock(736812902)");await client.query('CREATE TABLE IF NOT EXISTS supply_migrations(version integer PRIMARY KEY,checksum text NOT NULL)');const prior=await client.query('SELECT checksum FROM supply_migrations WHERE version=1');if(prior.rows.length){if(prior.rows[0].checksum!==hash)throw new Error('Supply migration checksum mismatch');}else{await client.query(sql);await client.query('INSERT INTO supply_migrations VALUES(1,$1)',[hash]);}await client.query('COMMIT');}
 catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
