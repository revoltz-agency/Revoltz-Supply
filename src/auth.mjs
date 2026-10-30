import {betterAuth} from 'better-auth';
export function createAuth(pool,{origin,secret,secure=origin.startsWith('https://'),validateSchema=true}={}){
 return betterAuth({appName:'Revoltz Supply',baseURL:origin,secret,database:pool,
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:false},
  session:{expiresIn:60*60*8,updateAge:60*60},
  rateLimit:{enabled:true,window:60,max:30,storage:'database'},
  advanced:{database:{validateSchema},useSecureCookies:secure,defaultCookieAttributes:{httpOnly:true,sameSite:'lax'}},
  trustedOrigins:[origin],logger:{level:'error'}
 });
}
