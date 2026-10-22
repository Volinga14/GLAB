(() => {
const root=document.documentElement,landing=document.getElementById('landingView'),app=document.getElementById('appView');
const screenIds={home:'screenHome',upload:'screenUpload',review:'screenReview',results:'screenResults',history:'screenHistory',compare:'screenCompare',profile:'screenProfile'};
const screens=Object.fromEntries(Object.entries(screenIds).map(([k,id])=>[k,document.getElementById(id)]));
const video=document.getElementById('swingVideo'),videoInput=document.getElementById('videoInput'),cameraInput=document.getElementById('cameraInput'),timeline=document.getElementById('timeline'),phaseList=document.getElementById('phaseList'),capturesGrid=document.getElementById('capturesGrid'),historyList=document.getElementById('historyList'),compareList=document.getElementById('compareList'),latestCarousel=document.getElementById('latestCarousel'),reviewTitleInput=document.getElementById('reviewTitleInput'),compareOutput=document.getElementById('compareOutput'),compareCount=document.getElementById('compareCount'),profileSwingCount=document.getElementById('profileSwingCount'),profileSavedCount=document.getElementById('profileSavedCount'),profilePhaseCount=document.getElementById('profilePhaseCount'),engineStatusDot=document.getElementById('engineStatusDot'),engineStatusText=document.getElementById('engineStatusText'),analysisProgress=document.getElementById('analysisProgress'),analysisProgressText=document.getElementById('analysisProgressText'),reviewPlayButton=document.querySelector('[data-action="play-toggle"]');
const modal=document.getElementById('mockupModal'),modalTitle=document.getElementById('modalTitle'),modalText=document.getElementById('modalText');
const installButtons=()=>document.querySelectorAll('[data-action="install-app"]');
const phases=['Address','Takeaway','Top','Impact','Finish'];
const store=SwingLabStorage.createStore(), clone=SwingLabStorage.clone;
let state={current:null,videoUrl:null,videoFile:null,history:[],markMode:false,compareSelected:[],comparePhase:'',compareLayer:'overlay',compareAdjust:{},engineUrl:loadEngineUrl(),engineOnline:false,engineBusy:false,installPrompt:null,storageReady:false,storageBusy:false};
let mediaRevision=0, phaseRevision=0, engineJob=null, healthJob=null, captureJob=null, draftBaseline=null;
const ready=store.init().then(({history,warning})=>{state.history=history;state.storageReady=true;renderAll();if(warning)modalMsg('History recovered.',warning)}).catch(()=>modalMsg('Storage unavailable.','Your browser could not open local storage. Sessions cannot be saved. Existing data has not been removed.'));
const notesInput=document.getElementById('sessionNotes');
notesInput.addEventListener('input',()=>{if(state.current)state.current.notes=notesInput.value});
function setVh(){root.style.setProperty('--vh',`${window.innerHeight*.01}px`)}setVh();addEventListener('resize',setVh);
function showApp(){if(landing)landing.classList.remove('is-active');if(app)app.classList.add('is-active');if(landing)landing.inert=true;go('home')}
function go(s){Object.entries(screens).forEach(([k,el])=>{el.classList.toggle('is-current',k===s);el.inert=k!==s;el.setAttribute('aria-hidden',String(k!==s))});document.querySelectorAll('.nav-item').forEach(b=>{const active=b.dataset.nav===s||(['review','results'].includes(s)&&b.dataset.nav==='upload');b.classList.toggle('is-active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});if(screens[s]){screens[s].scrollTop=0;const sc=screens[s].querySelector('.screen-scroll');if(sc)sc.scrollTop=0}renderAll()}
function modalMsg(t,txt='This feature will be connected in a later version.'){modalTitle.textContent=t;modalText.textContent=txt;modal.hidden=false}
function closeModal(){modal.hidden=true}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action)handle(b.dataset.action);if(b.dataset.nav)go(b.dataset.nav);if(b.dataset.openSession)openSession(b.dataset.openSession);if(b.dataset.deleteId)deleteSession(b.dataset.deleteId);if(b.dataset.compareId)toggleCompare(b.dataset.compareId);if(b.dataset.comparePhase)renderCompareViewer(b.dataset.comparePhase);if(b.dataset.modalTitle)modalMsg(b.dataset.modalTitle);if(b.hasAttribute('data-close'))closeModal()});
function handle(a){if(a==='edit-profile'){const form=document.getElementById('profileEditForm');form.hidden=!form.hidden;if(!form.hidden)document.getElementById('profileNameInput').focus()}if(a==='focus-settings'){const settings=document.getElementById('profileSettings');settings.open=true;settings.scrollIntoView({block:'nearest',behavior:'smooth'});settings.querySelector('summary').focus()}if(a==='go-home')showApp();if(a==='install-app')installApp();if(a==='pick-video')videoInput.click();if(a==='record-video')cameraInput.click();if(a==='play-toggle')togglePlay();if(a==='back-frame')stepFrame(-1);if(a==='forward-frame')stepFrame(1);if(a==='capture-phases')capturePhases();if(a==='toggle-mark-mode'){state.markMode=!state.markMode;renderPhases()}if(a==='clear-phases'&&state.current){phaseRevision++;state.current.phases={};state.current.captures={};state.markMode=false;renderPhases();renderCaptures()}if(a==='save-session')saveSession();if(a==='open-latest')openLatest();if(a==='clear-history')clearHistory();if(a==='open-compare-viewer')openCompareViewer();if(a==='close-compare-viewer')closeCompareViewer();if(a==='load-engine')loadEngine(true)}
videoInput.addEventListener('change',e=>loadVideoFile(e.target.files?.[0]));cameraInput.addEventListener('change',e=>loadVideoFile(e.target.files?.[0]));
if(reviewTitleInput){reviewTitleInput.addEventListener('input',()=>{if(!state.current)return;state.current.title=reviewTitleInput.value.trim()||'Swing session';renderHome()});reviewTitleInput.addEventListener('blur',()=>{if(state.current)reviewTitleInput.value=state.current.title||'Swing session'})}
async function loadVideoFile(file){
  if(!file)return;
  await ready;
  videoInput.value='';cameraInput.value='';
  if(state.storageBusy)return modalMsg('Save in progress.','Wait for the current save to finish.');
  if(!file.size||(!file.type.startsWith('video/')&&!/\.(mp4|mov|webm|m4v)$/i.test(file.name)))return modalMsg('Choose a video.','This file is empty or is not a supported video.');
  if(!canLeaveSession())return;
  releaseMedia();
  state.current={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:file.name.replace(/\.[^.]+$/,''),fileName:file.name,date:new Date().toISOString(),phases:{},captures:{},notes:'',drawings:[]};
  attachMedia(file);state.markMode=false;hydrateSession();go('review');
  videoInput.value='';cameraInput.value='';
}
video.addEventListener('loadedmetadata',()=>{timeline.value=0;updateTime()});
video.addEventListener('loadeddata',()=>{captureVideoPreview();if(state.engineOnline&&state.videoFile)analyzeWithEngine(state.videoFile)});
video.addEventListener('error',()=>{if(state.videoFile)modalMsg('Video cannot be played.','Try an MP4 or WebM video supported by your browser. Your saved sessions are unchanged.')});
video.addEventListener('timeupdate',updateTime);video.addEventListener('play',updateReviewPlayButton);video.addEventListener('pause',updateReviewPlayButton);timeline.addEventListener('input',()=>{if(Number.isFinite(video.duration))video.currentTime=(+timeline.value/1000)*video.duration});
function updateReviewPlayButton(){if(reviewPlayButton){reviewPlayButton.textContent=video.paused?'Play':'Pause';reviewPlayButton.classList.toggle('is-playing',!video.paused)}}
function togglePlay(){if(!state.videoFile)return modalMsg('No video loaded.','Upload or record a video first.');if(video.paused)video.play().catch(()=>modalMsg('Playback unavailable.','Try another video supported by your browser.'));else video.pause();updateReviewPlayButton()}
function stepFrame(d){if(!video.src)return;video.pause();video.currentTime=Math.max(0,Math.min(video.duration||0,video.currentTime+d/30))}
function updateTime(){if(!video.duration)return;timeline.value=Math.round((video.currentTime/video.duration)*1000);document.getElementById('currentTimeLabel').textContent=`${video.currentTime.toFixed(2)}s`;document.getElementById('durationLabel').textContent=`${video.duration.toFixed(2)}s`;updateReviewPlayButton()}
function captureVideoPreview(){if(!state.current||!state.videoFile||state.current.thumb||video.readyState<2)return;try{const c=document.createElement('canvas'),scale=Math.min(1,480/video.videoWidth);c.width=Math.round(video.videoWidth*scale);c.height=Math.round(video.videoHeight*scale);c.getContext('2d').drawImage(video,0,0,c.width,c.height);state.current.thumb=c.toDataURL('image/jpeg',.78);renderHome()}catch{}}
function frameLabel(t){return`F${Math.round((t||0)*30)}`}
function renderPhases(){const markBtn=document.getElementById('markModeBtn');if(markBtn){markBtn.classList.toggle('is-active',state.markMode);markBtn.textContent=state.markMode?'Marking':'Mark'}if(!state.current){phaseList.innerHTML='<p class="empty-text">Upload a video to mark phases.</p>';return}phaseList.innerHTML=phases.map(p=>{const t=state.current.phases[p];return`<button class="phase-btn ${t!=null?'is-marked':''} ${state.markMode?'is-mark-mode':''}" data-phase="${p}"><strong>${p}</strong><span>${t!=null?frameLabel(t):(state.markMode?'Set':'--')}</span></button>`}).join('');phaseList.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{if(!state.videoFile)return modalMsg('Original video unavailable.','This older session contains captures and notes only.');const p=b.dataset.phase,t=state.current.phases[p];if(state.markMode){setPhase(p,video.currentTime||0);return}if(t!=null){video.pause();video.currentTime=Math.max(0,Math.min(video.duration||t,t));updateTime();return}state.markMode=true;renderPhases()})}
function seekVideo(t,signal){return new Promise((resolve,reject)=>{
  if(signal.aborted)return reject(new DOMException('Cancelled','AbortError'));
  const target=Math.min(Math.max(0,t),video.duration);
  if(!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-target)<.001)return resolve();
  const finish=error=>{clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);error?reject(error):resolve()};
  const done=()=>finish(),failed=()=>finish(new Error('Video could not be decoded.')),aborted=()=>finish(new DOMException('Cancelled','AbortError'));
  const timer=setTimeout(()=>finish(new Error('Video seek timed out.')),5000);
  video.addEventListener('seeked',done,{once:true});video.addEventListener('error',failed,{once:true});signal.addEventListener('abort',aborted,{once:true});
  try{video.currentTime=target}catch(error){finish(error)}
})}
async function capturePhases(){
  if(!state.current||!state.videoFile||video.readyState<2||!Number.isFinite(video.duration))return modalMsg('No video ready.','Load a playable video first.');
  if(captureJob)return;
  const marked=Object.entries(state.current.phases);if(!marked.length)return modalMsg('No phases marked.','Tap Mark, then choose phases at the current frame.');
  const session=state.current,revision=mediaRevision,marks=phaseRevision,old=video.currentTime,controller=new AbortController();captureJob=controller;
  const canvas=document.createElement('canvas'),scale=Math.min(1,1280/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  const captures={},ctx=canvas.getContext('2d');video.pause();
  const isCurrent=()=>state.current===session&&mediaRevision===revision&&phaseRevision===marks&&!controller.signal.aborted;
  try{
    for(const[p,t]of marked){await seekVideo(t,controller.signal);if(!isCurrent())return;ctx.drawImage(video,0,0,canvas.width,canvas.height);captures[p]=canvas.toDataURL('image/jpeg',.82)}
    await seekVideo(old,controller.signal);if(!isCurrent())return;session.captures=captures;go('results');
  }catch(error){if(isCurrent())modalMsg('Captures could not be created.','Wait for the video to load and try again. Existing captures have been kept.')}
  finally{if(captureJob===controller)captureJob=null}
}
function renderCaptures(){if(!state.current){capturesGrid.innerHTML='';return}const e=Object.entries(state.current.captures||{});capturesGrid.innerHTML=e.length?e.map(([p,img])=>`<article class="capture-card"><img src="${img}"><strong>${p}</strong></article>`).join(''):'<section class="summary-card"><h3>No captures yet</h3><p>Mark phases and generate captures from the review screen.</p></section>'}
async function saveSession(){
  await ready;if(!state.current)return modalMsg('No session to save.','Upload a video first.');
  if(!state.storageReady)return storageFailure();if(state.storageBusy)return;
  state.current.title=reviewTitleInput.value.trim()||'Swing session';state.current.notes=notesInput.value;
  state.current.drawings=window.SwingLabEditor?.getDrawings()||state.current.drawings||[];
  const summary=SwingLabStorage.normalize(state.current),file=state.videoFile;
  state.storageBusy=true;
  try{
    await store.save(summary,file);
    state.history=[clone(summary),...state.history.filter(s=>s.id!==summary.id)];
    if(state.current?.id===summary.id)draftBaseline=JSON.stringify(summary);
    modalMsg('Session saved.',file?'Your video, phases, drawings, captures and notes were saved on this device.':'Your captures and notes were saved. The original video is not available for this older session.');renderAll();
  }catch{storageFailure()}finally{state.storageBusy=false}
}
function storageFailure(){modalMsg('Changes were not saved.','Local storage may be full or unavailable. Your previous saved sessions have been kept. Free some device space and try again.');return false}
function hydrateSession(){
  notesInput.value=state.current?.notes||'';
  reviewTitleInput.value=state.current?.title||'Review swing';
  document.dispatchEvent(new CustomEvent('swinglab:session-changed',{detail:{drawings:clone(state.current?.drawings||[])}}));
  draftBaseline=state.history.some(s=>s.id===state.current?.id)?JSON.stringify(SwingLabStorage.normalize(state.current)):null;
}
function hasUnsavedChanges(){if(!state.current)return false;const draft={...state.current,notes:notesInput.value,drawings:window.SwingLabEditor?.getDrawings()||state.current.drawings};return JSON.stringify(SwingLabStorage.normalize(draft))!==draftBaseline}
function canLeaveSession(){return !hasUnsavedChanges()||confirm('This session has unsaved changes. Discard them and continue?')}
window.addEventListener('beforeunload',event=>{if(hasUnsavedChanges()){event.preventDefault();event.returnValue=''}});
function cancelAnalysis(){if(engineJob){engineJob.controller.abort();engineJob=null}state.engineBusy=false;setEngineStatus(state.engineOnline?'online':'offline');setAnalysisProgress(false)}
function releaseMedia(){
  mediaRevision++;phaseRevision++;cancelAnalysis();captureJob?.abort();captureJob=null;
  video.pause();video.removeAttribute('src');video.load();
  const fullscreen=document.getElementById('fullscreenVideo');fullscreen.pause();fullscreen.removeAttribute('src');fullscreen.load();document.getElementById('fullscreenEditor').hidden=true;
  if(state.videoUrl)URL.revokeObjectURL(state.videoUrl);
  state.videoUrl=null;state.videoFile=null;
  document.getElementById('videoEmpty').style.display='';document.getElementById('videoEmpty').textContent='No video loaded';timeline.value=0;
  document.getElementById('currentTimeLabel').textContent='0.00s';document.getElementById('durationLabel').textContent='0.00s';
}
function attachMedia(file){state.videoFile=file;state.videoUrl=URL.createObjectURL(file);video.src=state.videoUrl;document.getElementById('videoEmpty').style.display='none'}
function setPhase(phase,time){
  if(!state.current||!state.videoFile||!phases.includes(phase)||!Number.isFinite(time))return;
  phaseRevision++;state.current.phases[phase]=Math.max(0,Math.min(Number.isFinite(video.duration)?video.duration:time,time));delete state.current.captures[phase];
  renderPhases();renderCaptures();
}
function loadEngineUrl(){try{const saved=localStorage.getItem('swinglab_engine_url')||'',query=new URLSearchParams(location.search).get('engine');let value=saved;if(query&&query!==saved&&confirm(`Use ${query} as your analysis service? Videos you analyze will be sent to this service.`))value=query;if(!value)return'';const parsed=new URL(value);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)return'';if(value!==saved)localStorage.setItem('swinglab_engine_url',value);return value}catch{return''}}
function engineEndpoint(kind='analyze'){const u=(state.engineUrl||'').trim().replace(/\/+$/,'');if(!u)return'';if(kind==='health')return /\/(analyze|predict)$/i.test(u)?u.replace(/\/(analyze|predict)$/i,'/health'):u+'/health';return /\/(analyze|predict)$/i.test(u)?u:u+'/analyze'}
function setEngineStatus(status,detail=''){if(status!=='busy')state.engineOnline=status==='online';if(engineStatusDot)engineStatusDot.className=`engine-dot is-${status}`;if(engineStatusText)engineStatusText.textContent=detail||({online:'Online',checking:'Checking...',offline:'Offline',busy:'Analyzing'}[status]||'Offline')}
function setAnalysisProgress(on,text=''){if(!analysisProgress)return;analysisProgress.hidden=!on;analysisProgress.classList.toggle('is-result',!state.engineBusy);const heading=analysisProgress.querySelector('strong');if(heading)heading.textContent=state.engineBusy?'Analyzing swing':'Analysis status';if(analysisProgressText)analysisProgressText.textContent=text||'Analyzing swing...'}
function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function updateInstallButtons(){installButtons().forEach(b=>{b.hidden=isStandalone();b.textContent=b.classList.contains('install-link')?'Install app':'Install'})}
async function installApp(){if(isStandalone())return modalMsg('Swing Lab is installed.','Open it from your home screen whenever you want to analyze a swing.');if(state.installPrompt){const promptEvent=state.installPrompt;state.installPrompt=null;promptEvent.prompt();const choice=await promptEvent.userChoice.catch(()=>({outcome:'dismissed'}));updateInstallButtons();return modalMsg(choice.outcome==='accepted'?'Installing Swing Lab.':'Install was cancelled.',choice.outcome==='accepted'?'The app will appear on your home screen once the browser finishes installing it.':'You can try again from the Install button.')}const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);modalMsg('Install Swing Lab.',isiOS?'In Safari, tap Share and choose Add to Home Screen.':'Open the browser menu and choose Install app or Add to Home screen. If it does not appear yet, refresh this page once.')}
function setupPwa(){updateInstallButtons();window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;updateInstallButtons()});window.addEventListener('appinstalled',()=>{state.installPrompt=null;updateInstallButtons();modalMsg('Swing Lab installed.','You can now launch it from your home screen.')});if('serviceWorker'in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{})}}
async function loadEngine(edit=false){
  let url=state.engineUrl;
  if(edit||!url){
    const next=prompt('Analysis service URL',url||'');if(next===null)return;
    url=next.trim();if(url){try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error();url=parsed.href.replace(/\/+$/,'')}catch{return modalMsg('Invalid service URL.','Enter an HTTP or HTTPS address for your analysis service.')}}
    cancelAnalysis();state.engineUrl=url;
    try{if(url)localStorage.setItem('swinglab_engine_url',url);else localStorage.removeItem('swinglab_engine_url')}catch{modalMsg('Service URL not saved.','The address will work in this tab, but could not be saved for your next visit.')}
  }
  healthJob?.abort();if(!url){setEngineStatus('offline','No engine URL');return}
  const controller=new AbortController();healthJob=controller;const timer=setTimeout(()=>controller.abort(),5000);setEngineStatus('checking');
  try{
    let res=await fetch(engineEndpoint('health'),{signal:controller.signal,cache:'no-store'});
    if(res.status===404||res.status===405)res=await fetch(engineEndpoint(),{method:'HEAD',signal:controller.signal,cache:'no-store'});
    if(healthJob!==controller)return;if(!res.ok)throw new Error('offline');setEngineStatus('online');if(state.videoFile)analyzeWithEngine(state.videoFile);
  }catch{if(healthJob===controller)setEngineStatus('offline')}
  finally{clearTimeout(timer);if(healthJob===controller)healthJob=null}
}
function normalPhaseName(name){const n=String(name||'').toLowerCase().replace(/[^a-z]/g,'');return phases.find(p=>p.toLowerCase()===n)||({setup:'Address',address:'Address',takeaway:'Takeaway',backswing:'Top',top:'Top',impact:'Impact',finish:'Finish'}[n]||'')}
function phaseTimeFromValue(v){if(v==null)return null;if(typeof v==='number')return v>video.duration+1?v/30:v;if(typeof v==='string'){const n=parseFloat(v);return Number.isFinite(n)?phaseTimeFromValue(n):null}if(typeof v==='object'){if(v.seconds!=null)return Number(v.seconds);if(v.time!=null)return phaseTimeFromValue(v.time);if(v.timestamp!=null)return phaseTimeFromValue(v.timestamp);if(v.frame!=null)return Number(v.frame)/30;if(v.percent!=null&&video.duration)return Number(v.percent)*video.duration}return null}
function extractEnginePhases(data){const out={};const src=data?.phases||data?.phaseTimes||data?.predictions||data?.marks||data?.result?.phases||data;if(Array.isArray(src)){src.forEach(x=>{const p=normalPhaseName(x.phase||x.name||x.label||x.key);const t=phaseTimeFromValue(x);if(p&&Number.isFinite(t))out[p]=Math.max(0,Math.min(video.duration||t,t))})}else if(src&&typeof src==='object'){Object.entries(src).forEach(([k,v])=>{const p=normalPhaseName(k);const t=phaseTimeFromValue(v);if(p&&Number.isFinite(t))out[p]=Math.max(0,Math.min(video.duration||t,t))})}return out}
function buildAnalyzeForm(file,fieldName){const body=new FormData();body.append(fieldName,file,file.name||'swing.mp4');body.append('fps','30');body.append('phases',JSON.stringify(phases));return body}
async function postAnalyzeVideo(file,signal,endpoint){const fields=['file','video','upload'];let lastStatus=0;for(const field of fields){const res=await fetch(endpoint,{method:'POST',body:buildAnalyzeForm(file,field),signal});if(res.ok)return res;lastStatus=res.status;if(res.status!==422)break;}throw new Error(`HTTP ${lastStatus}`)}
async function analyzeWithEngine(file){
  if(!file||file!==state.videoFile||!state.current||!state.engineOnline||state.engineBusy||!Number.isFinite(video.duration)||video.readyState<2)return;
  const job={controller:new AbortController(),session:state.current,revision:mediaRevision,marks:phaseRevision};engineJob=job;state.engineBusy=true;
  const endpoint=engineEndpoint(),timer=setTimeout(()=>job.controller.abort(),60000);
  const isCurrent=()=>engineJob===job&&state.current===job.session&&mediaRevision===job.revision;
  setEngineStatus('busy','Analyzing');setAnalysisProgress(true,'Analyzing your video...');
  try{
    const res=await postAnalyzeVideo(file,job.controller.signal,endpoint),data=await res.json();
    if(!isCurrent()||job.controller.signal.aborted)return;
    const estimated=extractEnginePhases(data);if(!Object.keys(estimated).length)throw new Error('No phases returned');
    // Manual changes made while the request was running always take precedence.
    if(phaseRevision!==job.marks){setAnalysisProgress(true,'Analysis finished. Your manual phase changes were kept.');return}
    for(const[p,t]of Object.entries(estimated)){if(job.session.phases[p]==null){job.session.phases[p]=t;delete job.session.captures[p]}}
    phaseRevision++;renderPhases();renderCaptures();setAnalysisProgress(true,'Analysis complete. Review the estimated phases before saving.');
  }catch(error){if(isCurrent())setAnalysisProgress(true,error.name==='AbortError'?'Analysis timed out. Manual marking is available.':'Analysis failed. Manual marking is available.');}
  finally{clearTimeout(timer);if(isCurrent()){engineJob=null;state.engineBusy=false;setEngineStatus('online');setAnalysisProgress(!analysisProgress.hidden,analysisProgressText.textContent)}}
}
async function clearHistory(){
  await ready;if(!state.storageReady)return storageFailure();if(state.storageBusy)return;
  if(!confirm('Delete all saved sessions and their videos from this device?'))return;
  state.storageBusy=true;
  try{await store.clear();releaseMedia();state.current=null;state.history=[];hydrateSession();renderAll();let message='Saved sessions, videos and the legacy recovery copy have been removed from this device.';try{localStorage.removeItem('swinglab_history_v19')}catch{message='Current sessions and videos were removed. The old recovery copy could not be removed from browser storage.'}modalMsg('Local history cleared.',message)}catch{storageFailure()}finally{state.storageBusy=false}
}
async function deleteSession(id){
  if(state.storageBusy)return;const session=state.history.find(x=>x.id===id);if(!session)return;
  if(!confirm(`Delete "${session.title||'Swing session'}" and its saved video?`))return;
  state.storageBusy=true;
  try{await store.remove(id);state.history=state.history.filter(x=>x.id!==id);if(state.current?.id===id){releaseMedia();state.current=null;hydrateSession()}renderAll()}catch{storageFailure()}finally{state.storageBusy=false}
}
function openLatest(){const latest=state.current||state.history[0];if(!latest){go('upload');return}openSession(latest.id)}
async function openSession(id,target){
  await ready;if(state.storageBusy)return;
  if(state.current?.id===id){go(target||(state.videoFile?'review':'results'));return}
  const session=state.history.find(s=>s.id===id);if(!session){go('upload');return}
  if(!canLeaveSession())return;
  releaseMedia();const revision=mediaRevision;state.current=clone(session);state.markMode=false;hydrateSession();go('results');
  try{
    const file=await store.video(id);if(mediaRevision!==revision||state.current?.id!==id)return;
    if(file){attachMedia(file);go(target||'review')}
    else{document.getElementById('videoEmpty').textContent='Original video unavailable for this older session';if(target==='review')go('review')}
  }catch{if(mediaRevision===revision)modalMsg('Video unavailable.','The original video could not be read. Your saved captures and notes are still available.')}
}
async function renameSession(id,title){
  const clean=(title||'').trim()||'Swing session',session=state.history.find(x=>x.id===id);if(!session||session.title===clean)return;
  if(state.storageBusy){renderHistory();return}state.storageBusy=true;
  const updated=clone(session);updated.title=clean;
  try{await store.save(updated);state.history=state.history.map(s=>s.id===id?updated:s);if(state.current?.id===id){state.current.title=clean;reviewTitleInput.value=clean;if(draftBaseline){const baseline=JSON.parse(draftBaseline);baseline.title=clean;draftBaseline=JSON.stringify(baseline)}}renderHome();renderCompare()}catch{storageFailure();renderHistory()}finally{state.storageBusy=false}
}
function renderHistory(){historyList.innerHTML=state.history.length?state.history.map(s=>`<article class="history-item"><img class="history-thumb" src="${s.thumb||'assets/analysis-thumb.webp'}"><div><input class="history-title-input" data-title-id="${s.id}" value="${esc(s.title||'Swing session')}" aria-label="Swing name"><p>${new Date(s.date).toLocaleString()} • ${Object.keys(s.phases||{}).length}/5 phases</p><div class="history-actions"><button class="tiny-btn" data-report="${s.id}">Report</button></div></div><button class="history-delete" data-delete-id="${s.id}" aria-label="Delete ${esc(s.title||'Swing session')}">×</button></article>`).join(''):'<section class="summary-card"><h3>No saved swings yet</h3><p>Upload a video, mark phases and save your first session.</p></section>';historyList.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>openSession(b.dataset.report,'results'));historyList.querySelectorAll('[data-title-id]').forEach(input=>input.addEventListener('change',()=>renameSession(input.dataset.titleId,input.value)))}
function phaseFrame(s,p){const t=s?.phases?.[p];return t==null?null:Math.round(t*30)}
function toggleCompare(id){if(!id)return;const set=new Set(state.compareSelected);if(set.has(id))state.compareSelected=state.compareSelected.filter(x=>x!==id);else{if(state.compareSelected.length>=2)state.compareSelected.shift();state.compareSelected.push(id)}renderCompare()}
function renderCompare(){const history=state.history;state.compareSelected=state.compareSelected.filter(id=>history.some(s=>s.id===id)).slice(0,2);if(compareCount)compareCount.textContent=`${state.compareSelected.length}/2`;if(!history.length){compareList.innerHTML='<section class="summary-card"><h3>No swings saved</h3><p>Save two reviews to compare phase frames and report notes.</p></section>';if(compareOutput)compareOutput.innerHTML='';return}compareList.innerHTML=history.map(s=>{const selected=state.compareSelected.includes(s.id);return`<article class="history-item compare-select ${selected?'is-selected':''}"><img class="history-thumb" src="${s.thumb||'assets/analysis-thumb.webp'}"><div><h3>${esc(s.title||'Swing session')}</h3><p>${Object.keys(s.phases||{}).length}/5 phases marked</p></div><button class="tiny-btn" data-compare-id="${s.id}">${selected?'Selected':'Select'}</button></article>`}).join('');if(!compareOutput)return;const chosen=state.compareSelected.map(id=>history.find(s=>s.id===id)).filter(Boolean);if(chosen.length<2){compareOutput.innerHTML='<section class="compare-empty"><strong>Pick two swings</strong><span>Then review phase frames, timing differences and notes in one place.</span></section>';return}const [a,b]=chosen;compareOutput.innerHTML=`<section class="compare-result-head"><button type="button" class="compare-preview-card" data-action="open-compare-viewer"><img src="${compareImage(a)}"><strong>${esc(a.title||'Swing A')}</strong><span>${phaseCount(a)}/5 phases</span></button><button type="button" class="compare-preview-card" data-action="open-compare-viewer"><img src="${compareImage(b)}"><strong>${esc(b.title||'Swing B')}</strong><span>${phaseCount(b)}/5 phases</span></button></section><section class="phase-compare-table"><div class="table-head"><span>Phase</span><span>${esc(a.title||'A')}</span><span>${esc(b.title||'B')}</span><span>Diff</span></div>${phases.map(p=>{const fa=phaseFrame(a,p),fb=phaseFrame(b,p),diff=fa!=null&&fb!=null?fb-fa:null;return`<div><span>${p}</span><strong>${fa==null?'--':'F'+fa}</strong><strong>${fb==null?'--':'F'+fb}</strong><em>${diff==null?'--':(diff>0?'+':'')+diff+'f'}</em></div>`}).join('')}</section>`}
function comparePair(){return state.compareSelected.map(id=>state.history.find(s=>s.id===id)).filter(Boolean).slice(0,2)}
function compareImage(s,phase=state.comparePhase){return phase&&s?.captures?.[phase]?s.captures[phase]:s?.thumb||Object.values(s?.captures||{})[0]||'assets/analysis-thumb.webp'}
function comparePhases(pair){const available=phases.filter(p=>pair.some(s=>s?.captures?.[p]||s?.phases?.[p]!=null));return available.length?available:phases}
function ensureCompareViewer(){let viewer=document.getElementById('compareViewer');if(viewer)return viewer;viewer=document.createElement('section');viewer.id='compareViewer';viewer.className='compare-viewer';viewer.hidden=true;document.body.appendChild(viewer);return viewer}
function openCompareViewer(){const pair=comparePair();if(pair.length<2)return modalMsg('Select two swings.','Choose two saved swings before opening the compare viewer.');state.comparePhase=state.comparePhase||comparePhases(pair)[0]||'';renderCompareViewer(state.comparePhase)}
function closeCompareViewer(){const viewer=document.getElementById('compareViewer');if(viewer)viewer.hidden=true}
function compareLayerState(phase,layer){state.compareAdjust.global=state.compareAdjust.global||{};state.compareAdjust.global[layer]=state.compareAdjust.global[layer]||{x:0,y:0,scale:1,opacity:layer==='base'?1:.52};return state.compareAdjust.global[layer]}
function syncCompareStage(viewer,phase){const base=compareLayerState(phase,'base'),overlay=compareLayerState(phase,'overlay'),stage=viewer.querySelector('.compare-stage');if(!stage)return;stage.style.setProperty('--base-x',`${base.x}px`);stage.style.setProperty('--base-y',`${base.y}px`);stage.style.setProperty('--base-scale',base.scale);stage.style.setProperty('--base-opacity',base.opacity);stage.style.setProperty('--overlay-x',`${overlay.x}px`);stage.style.setProperty('--overlay-y',`${overlay.y}px`);stage.style.setProperty('--overlay-scale',overlay.scale);stage.style.setProperty('--overlay-opacity',overlay.opacity);viewer.querySelectorAll('[data-compare-layer]').forEach(b=>b.classList.toggle('is-active',b.dataset.compareLayer===state.compareLayer));viewer.querySelectorAll('[data-opacity-layer]').forEach(i=>{const s=compareLayerState(phase,i.dataset.opacityLayer);i.value=Math.round(s.opacity*100)});viewer.querySelectorAll('[data-zoom-layer]').forEach(i=>{const s=compareLayerState(phase,i.dataset.zoomLayer);i.value=Math.round(s.scale*100)})}
function bindCompareViewer(viewer,phase){viewer.querySelectorAll('[data-compare-layer]').forEach(b=>b.onclick=()=>{state.compareLayer=b.dataset.compareLayer;syncCompareStage(viewer,phase)});viewer.querySelectorAll('[data-opacity-layer]').forEach(i=>i.oninput=()=>{compareLayerState(phase,i.dataset.opacityLayer).opacity=Number(i.value)/100;syncCompareStage(viewer,phase)});viewer.querySelectorAll('[data-zoom-layer]').forEach(i=>i.oninput=()=>{compareLayerState(phase,i.dataset.zoomLayer).scale=Number(i.value)/100;syncCompareStage(viewer,phase)});const reset=viewer.querySelector('[data-compare-reset]');if(reset)reset.onclick=()=>{state.compareAdjust.global={base:{x:0,y:0,scale:1,opacity:1},overlay:{x:0,y:0,scale:1,opacity:.52}};syncCompareStage(viewer,phase)};const stage=viewer.querySelector('.compare-stage');if(!stage)return;const points=new Map();let lastPinch=null;const pinch=()=>{const p=[...points.values()];if(p.length<2)return null;return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}};stage.onpointerdown=e=>{points.set(e.pointerId,{x:e.clientX,y:e.clientY});lastPinch=pinch();stage.setPointerCapture?.(e.pointerId);e.preventDefault()};stage.onpointermove=e=>{if(!points.has(e.pointerId))return;const prev=points.get(e.pointerId),layer=state.compareLayer,s=compareLayerState(phase,layer);points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size>=2){const next=pinch();if(lastPinch&&next&&lastPinch.d>0){s.scale=Math.max(.7,Math.min(1.8,s.scale*(next.d/lastPinch.d)));s.x+=next.x-lastPinch.x;s.y+=next.y-lastPinch.y}lastPinch=next}else if(prev){s.x+=e.clientX-prev.x;s.y+=e.clientY-prev.y}syncCompareStage(viewer,phase);e.preventDefault()};const end=e=>{points.delete(e.pointerId);lastPinch=pinch()};stage.onpointerup=end;stage.onpointercancel=end}
function renderCompareViewer(phase=state.comparePhase){const pair=comparePair();if(pair.length<2)return;state.comparePhase=phase;const [a,b]=pair,viewer=ensureCompareViewer(),phaseOptions=comparePhases(pair),baseName=esc(a.title||'Swing A'),overlayName=esc(b.title||'Swing B');viewer.hidden=false;viewer.innerHTML=`<div class="compare-viewer-top"><button type="button" class="compare-close" data-action="close-compare-viewer">Done</button><div><strong>Compare overlay</strong><span>${baseName} vs ${overlayName}</span></div></div><div class="compare-stage"><img class="compare-base" src="${compareImage(a,phase)}" alt=""><img class="compare-overlay" src="${compareImage(b,phase)}" alt=""></div><div class="compare-viewer-controls"><div class="compare-phase-tabs">${phaseOptions.map(p=>`<button type="button" class="${p===phase?'is-active':''}" data-compare-phase="${p}">${p}</button>`).join('')}</div><div class="compare-layer-tabs"><button type="button" data-compare-layer="base">${baseName}</button><button type="button" data-compare-layer="overlay">${overlayName}</button><button type="button" data-compare-reset>Reset</button></div><div class="compare-control-grid"><label class="compare-control"><span>${baseName} opacity</span><input data-opacity-layer="base" type="range" min="0" max="100"></label><label class="compare-control"><span>${baseName} zoom</span><input data-zoom-layer="base" type="range" min="70" max="150"></label><label class="compare-control"><span>${overlayName} opacity</span><input data-opacity-layer="overlay" type="range" min="0" max="100"></label><label class="compare-control"><span>${overlayName} zoom</span><input data-zoom-layer="overlay" type="range" min="70" max="150"></label></div></div>`;bindCompareViewer(viewer,phase);syncCompareStage(viewer,phase)}
function phaseCount(s){return Object.keys(s?.phases||{}).length}
const PROFILE_KEY='swinglab_profile_v1';
function readProfile(){try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');return {name:typeof p.name==='string'?p.name.slice(0,60):'',hand:p.hand==='left'?'left':'right',view:p.view==='FO'?'FO':'DTL',club:typeof p.club==='string'?p.club.slice(0,60):''}}catch{return {name:'',hand:'right',view:document.getElementById('profileView')?.value||'DTL',club:''}}}
let profile=readProfile();
function saveProfile(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));return true}catch{modalMsg('Preferences could not be saved.','Your preferences remain available in this tab. Browser storage may be unavailable.');return false}}
function profileInitials(){return profile.name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(n=>Array.from(n)[0]).join('').toUpperCase()||'SL'}
function renderProfile(){
  const saved=state.history.length,totalPhases=state.history.reduce((sum,s)=>sum+phaseCount(s),0),now=new Date();
  if(profileSwingCount)profileSwingCount.textContent=`${saved} ${saved===1?'swing':'swings'}`;
  if(profileSavedCount)profileSavedCount.textContent=saved;if(profilePhaseCount)profilePhaseCount.textContent=totalPhases;
  document.getElementById('profileMonthCount').textContent=state.history.filter(s=>{const d=new Date(s.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}).length;
  document.getElementById('profileName').textContent=profile.name||'Swing Lab User';
  document.querySelectorAll('[data-profile-initials]').forEach(el=>el.textContent=profileInitials());
  document.getElementById('homeGreeting').textContent=profile.name?'Hi, '+profile.name.trim().split(/\s+/)[0]:'Hi, golfer';
}
const nameInput=document.getElementById('profileNameInput');nameInput.value=profile.name;
document.getElementById('profileEditForm').addEventListener('submit',e=>{e.preventDefault();profile.name=nameInput.value.trim();if(saveProfile())document.getElementById('profileEditForm').hidden=true;renderProfile()});
for(const [id,key]of [['profileHand','hand'],['profileView','view'],['profileClub','club']]){const el=document.getElementById(id);el.value=profile[key];el.addEventListener('change',()=>{profile[key]=el.value;saveProfile();renderProfile()})}
function dayKey(date){return [date.getFullYear(),date.getMonth(),date.getDate()].join('-')}
function renderStreak(){
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate());start.setDate(start.getDate()-((start.getDay()+6)%7));
  const end=new Date(start);end.setDate(end.getDate()+7);
  const sessions=state.history.filter(s=>{const d=new Date(s.date);return d>=start&&d<end});
  document.getElementById('streakCount').textContent=`${sessions.length} ${sessions.length===1?'session':'sessions'} this week`;
  const days=new Set(sessions.map(s=>dayKey(new Date(s.date))));
  const week=document.getElementById('streakWeek');week.replaceChildren();
  for(let i=0;i<7;i++){const date=new Date(start);date.setDate(date.getDate()+i);const practiced=days.has(dayKey(date)),day=document.createElement('span');day.className='streak-day'+(practiced?' is-practiced':'')+(dayKey(date)===dayKey(now)?' is-today':'');day.title=date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})+(practiced?' — Session saved':' — No sessions');const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=['M','T','W','T','F','S','S'][i];day.append(dot,label);week.append(day)}
  week.setAttribute('aria-label',`${sessions.length} saved sessions this week. View practice history`);
}

