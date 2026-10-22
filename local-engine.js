/* The app's only automatic marker. All decoding and inference stays on device. */
(()=>{
  'use strict';const V=SwingLabVideo,C=MarkingCore,base=new URL('./',document.currentScript.src),prepared=new WeakMap();
  const id='local-mark-v0.2';let modelPromise;
  async function prepare(file,signal){
    if(!file?.size||file.size>150*1024*1024)throw Error('Choose a video smaller than 150 MB.');
    if(prepared.has(file))return prepared.get(file);
    const resource=await V.open(file,signal);
    try{const bytes=await file.arrayBuffer();if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join(''),duration=resource.video.duration;
      const result={sha256,duration,timing:V.timing(bytes,duration),width:resource.video.videoWidth,height:resource.video.videoHeight};prepared.set(file,result);return result;
    }finally{resource.close()}
  }
  async function sample(video,count,start,end,size,timing,signal,onProgress,profile){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d',{willReadFrequently:true}),side=Math.min(video.videoWidth,video.videoHeight),x=(video.videoWidth-side)/2,y=(video.videoHeight-side)/2,frames=[],times=[],motion=[];let previous;
    for(let i=0;i<count;i++){const target=Math.max(0,Math.min(video.duration-.001,start+(end-start)*i/(count-1)));await V.seek(video,target,signal);ctx.drawImage(video,x,y,side,side,0,0,size,size);const rgba=ctx.getImageData(0,0,size,size).data,index=V.frameIndex(timing,target),timestamp=index==null?target:timing.times[index];
      if(profile){let sum=0,sum2=0,diff=0;const gray=new Float32Array(size*size);for(let p=0;p<gray.length;p++){const g=.299*rgba[p*4]+.587*rgba[p*4+1]+.114*rgba[p*4+2];gray[p]=g;sum+=g;sum2+=g*g;if(previous)diff+=Math.abs(g-previous[p])}motion.push({time:target,motion:previous?diff/gray.length:0,variance:sum2/gray.length-(sum/gray.length)**2});previous=gray}else frames.push(rgba.buffer);
      times.push(timestamp);onProgress?.(profile?'Finding the swing on this device…':'Reading the swing frames…',Math.round((profile?0:30)+i/count*30));
    }return {frames,times,profile:motion};
  }
  function run(samples,signal,onProgress){return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./lab/candidate-worker.js',base)),job=crypto.randomUUID();let timer;
    const clean=()=>{clearTimeout(timer);worker.terminate();signal?.removeEventListener('abort',cancel)},cancel=()=>{clean();reject(new DOMException('Cancelled','AbortError'))};signal?.addEventListener('abort',cancel,{once:true});timer=setTimeout(()=>{clean();reject(Error('The local marker exceeded two minutes.'))},120000);
    worker.onmessage=e=>{if(e.data.id!==job)return;if(e.data.type==='progress'){onProgress?.(`Marking on this device: ${e.data.value}/48 images…`,60+e.data.value/48*40);return}clean();e.data.type==='error'?reject(Error(e.data.message)):resolve(e.data.result)};worker.onerror=()=>{clean();reject(Error('The local marker could not start. Reconnect once to download its resources.'))};if(signal?.aborted)return cancel();worker.postMessage({id:job,type:'analyze',...samples},samples.frames);
  })}
  async function analyze(file,{signal,onProgress,view='DTL'}={}){
    const metadata=await prepare(file,signal);if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    if(!modelPromise)modelPromise=fetch(new URL('./lab/models/model.json',base)).then(r=>{if(!r.ok)throw Error('Model metadata unavailable.');return r.json()}).catch(e=>{modelPromise=null;throw e});const model=await modelPromise;
    const common={id,protocol:C.PROTOCOL,checkpointSha256:model.checkpointSha256,modelFiles:model.files,preprocessing:'browser-pts-v2',videoSha256:metadata.sha256,duration:metadata.duration,timing:metadata.timing,view,createdAt:new Date().toISOString()};
    if(String(view).toLowerCase()!=='dtl')return {...common,status:'unsupported-view',phases:{},note:'This marker is currently validated only for down-the-line videos. Manual marking remains available.'};
    const resource=await V.open(file,signal);
    try{const coarse=await sample(resource.video,96,0,metadata.duration,96,metadata.timing,signal,onProgress,true),window=C.motionWindow(coarse.profile,metadata.duration);if(window.status==='rejected')return {...common,status:'rejected',phases:{},window,note:window.reason};const samples=await sample(resource.video,48,window.start,window.end,144,metadata.timing,signal,onProgress,false),result=await run({frames:samples.frames,times:samples.times,window},signal,onProgress);
      if(!C.PHASES.every(p=>Number.isFinite(result.phases[p.id]))||C.PHASES.some((p,i)=>i&&result.phases[p.id]<=result.phases[C.PHASES[i-1].id]))throw Error('The clip does not contain enough distinct frames for ordered phase proposals.');
      return {...result,...common,status:'needs-review',sampleTimes:samples.times,note:'Local proposals require visual confirmation. No video was uploaded.'};
    }finally{resource.close()}
  }
  globalThis.SwingLabLocal={id,prepare,analyze};
})();
