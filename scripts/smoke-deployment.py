"""Exercise only the isolated test deployment; creates labeled test records."""
import json,secrets,urllib.request,urllib.error,http.cookiejar
BASE='https://revoltz-supply-test.onrender.com'
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(opener,path,method='GET',body=None):
    req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),method=method,headers={'Origin':BASE,'Content-Type':'application/json'})
    try:
        with opener.open(req,timeout=35) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:
        return e.code,json.loads(e.read())
def check(condition,label):
    if not condition:raise RuntimeError(label)
    print('PASS '+label,flush=True)
a,b=client(),client()
ident=secrets.token_hex(5)
for ix,opener in enumerate((a,b)):
    status,data=call(opener,'/api/auth/sign-up/email','POST',{'name':'Deployment check','email':f'deploy-{ident}-{ix}@example.invalid','password':secrets.token_urlsafe(30)})
    check(status==200,'HTTPS signup '+str(ix+1))
    status,data=call(opener,'/api/session')
    check(status==200 and data.get('signedIn'),'Authenticated session '+str(ix+1))
    status,data=call(opener,'/api/register','POST',{'role':'restaurant','business':'TEST — Deployment check '+ident+' '+str(ix),'area':'Pune'})
    check(status==201,'Restaurant profile '+str(ix+1))
status,data=call(a,'/api/rfqs','POST',{'title':'TEST — Deployment persistence '+ident,'category':'Packaging','area':'Pune','requiredDate':'2099-12-31','items':[{'name':'Test paper bowls','quantity':10,'unit':'pieces','specification':'Deployment test only'}]})
check(status==201,'Persistent RFQ creation')
rfq=data['id']
status,data=call(a,'/api/rfqs/'+rfq)
check(status==200,'Saved RFQ reload')
status,data=call(b,'/api/rfqs/'+rfq)
check(status==404,'Cross-restaurant access denied')
status,data=call(a,'/api/admin/suppliers')
check(status==403,'Administrator access denied')
status,data=call(a,'/api/auth/sign-out','POST',{})
check(status==200,'Sign out')
status,data=call(a,'/api/me')
check(status==401,'Signed-out workspace denied')
print('Test record label: '+ident)