function shortDate(d){try{return new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric'})}catch{return'New'}}
function renderHome(){renderStreak();if(!latestCarousel)return;const sessions=[state.current,...state.history.filter(s=>!state.current||s.id!==state.current.id)].filter(Boolean).slice(0,6);if(!sessions.length){latestCarousel.innerHTML=`<article class="latest-empty"><div class="latest-empty-copy"><div class="latest-empty-kicker"><svg viewBox="0 0 24 24"><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span>No analysis yet</span></div><h4>Your next improvement starts here</h4><p>Upload a short swing video and mark the key positions frame by frame.</p></div></article>`;return}latestCarousel.innerHTML=sessions.map((s,i)=>`<article class="latest-card"><div class="latest-card-media"><img src="${s.thumb||Object.values(s.captures||{})[0]||'assets/analysis-thumb.webp'}" alt=""><button class="latest-card-play" data-open-session="${s.id}" aria-label="Open ${esc(s.title||'Swing session')}"><svg viewBox="0 0 24 24"><path d="M8.5 6.6c0-.8.86-1.3 1.56-.89l8.02 4.78c.68.41.68 1.39 0 1.8l-8.02 4.78a1.03 1.03 0 0 1-1.56-.89V6.6Z"/></svg></button></div><div class="latest-card-body"><div class="latest-card-kicker"><svg viewBox="0 0 24 24"><path d="M7 2.8a1 1 0 0 1 1 1V5h8V3.8a1 1 0 1 1 2 0V5h.8A2.2 2.2 0 0 1 21 7.2V18a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 18V7.2A2.2 2.2 0 0 1 5.2 5H6Z"/></svg><span>${i?'Saved':'Latest'} · ${shortDate(s.date)}</span></div><h4>${esc(s.title||'Swing session')}</h4><p>${phaseCount(s)}/5 phases marked</p><button type="button" class="session-continue" data-open-session="${s.id}">Continue &#8250;</button><div class="latest-card-metrics"><span class="latest-chip">Mode<strong>Manual</strong></span><span class="latest-chip">Report<strong>${phaseCount(s)?'Ready':'Draft'}</strong></span></div></div></article>`).join('')}
function renderReviewHeader(){if(!state.current||!reviewTitleInput)return;reviewTitleInput.value=state.current.title||'Swing session';document.getElementById('reviewSubtitle').textContent=state.current.fileName||'Manual phase review'}
function renderAll(){renderReviewHeader();renderHome();renderPhases();renderCaptures();renderHistory();renderCompare();renderProfile()}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
setEngineStatus(state.engineUrl?'offline':'offline',state.engineUrl?'Saved engine':'Offline');
if(state.engineUrl)setTimeout(()=>loadEngine(false),350);
setupPwa();
renderAll();
})();





