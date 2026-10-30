package com.swinglab.mobile;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.RSAPublicKeySpec;
import java.math.BigInteger;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Public OAuth client. HTTPS inference happens natively; credentials never enter WebView JS. */
public final class NativeAgent {
 private static final String AUTH="https://auth.openai.com", API="https://api.openai.com/v1", SCOPE="openid profile email offline_access resource.invoke chatgpt.tokens.use.direct", KEY="swinglab.oauth.v1";
 private final Activity activity;private final WebView web;private final SharedPreferences prefs;private final ExecutorService work=Executors.newCachedThreadPool();
 private final Object lock=new Object();private final AtomicBoolean busy=new AtomicBoolean(false);private final SecureRandom random=new SecureRandom();
 private JSONObject session,discovery;private JSONArray models=new JSONArray(),ledger=new JSONArray();private ServerSocket listener;private volatile boolean destroyed=false;private final String hostId;private int attempts=0;
 NativeAgent(Activity a,WebView w){activity=a;web=w;prefs=a.getSharedPreferences("swinglab-native",0);String id=prefs.getString("host_id",null);if(id==null){id="urn:uuid:"+UUID.randomUUID();prefs.edit().putString("host_id",id).apply();}hostId=id;try{session=loadSession();}catch(Exception ignored){session=null;}}
 @JavascriptInterface public void call(String action,String json,String requestId){
  if(destroyed||requestId==null||!requestId.matches("[A-Za-z0-9_-]{1,100}"))return;
  if(json==null||json.length()>20*1024*1024){respond(requestId,false,error("Request too large."));return;}
  work.execute(()->{try{JSONObject p=new JSONObject(json);JSONObject result;
   switch(action){
    case "status":result=status();break;
    case "shareResult":((MainActivity)activity).shareResult(p.getString("contents"));result=new JSONObject().put("message","Choose where to share the result JSON.");break;
    case "connect":result=connect();break;
    case "models":result=modelList();break;
    case "review":result=infer(p,false);break;
    case "test":result=infer(p,true);break;
    case "disconnect":result=disconnect();break;
    default:throw new Exception("Unknown native operation.");
   }respond(requestId,true,result);
  }catch(Exception e){respond(requestId,false,error(safeError(e)));}});
 }
 private JSONObject error(String text){JSONObject o=new JSONObject();try{o.put("error",text);}catch(Exception ignored){}return o;}
 private String safeError(Exception e){if(e instanceof TrialException)return e.getMessage();if(e instanceof java.net.SocketTimeoutException)return "The request timed out. If inference was sent it may have consumed usage; it was not retried.";return "Native request could not complete. No automatic retry or payment fallback was used.";}
 private static class TrialException extends Exception{TrialException(String s){super(s);}}
 private void respond(String id,boolean ok,JSONObject data){JSONObject event=new JSONObject();try{event.put("id",id);event.put("ok",ok);event.put("data",data);}catch(Exception ignored){}emit("swinglab:native-reply",event);}
 private void emit(String name,JSONObject data){if(destroyed)return;activity.runOnUiThread(()->{if(!destroyed)web.evaluateJavascript("window.dispatchEvent(new CustomEvent("+JSONObject.quote(name)+",{detail:"+data.toString()+"}));",null);});}
 void notice(String message){emit("swinglab:native-notice",error(message));}
 private String tokenString(int bytes){byte[] b=new byte[bytes];random.nextBytes(b);return url64(b);}
 private static String url64(byte[] b){return Base64.encodeToString(b,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);}
 private static byte[] un64(String s){return Base64.decode(s,Base64.URL_SAFE|Base64.NO_WRAP);}
 private JSONObject discover()throws Exception{if(discovery==null){JSONObject d=get(AUTH+"/.well-known/openid-configuration",null);if(!AUTH.equals(d.optString("issuer"))||!d.optString("jwks_uri").startsWith(AUTH+"/"))throw new TrialException("Unexpected OpenAI identity metadata.");discovery=d;}return discovery;}
 private HttpsURLConnection open(String target,String token)throws Exception{if(!(target.startsWith(AUTH+"/")||target.startsWith(API+"/")))throw new TrialException("Remote destination rejected.");HttpsURLConnection c=(HttpsURLConnection)new URL(target).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(20000);c.setReadTimeout(180000);c.setRequestProperty("User-Agent","SwingLabAndroidTrial/0.1");if(token!=null)c.setRequestProperty("Authorization","Bearer "+token);return c;}
 private String read(InputStream input,int maximum)throws Exception{if(input==null)return "";try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>maximum)throw new TrialException("Response exceeded the local size limit.");out.write(b,0,n);}return out.toString("UTF-8");}}
 private void check(HttpsURLConnection c)throws Exception{int status=c.getResponseCode();if(status>=200&&status<300)return;String code="http_"+status;try{JSONObject e=new JSONObject(read(c.getErrorStream(),65536));Object raw=e.opt("error");if(raw instanceof JSONObject)code=((JSONObject)raw).optString("code",code);else if(raw instanceof String)code=(String)raw;}catch(Exception ignored){}if(!code.matches("[A-Za-z0-9_.-]{1,100}"))code="http_"+status;
  if(code.equals("subscription_sharing_user_not_eligible"))throw new TrialException("This account, workspace or client is not eligible. Do not upgrade your plan to troubleshoot this automatically.");
  if(code.equals("subscription_sharing_usage_limit_exceeded"))throw new TrialException("Usage limit reached. Open ChatGPT Settings > Usage. No request was retried.");
  throw new TrialException("OpenAI rejected the request ("+code+"). No automatic retry was made.");
 }
 private JSONObject get(String target,String token)throws Exception{HttpsURLConnection c=open(target,token);try{check(c);return new JSONObject(read(c.getInputStream(),4000000));}finally{c.disconnect();}}
 private String form(Map<String,String> p)throws Exception{StringBuilder b=new StringBuilder();for(Map.Entry<String,String> e:p.entrySet()){if(b.length()>0)b.append('&');b.append(URLEncoder.encode(e.getKey(),"UTF-8")).append('=').append(URLEncoder.encode(e.getValue(),"UTF-8"));}return b.toString();}
 private JSONObject postForm(String target,Map<String,String> p)throws Exception{HttpsURLConnection c=open(target,null);try{c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/x-www-form-urlencoded");try(OutputStream out=c.getOutputStream()){out.write(form(p).getBytes(StandardCharsets.UTF_8));}check(c);String body=read(c.getInputStream(),4000000);return body.isEmpty()?new JSONObject():new JSONObject(body);}finally{c.disconnect();}}
 private JSONObject status()throws Exception{synchronized(lock){JSONObject r=new JSONObject();r.put("connected",session!=null);r.put("enabled",session!=null&&hasScope(session.optString("scope"),"chatgpt.tokens.use.direct"));r.put("account",session==null?JSONObject.NULL:session.optString("email","Connected account"));r.put("ledger",new JSONArray(ledger.toString()));r.put("remaining_attempts",Math.max(0,3-attempts));return r;}}
 private boolean hasScope(String scopes,String expected){return Arrays.asList(scopes.split(" ")).contains(expected);}
 private JSONObject connect()throws Exception{
  if(busy.get())throw new TrialException("Wait for the current inference before connecting.");
  final String state=tokenString(32),nonce=tokenString(32),verifier=tokenString(48),challenge=url64(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
  final String existing=prefs.getString("client_id",null),expectedSubject=prefs.getString("subject",null);
  if(listener!=null)try{listener.close();}catch(Exception ignored){}
  final ServerSocket server=new ServerSocket(0,2,InetAddress.getByName("127.0.0.1"));server.setSoTimeout(180000);listener=server;
  final String redirect="http://127.0.0.1:"+server.getLocalPort()+"/auth/callback";
  Map<String,String> p=new LinkedHashMap<>();p.put("client_id",existing==null?"dynamic_agent_client":existing);if(existing==null)p.put("agent_name_hint","SwingLab Android Trial");p.put("ext_agent_host_id",hostId);p.put("response_type","code");p.put("redirect_uri",redirect);p.put("scope",SCOPE);p.put("resource",API);p.put("state",state);p.put("nonce",nonce);p.put("code_challenge_method","S256");p.put("code_challenge",challenge);
  String address=AUTH+"/api/accounts/authorize?"+form(p);
  work.execute(()->{try{
   long end=System.currentTimeMillis()+180000;boolean completed=false;
   while(!completed&&System.currentTimeMillis()<end){try(Socket socket=server.accept()){
    socket.setSoTimeout(5000);BufferedReader input=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.US_ASCII));String line=input.readLine();if(line==null||line.length()>16384)continue;
    String[] parts=line.split(" ");Uri uri=parts.length>1?Uri.parse("http://127.0.0.1"+parts[1]):Uri.EMPTY;
    boolean valid=parts.length>1&&parts[0].equals("GET")&&"/auth/callback".equals(uri.getPath())&&MessageDigest.isEqual(state.getBytes(StandardCharsets.US_ASCII),uri.getQueryParameter("state")==null?new byte[0]:uri.getQueryParameter("state").getBytes(StandardCharsets.US_ASCII));
    String message=valid?"Return to SwingLab. The app is validating the connection.":"Invalid callback.";byte[] body=message.getBytes(StandardCharsets.UTF_8);OutputStream out=socket.getOutputStream();out.write(("HTTP/1.1 "+(valid?"200 OK":"400 Bad Request")+"\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: "+body.length+"\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));out.write(body);out.flush();
    if(!valid)continue;completed=true;
    if(uri.getQueryParameter("error")!=null)throw new TrialException("Connection was not authorized.");
    String client=uri.getQueryParameter("client_id");if(client==null)client=existing;
    if(client==null||client.equals("dynamic_agent_client")||(existing!=null&&!existing.equals(client)))throw new TrialException("Incomplete or mismatched client registration.");
    prefs.edit().putString("client_id",client).apply();
    String code=uri.getQueryParameter("code");if(code==null)throw new TrialException("No authorization code was returned.");
    Map<String,String> tokenRequest=new LinkedHashMap<>();tokenRequest.put("grant_type","authorization_code");tokenRequest.put("client_id",client);tokenRequest.put("code",code);tokenRequest.put("code_verifier",verifier);tokenRequest.put("redirect_uri",redirect);tokenRequest.put("resource",API);
    JSONObject tokens=postForm(AUTH+"/api/accounts/oauth/token",tokenRequest);JSONObject identity=validateIdentity(tokens.optString("id_token"),client,nonce);
    if(expectedSubject!=null&&!expectedSubject.equals(identity.optString("sub")))throw new TrialException("This account differs from the registered account. Reinstall the experimental app to start an independent registration.");
    if(!"Bearer".equalsIgnoreCase(tokens.optString("token_type"))||tokens.optString("access_token").isEmpty())throw new TrialException("No valid Bearer credential was received.");
    tokens.put("client_id",client);tokens.put("email",identity.optString("email","Connected account"));tokens.put("expires_at",System.currentTimeMillis()+tokens.optLong("expires_in",0)*1000);
    synchronized(lock){session=tokens;saveSession();prefs.edit().putString("subject",identity.optString("sub")).apply();}
    emit("swinglab:native-connected",status());
   }}
  }catch(Exception error){notice(safeError(error));}finally{try{server.close();}catch(Exception ignored){}}});
  activity.runOnUiThread(()->activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(address))));return new JSONObject().put("message","Complete authorization in your browser, then return to SwingLab.");
 }
 private JSONObject validateIdentity(String token,String client,String nonce)throws Exception{
  try{String[] p=token.split("\\.");if(p.length!=3)throw new Exception();JSONObject head=new JSONObject(new String(un64(p[0]),StandardCharsets.UTF_8)),claims=new JSONObject(new String(un64(p[1]),StandardCharsets.UTF_8));if(!"RS256".equals(head.optString("alg")))throw new Exception();JSONObject d=discover();JSONArray keys=get(d.getString("jwks_uri"),null).getJSONArray("keys");JSONObject key=null;for(int i=0;i<keys.length();i++){JSONObject k=keys.getJSONObject(i);if(k.optString("kid").equals(head.optString("kid"))&&k.optString("kty").equals("RSA")&&k.optString("use","sig").equals("sig"))key=k;}if(key==null)throw new Exception();
   PublicKey pub=KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(new BigInteger(1,un64(key.getString("n"))),new BigInteger(1,un64(key.getString("e")))));Signature signature=Signature.getInstance("SHA256withRSA");signature.initVerify(pub);signature.update((p[0]+"."+p[1]).getBytes(StandardCharsets.US_ASCII));if(!signature.verify(un64(p[2])))throw new Exception();
   boolean audience=false;Object aud=claims.opt("aud");if(aud instanceof String)audience=client.equals(aud);if(aud instanceof JSONArray){JSONArray array=(JSONArray)aud;for(int i=0;i<array.length();i++)if(client.equals(array.getString(i)))audience=true;if(array.length()>1&&!client.equals(claims.optString("azp")))throw new Exception();}
   long now=System.currentTimeMillis()/1000;double expiry=claims.optDouble("exp",Double.NaN);if(!Double.isFinite(expiry)||!audience||!AUTH.equals(claims.optString("iss"))||claims.optDouble("exp",0)<=now||claims.optLong("nbf",0)>now+30||!nonce.equals(claims.optString("nonce"))||claims.optString("sub").isEmpty())throw new Exception();return claims;
  }catch(Exception e){throw new TrialException("OpenAI identity validation failed. No account connection was accepted.");}
 }
 private String accessToken()throws Exception{synchronized(lock){if(session==null||!hasScope(session.optString("scope"),"chatgpt.tokens.use.direct"))throw new TrialException("Connect your account and authorize ChatGPT plan use first.");if(session.optLong("expires_at",0)<System.currentTimeMillis()+60000){String refresh=session.optString("refresh_token");if(refresh.isEmpty())throw new TrialException("Session expired. Connect the account again.");Map<String,String> p=new LinkedHashMap<>();p.put("grant_type","refresh_token");p.put("client_id",session.getString("client_id"));p.put("refresh_token",refresh);p.put("resource",API);JSONObject renewal=postForm(AUTH+"/api/accounts/oauth/token",p);Iterator<String> it=renewal.keys();while(it.hasNext()){String key=it.next();session.put(key,renewal.get(key));}session.put("expires_at",System.currentTimeMillis()+renewal.optLong("expires_in",0)*1000);if(!hasScope(session.optString("scope"),"chatgpt.tokens.use.direct"))throw new TrialException("ChatGPT plan permission is no longer active.");saveSession();}return session.getString("access_token");}}
 private JSONObject modelList()throws Exception{JSONObject response=get(API+"/models",accessToken());JSONArray source=response.optJSONArray("models"),clean=new JSONArray();if(source!=null)for(int i=0;i<source.length();i++){JSONObject m=source.getJSONObject(i);if(m.optString("visibility").equals("list")&&!m.optString("slug").isEmpty())clean.put(new JSONObject().put("slug",m.getString("slug")).put("display_name",m.optString("display_name",m.getString("slug"))));}synchronized(lock){models=clean;}return new JSONObject().put("models",clean);}
 private JSONObject infer(JSONObject p,boolean test)throws Exception{
  if(!busy.compareAndSet(false,true))throw new TrialException("An inference is already running.");JSONObject record=null;long started=0;
  try{String token=accessToken(),model=p.optString("model");boolean found=false;synchronized(lock){if(attempts>=3)throw new TrialException("The experimental limit of three requests per app process is reached. Export your results before restarting.");for(int i=0;i<models.length();i++)if(models.getJSONObject(i).getString("slug").equals(model))found=true;}if(!found)throw new TrialException("Refresh and select a model available to your account.");
   JSONObject payload;
   if(test)payload=new JSONObject().put("model",model).put("input",new JSONArray().put(new JSONObject().put("role","user").put("content","Reply with exactly: SwingLab connection verified."))).put("store",false).put("stream",true);
   else{payload=p.getJSONObject("payload");if(!model.equals(payload.optString("model"))||payload.optBoolean("store",true)||!payload.optBoolean("stream",false)||!payload.has("instructions")||payload.optJSONArray("input")==null)throw new TrialException("Invalid image-review request.");}
   byte[] bytes=payload.toString().getBytes(StandardCharsets.UTF_8);if(bytes.length>20*1024*1024)throw new TrialException("Image package is too large.");
   started=System.currentTimeMillis();record=new JSONObject().put("model",model).put("kind",test?"connection_test":"swing").put("frames",test?0:p.optInt("frames",0)).put("request_bytes",bytes.length).put("status","sent").put("usage",JSONObject.NULL).put("at_utc",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'",Locale.US){{setTimeZone(TimeZone.getTimeZone("UTC"));}}.format(new Date()));synchronized(lock){attempts++;ledger.put(record);}
   HttpsURLConnection c=open(API+"/responses",token);StringBuilder output=new StringBuilder();boolean completed=false;try{c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Accept","text/event-stream");c.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=c.getOutputStream()){out.write(bytes);}check(c);try(BufferedReader in=new BufferedReader(new InputStreamReader(c.getInputStream(),StandardCharsets.UTF_8))){String line;StringBuilder data=new StringBuilder();while((line=in.readLine())!=null){if(line.length()>4000000)throw new TrialException("Response chunk too large.");if(line.isEmpty()){if(data.length()>0){JSONObject e=data.toString().equals("[DONE]")?null:new JSONObject(data.toString());data.setLength(0);if(e!=null){String type=e.optString("type");if(type.equals("response.output_text.delta")){output.append(e.optString("delta"));if(output.length()>2000000)throw new TrialException("Response too long.");}else if(type.equals("response.completed")){completed=true;JSONObject response=e.optJSONObject("response");if(response!=null)record.put("usage",response.has("usage")?response.get("usage"):JSONObject.NULL);}else if(type.equals("response.failed")||type.equals("response.incomplete")||type.equals("error"))throw new TrialException("Inference did not complete. It may have consumed usage; it was not retried.");}}}else if(line.startsWith("data:")){if(data.length()>0)data.append('\n');data.append(line.substring(5).trim());}}}}
   finally{c.disconnect();}
   if(!completed)throw new TrialException("Inference ended without completion. Usage may have been consumed; no retry was made.");
   record.put("status","completed");record.put("duration_s",(System.currentTimeMillis()-started)/1000.0);return new JSONObject().put("text",output.toString()).put("record",record).put("ledger",new JSONArray(ledger.toString()));
  }catch(Exception e){if(record!=null){record.put("status","failed_or_unconfirmed");record.put("duration_s",(System.currentTimeMillis()-started)/1000.0);}throw e;}finally{busy.set(false);}
 }
 private SecretKey encryptionKey()throws Exception{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);if(!store.containsAlias(KEY)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();}return ((KeyStore.SecretKeyEntry)store.getEntry(KEY,null)).getSecretKey();}
 private void saveSession()throws Exception{if(session==null){prefs.edit().remove("encrypted_session").apply();return;}Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,encryptionKey());byte[] encrypted=c.doFinal(session.toString().getBytes(StandardCharsets.UTF_8));prefs.edit().putString("encrypted_session",Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(encrypted,Base64.NO_WRAP)).apply();}
 private JSONObject loadSession()throws Exception{String saved=prefs.getString("encrypted_session",null);if(saved==null)return null;String[] split=saved.split(":");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,encryptionKey(),new GCMParameterSpec(128,Base64.decode(split[0],Base64.NO_WRAP)));return new JSONObject(new String(c.doFinal(Base64.decode(split[1],Base64.NO_WRAP)),StandardCharsets.UTF_8));}
 private JSONObject disconnect()throws Exception{if(busy.get())throw new TrialException("Wait for inference to finish before disconnecting.");JSONObject old;synchronized(lock){old=session;session=null;models=new JSONArray();saveSession();}boolean revoked=old==null||old.optString("refresh_token").isEmpty();if(!revoked)try{Map<String,String> p=new LinkedHashMap<>();p.put("token",old.getString("refresh_token"));p.put("token_type_hint","refresh_token");p.put("client_id",old.getString("client_id"));postForm(discover().getString("revocation_endpoint"),p);revoked=true;}catch(Exception ignored){}return new JSONObject().put("message",revoked?"Session disconnected.":"Local credentials cleared; remote revocation was not confirmed. Disconnect this app in ChatGPT Settings.");}
 void close(){destroyed=true;if(listener!=null)try{listener.close();}catch(Exception ignored){}work.shutdownNow();}
}
