"""Release-only GitHub API helper; credentials remain in the CI environment."""
import hashlib,json,os,urllib.request,urllib.parse
REPO='D2Plus-D2R/D2PLUS-Launcher';BASE='https://api.github.com/repos/'+REPO
class SafeRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  result=super().redirect_request(req,fp,code,msg,headers,newurl)
  if result and urllib.parse.urlparse(newurl).hostname!='api.github.com':result.remove_header('Authorization')
  return result
opener=urllib.request.build_opener(SafeRedirect())
def request(url,method='GET',data=None,accept='application/vnd.github+json',ctype='application/json'):
 assert urllib.parse.urlparse(url).hostname in ['api.github.com','uploads.github.com']
 return opener.open(urllib.request.Request(url,data=data,method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':accept,'Content-Type':ctype,'User-Agent':'D2PLUS-v12-release'}),timeout=600)
def api(url,method='GET',data=None):
 with request(url,method,None if data is None else json.dumps(data).encode()) as r:return json.load(r)
def release():
 matches=[r for r in api(BASE+'/releases?per_page=100') if (r['tag_name']=='v1.2-alpha' or r.get('name')=='D2PLUS Alpha V1.2')];assert len(matches)==1
 return matches[0]
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def download(asset,target,expected):
 if target.exists():assert digest(target)==expected;return
 assert asset['state']=='uploaded' and asset.get('digest')=='sha256:'+expected
 target.parent.mkdir(parents=True,exist_ok=True)
 with request(asset['url'],accept='application/octet-stream') as response,target.open('wb') as out:
  while block:=response.read(1024*1024):out.write(block)
 assert digest(target)==expected