/* v24 fullscreen video analysis editor */
(function(){
  const mainVideo = document.getElementById('swingVideo');
  const wrap = document.querySelector('.analysis-video-wrap');
  const editor = document.getElementById('fullscreenEditor');
  const fsVideo = document.getElementById('fullscreenVideo');
  const canvas = document.getElementById('fullscreenCanvas');
  const fsTimeline = document.getElementById('fsTimeline');
  const fsTime = document.getElementById('fsTime');
  const fsSpeed = document.getElementById('fsSpeed');
  const speedMenu = document.getElementById('speedMenu');
  const fsPlayButton = document.getElementById('fsPlayButton');
  const fsToolName = document.getElementById('fsToolName');
  const fsStatusText = document.getElementById('fsStatusText');
  const fsFitState = document.getElementById('fsFitState');
  const toolPanel = document.getElementById('toolPanel');
  const toolDock = document.getElementById('toolDock');
  const toolStyle = document.getElementById('toolStyle');
  if(!mainVideo || !editor || !fsVideo || !canvas) return;

  const S = {
    tool:'select',
    color:'#99f032',
    width:5,
    shapes:[],
    selected:null,
    temp:null,
    drawing:false,
    drawEnabled:false,
    toolsCollapsed:false,
    snapLine:false,
    drawStart:0,
    fps:30,
    angleDraft:null,
    drag:null,
    panelDrag:null,
    guides:false,
    fitSafe:false,
    view:document.getElementById('profileView')?.value||'DTL',
    speeds:[.125,.25,.5,1,1.5],
    speedIndex:3,
    lastSrc:null
  };

  document.addEventListener('swinglab:session-changed', event => {
    S.shapes=JSON.parse(JSON.stringify(event.detail.drawings||[]));
    resetDrawState();
  });
  window.SwingLabEditor={getDrawings:()=>JSON.parse(JSON.stringify(S.shapes))};

  function openEditor(){
    if(!mainVideo.src) return;
    S.view=document.getElementById('profileView')?.value||'DTL';
    updateLabels();
    editor.hidden = false;
    const newSource = fsVideo.src !== mainVideo.src;
    if(newSource) {
      fsVideo.src = mainVideo.src;
      resetDrawState();
    }
    try { fsVideo.currentTime = mainVideo.currentTime || 0; } catch(e) {}
    fsVideo.playbackRate = S.speeds[S.speedIndex];
    mainVideo.pause();
    setTimeout(()=>{ resizeCanvas(); draw(); updateTime(); }, 80);
  }
  function closeEditor(){
    try { mainVideo.currentTime = fsVideo.currentTime || 0; } catch(e) {}
    fsVideo.pause();
    editor.hidden = true;
    draw();
  }

  mainVideo.addEventListener('loadedmetadata', () => {
    if(mainVideo.src !== S.lastSrc){
      S.lastSrc = mainVideo.src;
      resetDrawState();
    }
  });

  if(wrap){
    wrap.addEventListener('click', (e)=>{
      if(mainVideo.src && !e.target.closest('button,input')) openEditor();
    });
  }

  function resizeCanvas(){
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(r.height * devicePixelRatio));
  }
  function point(e){
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {x:(p.clientX-r.left)/r.width, y:(p.clientY-r.top)/r.height};
  }
  function center(s){
    if(s.type==='circle') return {x:s.x1,y:s.y1};
    if(s.type==='angle') return {x:s.x2,y:s.y2};
    if(s.type==='free'){
      const mid=s.points[Math.floor(s.points.length/2)] || s.points[0];
      return mid || {x:0,y:0};
    }
    return {x:(s.x1+s.x2)/2, y:(s.y1+s.y2)/2};
  }
  function distToSegment(p,a,b){
    const vx=b.x-a.x, vy=b.y-a.y, wx=p.x-a.x, wy=p.y-a.y;
    const len=vx*vx+vy*vy || 1;
    const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/len));
    const px=a.x+t*vx, py=a.y+t*vy;
    return Math.hypot(p.x-px,p.y-py);
  }
  function hit(p){
    let best=null, dist=.045;
    for(const s of S.shapes){
      let d;
      if(s.type==='line') d=distToSegment(p,{x:s.x1,y:s.y1},{x:s.x2,y:s.y2});
      else if(s.type==='angle') d=Math.min(distToSegment(p,{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}),distToSegment(p,{x:s.x2,y:s.y2},{x:s.x3,y:s.y3}));
      else if(s.type==='box') {
        const x=Math.min(s.x1,s.x2), y=Math.min(s.y1,s.y2), w=Math.abs(s.x2-s.x1), h=Math.abs(s.y2-s.y1);
        d=(p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h)?0:Math.hypot(p.x-(x+w/2),p.y-(y+h/2));
      } else if(s.type==='circle') {
        d=Math.abs(Math.hypot(p.x-s.x1,p.y-s.y1)-Math.hypot(s.x2-s.x1,s.y2-s.y1));
      } else {
        const c = center(s); d = Math.hypot(p.x-c.x,p.y-c.y);
      }
      if(d<dist){ best=s; dist=d; }
    }
    return best;
  }
  function shapeSize(s){
    if(!s) return 0;
    if(s.type==='free') {
      let minX=1,minY=1,maxX=0,maxY=0;
      (s.points||[]).forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});
      return Math.max(maxX-minX,maxY-minY);
    }
    if(s.type==='angle') return Math.min(Math.hypot(s.x1-s.x2,s.y1-s.y2),Math.hypot(s.x3-s.x2,s.y3-s.y2));
    return Math.hypot((s.x2||s.x1)-s.x1,(s.y2||s.y1)-s.y1);
  }
  function isDrawable(s){
    const min = s?.type==='free' ? .022 : .028;
    return shapeSize(s) >= min;
  }
  function moveShape(s,dx,dy){
    ['x1','x2','x3'].forEach(k=>{ if(s[k]!=null) s[k]+=dx; });
    ['y1','y2','y3'].forEach(k=>{ if(s[k]!=null) s[k]+=dy; });
    if(s.points) s.points.forEach(p=>{p.x+=dx;p.y+=dy;});
  }
  function resetDrawState(){
    S.drawEnabled=false;
    S.tool='select';
    S.selected=null;
    S.temp=null;
    S.drawing=false;
    S.drag=null;
    S.angleDraft=null;
    S.toolsCollapsed=false;
    if(toolPanel) toolPanel.hidden=true;
    if(toolDock) toolDock.hidden=true;
    if(toolStyle) toolStyle.hidden=true;
    document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('is-active', b.dataset.tool==='select'));
    setStatus('Draw tools are off');
  }
  function setDrawEnabled(on){
    S.drawEnabled=on;
    editor.classList.toggle('is-draw-off', !on);
    if(toolPanel) toolPanel.hidden=!on;
    if(toolDock) toolDock.hidden=true;
    if(!on){
      if(toolStyle) toolStyle.hidden=true;
      S.temp=null; S.drag=null; S.drawing=false; S.selected=null; S.angleDraft=null;
      setStatus('Draw tools are off');
    } else {
      setStatus('Select or choose a mark tool');
    }
    draw();
  }
  function collapseTools(){
    if(!toolPanel || !toolDock) return;
    S.toolsCollapsed=true;
    toolPanel.hidden=true;
    toolPanel.classList.add('is-collapsed');
    toolPanel.style.left='';
    toolPanel.style.top='';
    toolPanel.style.bottom='';
    if(toolStyle) toolStyle.hidden=true;
    toolDock.hidden=false;
    toolDock.classList.add('is-visible');
    updateLabels();
  }
  function expandTools(){
    if(!toolPanel || !toolDock) return;
    S.toolsCollapsed=false;
    setDrawEnabled(true);
    toolPanel.hidden=false;
    toolPanel.classList.remove('is-collapsed');
    toolDock.hidden=true;
    toolDock.classList.remove('is-visible');
    updateLabels();
  }
  function draw(){
    resizeCanvas();
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.scale(canvas.width, canvas.height);

    if(S.guides){
      ctx.strokeStyle='rgba(255,255,255,.22)';
      ctx.lineWidth=1/canvas.width;
      ctx.beginPath();
      ctx.moveTo(.5,0); ctx.lineTo(.5,1);
      ctx.moveTo(0,.5); ctx.lineTo(1,.5);
      ctx.moveTo(.33,0); ctx.lineTo(.33,1);
      ctx.moveTo(.66,0); ctx.lineTo(.66,1);
      ctx.stroke();
    }

    [...S.shapes, S.angleDraft, S.temp].filter(Boolean).forEach(s => drawShape(ctx,s,s.id===S.selected));
    ctx.restore();
    updateLabels();
  }
  function drawShape(ctx,s,selected){
    const lw = (selected ? (s.width||S.width)+1.25 : (s.width || S.width)) / Math.max(canvas.width, canvas.height);
    ctx.strokeStyle = selected ? '#ffffff' : (s.color || S.color);
    ctx.fillStyle = hexToRgba(s.color || S.color, .09);
    ctx.lineWidth = lw;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor = hexToRgba(s.color || S.color, selected ? .55 : .25);
    ctx.shadowBlur = selected ? 10/canvas.width : 6/canvas.width;

    if(s.type==='line'){
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
    }
    if(s.type==='box'){
      const x=Math.min(s.x1,s.x2), y=Math.min(s.y1,s.y2), w=Math.abs(s.x2-s.x1), h=Math.abs(s.y2-s.y1);
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(x,y,w,h,.01); else ctx.rect(x,y,w,h);
      ctx.fill(); ctx.stroke();
    }
    if(s.type==='circle'){
      const r=Math.hypot(s.x2-s.x1,s.y2-s.y1);
      const ratio = canvas.width / Math.max(1, canvas.height);
      ctx.beginPath(); ctx.ellipse(s.x1,s.y1,r,r*ratio,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }
    if(s.type==='angle'){
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.lineTo(s.x3??s.x2,s.y3??s.y2); ctx.stroke();
      const val = angleVal(s);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '600 .034px system-ui';
      if(isDrawable(s)) ctx.fillText(Math.round(val)+'°', s.x2+.018, s.y2-.018);
    }
    if(s.type==='free'){
      ctx.beginPath();
      s.points.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.stroke();
    }
  }
  function drawHandle(ctx,x,y){
    ctx.save();
    ctx.shadowBlur=0;
    ctx.fillStyle='#99f032';
    ctx.beginPath(); ctx.arc(x,y,.008,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function angleVal(s){
    const ax=(s.x1-s.x2)*canvas.width, ay=(s.y1-s.y2)*canvas.height, bx=((s.x3??s.x2)-s.x2)*canvas.width, by=((s.y3??s.y2)-s.y2)*canvas.height;
    const dot=ax*bx+ay*by, ma=Math.hypot(ax,ay), mb=Math.hypot(bx,by);
    return Math.acos(Math.max(-1,Math.min(1,dot/(ma*mb||1))))*180/Math.PI;
  }
  function hexToRgba(hex,a){
    const h=hex.replace('#','');
    const r=parseInt(h.substring(0,2),16), g=parseInt(h.substring(2,4),16), b=parseInt(h.substring(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  canvas.addEventListener('pointerdown', e=>{
    if(!S.drawEnabled) return;
    const p=point(e);
    S.drawing=true;
    S.drawStart=Date.now();
    const h=hit(p);
    if(h){
      S.selected=h.id;
      S.drag={shape:h,last:p};
      setStatus('Move selected mark');
      draw(); return;
    }
    if(S.tool==='select'){
      S.selected=null;
      setStatus('Tap a mark to select it');
      draw(); return;
    }
    const id=Date.now()+Math.random();
    if(S.tool==='free') S.temp={id,type:'free',color:S.color,width:S.width,points:[p]};
    else if(S.tool==='angle') {
      if(S.angleDraft) S.temp={id,type:'angle',color:S.color,width:S.width,x1:S.angleDraft.x1,y1:S.angleDraft.y1,x2:S.angleDraft.x2,y2:S.angleDraft.y2,x3:p.x,y3:p.y};
      else S.temp={id,type:'line',angleSeed:true,color:S.color,width:S.width,x1:p.x,y1:p.y,x2:p.x,y2:p.y};
    }
    else S.temp={id,type:S.tool,color:S.color,width:S.width,x1:p.x,y1:p.y,x2:p.x,y2:p.y};
    draw(); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e=>{
    if(!S.drawing) return;
    const p=point(e);
    if(S.drag){
      const dx=p.x-S.drag.last.x, dy=p.y-S.drag.last.y;
      moveShape(S.drag.shape, dx, dy);
      S.drag.last=p;
      draw(); return;
    }
    if(S.temp){
      if(S.temp.type==='free') S.temp.points.push(p);
      else if(S.temp.type==='angle'){ S.temp.x3=p.x; S.temp.y3=p.y; }
      else { S.temp.x2=p.x; S.temp.y2=p.y; if(S.temp.type==='line' && S.snapLine && Date.now()-S.drawStart>380) snapLine(S.temp); }
      draw();
    }
    e.preventDefault();
  });
  canvas.addEventListener('pointerup', finishDraw);
  canvas.addEventListener('pointercancel', finishDraw);
  function finishDraw(){
    if(S.temp && S.temp.type==='line' && S.snapLine && Date.now()-S.drawStart>380) snapLine(S.temp);
    if(S.temp && !isDrawable(S.temp)){
      if(S.temp.angleSeed) setStatus('Drag a longer first angle line');
      S.temp=null;
    } else if(S.temp && S.temp.angleSeed){
      S.angleDraft={id:'angle-draft',type:'line',color:S.color,width:S.width,x1:S.temp.x1,y1:S.temp.y1,x2:S.temp.x2,y2:S.temp.y2};
      S.temp=null;
      setStatus('Draw the second angle line');
    } else if(S.temp){
      S.shapes.push(S.temp); S.selected=S.temp.id; S.temp=null; S.angleDraft=null;
    }
    S.drawing=false; S.drag=null; draw();
  }
  function snapLine(s){
    const dx=s.x2-s.x1, dy=s.y2-s.y1;
    if(Math.abs(dx)>Math.abs(dy)) s.y2=s.y1; else s.x2=s.x1;
  }

  document.addEventListener('click', e=>{
    const tool = e.target.closest('[data-tool]');
    if(tool){
      S.tool=tool.dataset.tool;
      S.angleDraft=null;
      S.temp=null;
      document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('is-active', b.dataset.tool===S.tool));
      setStatus(S.tool==='angle'?'Draw the first angle line':(tool.querySelector('small')?.textContent || S.tool));
      draw();
      return;
    }
    const color = e.target.closest('[data-color]');
    if(color){
      S.color=color.dataset.color;
      document.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('is-active', b.dataset.color===S.color));
      return;
    }
    const width = e.target.closest('[data-width]');
    if(width){
      S.width=Number(width.dataset.width)||5;
      document.querySelectorAll('[data-width]').forEach(b=>b.classList.toggle('is-active', Number(b.dataset.width)===S.width));
      return;
    }
    const speed = e.target.closest('[data-speed]');
    if(speed){
      setSpeed(Number(speed.dataset.speed)||1);
      if(speedMenu) speedMenu.hidden=true;
      e.preventDefault(); e.stopPropagation();
      return;
    }
    const action = e.target.closest('[data-fs-action]');
    if(action){
      const a=action.dataset.fsAction;
      e.preventDefault(); e.stopPropagation();
      handleFs(a);
    }
  }, true);

  function handleFs(a){
    if(a==='open') openEditor();
    if(a==='close') closeEditor();
    if(a==='toggle-tools') setDrawEnabled(!S.drawEnabled);
    if(a==='collapse-tools') collapseTools();
    if(a==='expand-tools') expandTools();
    if(a==='toggle-fit'){ S.fitSafe=!S.fitSafe; editor.classList.toggle('is-fit-safe',S.fitSafe); setTimeout(draw,60); updateLabels(); }
    if(a==='toggle-style'){ if(toolStyle) toolStyle.hidden=!toolStyle.hidden; updateLabels(); }
    if(a==='toggle-guides'){ S.guides=!S.guides; draw(); }
    if(a==='toggle-view'){ S.view=S.view==='DTL'?'FO':'DTL'; updateLabels(); }
    if(a==='delete'){ S.shapes=S.shapes.filter(s=>s.id!==S.selected); S.selected=null; draw(); }
    if(a==='undo'){ S.shapes.pop(); S.selected=null; draw(); }
    if(a==='clear'){ S.shapes=[]; S.selected=null; draw(); }
    if(a==='duplicate') duplicateSelected();
    if(a==='toggle-snap'){ S.snapLine=!S.snapLine; updateLabels(); }
    if(a==='speed-menu'){ if(speedMenu) speedMenu.hidden=!speedMenu.hidden; updateLabels(); }
    if(a==='back-frame') step(-1);
    if(a==='forward-frame') step(1);
    if(a==='play'){if(fsVideo.paused)fsVideo.play().catch(()=>setStatus('This video cannot be played'));else fsVideo.pause()}
    if(a==='snapshot') setStatus('Use Captures in the review to save phase images');
  }
  function setSpeed(sp){
    const idx=S.speeds.indexOf(sp);
    S.speedIndex=idx>=0?idx:S.speeds.findIndex(x=>x===1);
    fsVideo.playbackRate=sp;
    mainVideo.playbackRate=sp;
    updateLabels();
  }
  function duplicateSelected(){
    const s=S.shapes.find(x=>x.id===S.selected);
    if(!s) return setStatus('Select a mark first');
    const copy=JSON.parse(JSON.stringify(s));
    copy.id=Date.now()+Math.random();
    moveShape(copy,.035,.035);
    S.shapes.push(copy);
    S.selected=copy.id;
    draw();
  }
  function step(dir){
    fsVideo.pause();
    fsVideo.currentTime=Math.max(0,Math.min(fsVideo.duration||0,(fsVideo.currentTime||0)+dir/30));
  }
  function updateTime(){
    const t=fsVideo.currentTime||0, frame=Math.round(t*S.fps);
    fsTime.textContent=`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')} · frame ${frame}`;
    if(fsTimeline && fsVideo.duration) fsTimeline.value=Math.round((t/fsVideo.duration)*1000);
    updateLabels();
  }
  function updateLabels(){
    document.getElementById('fsGuidesState').textContent=S.guides?'ON':'OFF';
    document.getElementById('fsViewState').textContent=S.view;
    document.getElementById('fsUndoCount').textContent=S.shapes.length;
    const drawState=document.getElementById('fsDrawState');
    const styleState=document.getElementById('fsStyleState');
    const snapState=document.getElementById('fsSnapState');
    if(drawState) drawState.textContent=S.drawEnabled?'ON':'OFF';
    if(styleState) styleState.textContent=toolStyle && !toolStyle.hidden?'Close':'Open';
    if(snapState) snapState.textContent=S.snapLine?'Snap':'Free';
    if(fsFitState) fsFitState.textContent=S.fitSafe?'SAFE':'FULL';
    fsSpeed.textContent=S.speeds[S.speedIndex]+'x';
    if(speedMenu) speedMenu.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('is-active', Number(b.dataset.speed)===S.speeds[S.speedIndex]));
    if(fsPlayButton){ fsPlayButton.textContent=fsVideo.paused?'Play':'Pause'; fsPlayButton.classList.toggle('is-playing', !fsVideo.paused); }
    fsToolName.textContent=S.tool.charAt(0).toUpperCase()+S.tool.slice(1);
    editor.classList.toggle('is-draw-off', !S.drawEnabled);
    document.querySelectorAll('[data-fs-action="toggle-guides"]').forEach(b=>b.classList.toggle('is-on', S.guides));
    document.querySelectorAll('[data-fs-action="toggle-tools"]').forEach(b=>b.classList.toggle('is-on', S.drawEnabled));
    document.querySelectorAll('[data-fs-action="toggle-fit"]').forEach(b=>b.classList.toggle('is-on', S.fitSafe));
  }
  function setStatus(txt){ fsStatusText.textContent=txt; updateLabels(); }
  fsVideo.addEventListener('timeupdate', updateTime);
  fsVideo.addEventListener('play', updateLabels);
  fsVideo.addEventListener('pause', updateLabels);
  fsVideo.addEventListener('loadedmetadata', () => {
    const rate = fsVideo.getVideoPlaybackQuality ? fsVideo.getVideoPlaybackQuality().totalVideoFrames / Math.max(.001, fsVideo.duration || 1) : 30;
    S.fps = Number.isFinite(rate) && rate > 10 && rate < 240 ? Math.round(rate) : 30;
    updateTime();
  });
  fsTimeline.addEventListener('input', ()=>{ if(fsVideo.duration) fsVideo.currentTime=(+fsTimeline.value/1000)*fsVideo.duration; });
  window.addEventListener('resize', ()=>setTimeout(draw,120));

  document.addEventListener('pointerdown', e=>{
    if(e.target.closest('.panel-mini')) return;
    const h=e.target.closest('[data-drag-panel]');
    const broad=e.target.closest('.floating-panel');
    if(!h && (!broad || e.target.closest('button,input,select,textarea'))) return;
    const panel=h?document.getElementById(h.dataset.dragPanel):broad;
    const r=panel.getBoundingClientRect();
    S.panelDrag={panel,dx:e.clientX-r.left,dy:e.clientY-r.top};
    try{ (h||panel).setPointerCapture(e.pointerId); }catch(err){}
    e.preventDefault();
  }, true);
  document.addEventListener('pointermove', e=>{
    if(!S.panelDrag) return;
    const p=S.panelDrag.panel;
    const w=p.offsetWidth||120, h=p.offsetHeight||60;
    p.style.left=Math.max(6,Math.min(window.innerWidth-w-6,e.clientX-S.panelDrag.dx))+'px';
    p.style.top=Math.max(6,Math.min(window.innerHeight-h-6,e.clientY-S.panelDrag.dy))+'px';
    p.style.bottom='auto';
    e.preventDefault();
  }, true);
  document.addEventListener('pointerup', ()=>{ S.panelDrag=null; }, true);

  updateLabels();
})();
