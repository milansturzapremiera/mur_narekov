const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const esc = value => String(value ?? '').replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function actorDefaults(index, x, y) {
  return {id:uid(),name:`Postava ${index}`,src:'',widthM:3,startX:x,endX:x,pathY:y,moveStartSec:0,moveDurationSec:5,easing:'ease',facing:'right',animated:false,frames:5,fps:6,frameDirection:'horizontal'};
}

function sceneDefaults(x, y) {
  return {id:uid(),name:'Nová scénka',type:'scene',visibility:'always',startAt:'',startDelaySec:0,durationSec:20,repeatEvent:true,repeatEverySec:30,actors:[],cues:[],_defaultX:x,_defaultY:y};
}

export function mountSceneDirector({host,canvas,getEvents,getAvailableAssets,markDirty,uploadAsset,previewEventAt,stopEventPreview,getViewCenterX,getDefaultEventY,moveEventFromScreen,notify}) {
  let selectedSceneId=null,selectedActorId=null,previewTime=0,placingEndpoint=null;
  const scenes=()=>getEvents().filter(event=>event.type==='scene');
  const selectedScene=()=>scenes().find(scene=>scene.id===selectedSceneId);
  const selectedActor=()=>selectedScene()?.actors?.find(actor=>actor.id===selectedActorId);
  const availableAssets=()=>{
    const assets=getAvailableAssets?.();
    return Array.isArray(assets)?assets:[];
  };
  const pct=(value,duration)=>`${Math.max(0,Math.min(100,Number(value||0)/Math.max(1,duration)*100))}%`;

  function timeline(scene) {
    const duration=Math.max(1,Number(scene.durationSec)||20),actors=Array.isArray(scene.actors)?scene.actors:[],cues=Array.isArray(scene.cues)?scene.cues:[];
    return `<div class="dev-director-timeline" data-director-action="seek" role="slider" aria-label="Čas scénky" aria-valuemin="0" aria-valuemax="${duration}" aria-valuenow="${previewTime}">
      <div class="dev-director-ruler"><span>0 s</span><span>${Math.round(duration/2)} s</span><span>${duration} s</span></div>
      <i class="dev-director-playhead" style="--at:${pct(previewTime,duration)}"></i>
      ${actors.map(actor=>{const start=clamp(actor.moveStartSec,0,duration),length=clamp(actor.moveDurationSec,.1,duration-start);return `<div class="dev-director-track"><b>${esc(actor.name)}</b><span class="dev-director-move" style="--start:${pct(start,duration)};--length:${pct(length,duration)}"></span>${cues.filter(cue=>cue.actorId===actor.id).map(cue=>`<i class="dev-director-cue" title="${esc(cue.text)}" style="--at:${pct(cue.atSec,duration)}"></i>`).join('')}</div>`;}).join('')||'<p>Najprv pridaj postavu alebo asset.</p>'}
    </div>`;
  }

  function sceneList() {
    const list=scenes();
    return `<div class="dev-director-list">${list.map(scene=>`<button type="button" data-director-action="select-scene" data-scene-id="${scene.id}"><span>${esc(scene.name)}</span><small>${scene.actors?.length||0} assetov · ${scene.cues?.length||0} replík · ${Number(scene.durationSec)||20} s</small></button>`).join('')||'<p>Zatiaľ nemáš žiadnu scénku.</p>'}</div>`;
  }

  function actorEditor(scene, actor) {
    if(!actor)return '<p class="dev-director-empty">Vyber asset alebo pridaj nový.</p>';
    return `<div class="dev-director-actor-editor" data-actor-id="${actor.id}">
      <label>Názov<input name="actor.name" maxlength="60" value="${esc(actor.name)}"></label>
      <div class="dev-director-grid"><label>Štart X<input name="actor.startX" type="number" min="0" max="700" step=".1" value="${actor.startX}"></label><button type="button" data-director-action="place-start">⌖ Kliknúť do mapy</button><label>Cieľ X<input name="actor.endX" type="number" min="0" max="700" step=".1" value="${actor.endX}"></label><button type="button" data-director-action="place-end">⌖ Kliknúť do mapy</button></div>
      <div class="dev-director-grid is-three"><label>Poloha Y<input name="actor.pathY" type="number" min="-3" max="5" step=".01" value="${actor.pathY}"></label><label>Veľkosť<input name="actor.widthM" type="number" min=".2" max="30" step=".1" value="${actor.widthM}"></label><label>Otočenie<select name="actor.facing"><option value="right" ${actor.facing!=='left'?'selected':''}>Doprava</option><option value="left" ${actor.facing==='left'?'selected':''}>Doľava</option></select></label></div>
      <div class="dev-director-grid is-three"><label>Pohyb od<input name="actor.moveStartSec" type="number" min="0" max="${scene.durationSec}" step=".1" value="${actor.moveStartSec}"><span>s</span></label><label>Trvanie pohybu<input name="actor.moveDurationSec" type="number" min=".1" max="${scene.durationSec}" step=".1" value="${actor.moveDurationSec}"><span>s</span></label><label>Priebeh<select name="actor.easing"><option value="linear" ${actor.easing==='linear'?'selected':''}>Rovnomerný</option><option value="ease" ${actor.easing!=='linear'?'selected':''}>Plynulý</option></select></label></div>
      <label class="dev-director-check"><input name="actor.animated" type="checkbox" ${actor.animated?'checked':''}><span>Animovaný sprite sheet</span></label>
      <div class="dev-director-grid is-three" ${actor.animated?'':'hidden'} data-actor-animation><label>Políčka<input name="actor.frames" type="number" min="2" max="60" value="${actor.frames||5}"></label><label>FPS<input name="actor.fps" type="number" min=".5" max="30" step=".5" value="${actor.fps||6}"></label><label>Smer<select name="actor.frameDirection"><option value="horizontal" ${actor.frameDirection!=='vertical'?'selected':''}>Vodorovne</option><option value="vertical" ${actor.frameDirection==='vertical'?'selected':''}>Zvislo</option></select></label></div>
      <button type="button" class="dev-director-danger" data-director-action="delete-actor">Odstrániť asset zo scénky</button>
    </div>`;
  }

  function cueEditor(scene) {
    const actors=scene.actors||[],cues=scene.cues||[];
    return `<div class="dev-director-cues"><header><strong>Repliky</strong><button type="button" data-director-action="add-cue" ${actors.length?'':'disabled'}>＋ Pridať repliku</button></header>${cues.map((cue,index)=>`<div class="dev-director-cue-row" data-cue-id="${cue.id}"><b>${index+1}</b><select name="cue.actorId">${actors.map(actor=>`<option value="${actor.id}" ${cue.actorId===actor.id?'selected':''}>${esc(actor.name)}</option>`).join('')}</select><label>Čas<input name="cue.atSec" type="number" min="0" max="${scene.durationSec}" step=".1" value="${cue.atSec}"><span>s</span></label><label>Trvanie<input name="cue.durationSec" type="number" min=".5" max="30" step=".1" value="${cue.durationSec}"><span>s</span></label><textarea name="cue.text" rows="2" maxlength="240" placeholder="Čo má povedať…">${esc(cue.text)}</textarea><button type="button" data-director-action="delete-cue" aria-label="Odstrániť repliku">×</button></div>`).join('')||'<p class="dev-director-empty">Repliky pridáš na presný čas. Bublina sa bude držať pri zvolenom assete.</p>'}</div>`;
  }

  function detail(scene) {
    scene.actors ||= [];scene.cues ||= [];
    if(selectedActorId&&!scene.actors.some(actor=>actor.id===selectedActorId))selectedActorId=scene.actors[0]?.id||null;
    const actor=selectedActor(),library=availableAssets();
    return `<div class="dev-director-detail">
      <header class="dev-director-detail-head"><button type="button" data-director-action="back">← Scénky</button><strong>${esc(scene.name)}</strong><button type="button" data-director-action="delete-scene">Odstrániť</button></header>
      <div class="dev-director-scene-settings"><label>Názov scénky<input name="scene.name" maxlength="60" value="${esc(scene.name)}"></label><div class="dev-director-grid is-three"><label>Dĺžka<input name="scene.durationSec" type="number" min="1" max="600" step="1" value="${scene.durationSec}"><span>s</span></label><label>Opakovanie<input name="scene.repeatEverySec" type="number" min="1" max="3600" step="1" value="${scene.repeatEverySec}"><span>s</span></label><label>Zobrazenie<select name="scene.visibility"><option value="always" ${scene.visibility==='always'?'selected':''}>Vždy</option><option value="day" ${scene.visibility==='day'?'selected':''}>Deň</option><option value="night" ${scene.visibility==='night'?'selected':''}>Noc</option></select></label></div><label class="dev-director-check"><input name="scene.repeatEvent" type="checkbox" ${scene.repeatEvent!==false?'checked':''}><span>Opakovať scénku</span></label></div>
      <div class="dev-director-transport"><button type="button" data-director-action="play">▶ Prehrať od začiatku</button><button type="button" data-director-action="stop">■ Stop</button><label><input name="sceneTime" type="range" min="0" max="${scene.durationSec}" step=".1" value="${previewTime}"><output>${previewTime.toFixed(1)} s</output></label></div>
      ${timeline(scene)}
      <section class="dev-director-actors"><header><strong>Assety v scénke</strong><div class="dev-director-asset-source"><label class="dev-director-library"><small>Existujúci asset</small><select class="dev-director-existing-asset" ${library.length?'':'disabled'}>${library.length?library.map(item=>`<option value="${esc(item.src)}">${esc(item.name)} · ${esc(item.source)}</option>`).join(''):'<option>Knižnica je prázdna</option>'}</select></label><button type="button" data-director-action="add-existing-asset" ${library.length?'':'disabled'}>Použiť</button><label class="dev-director-upload"><input class="dev-director-actor-file" type="file" accept="image/png,image/jpeg,image/webp"><span>＋ Nahrať nový</span></label></div></header><div class="dev-director-actor-tabs">${scene.actors.map(actorItem=>`<button type="button" data-director-action="select-actor" data-actor-id="${actorItem.id}" aria-pressed="${actorItem.id===selectedActorId}">${esc(actorItem.name)}</button>`).join('')}</div>${actorEditor(scene,actor)}</section>
      ${cueEditor(scene)}
    </div>`;
  }

  function render() {
    const scene=selectedScene();
    host.innerHTML=`<section class="dev-director"><header class="dev-director-head"><div><strong>REŽISÉR SCÉNOK</strong><small>Assety · pohyb · presné repliky</small></div><button type="button" data-director-action="new-scene">＋ Nová scénka</button></header>${scene?detail(scene):sceneList()}</section>`;
  }

  function changed({renderNow=false,preview=true}={}) { markDirty();if(preview&&selectedSceneId)previewEventAt(selectedSceneId,previewTime);if(renderNow)render(); }

  host.addEventListener('click',event=>{
    const button=event.target.closest('[data-director-action]');if(!button)return;const action=button.dataset.directorAction,scene=selectedScene();
    if(action==='new-scene'){const created=sceneDefaults(Number(getViewCenterX().toFixed(2)),getDefaultEventY());getEvents().push(created);selectedSceneId=created.id;selectedActorId=null;previewTime=0;changed({renderNow:true});notify('Scénka vytvorená. Pridaj prvý asset.');}
    else if(action==='select-scene'){selectedSceneId=button.dataset.sceneId;selectedActorId=selectedScene()?.actors?.[0]?.id||null;previewTime=0;render();}
    else if(action==='back'){stopEventPreview(scene?.id);selectedSceneId=null;selectedActorId=null;render();}
    else if(action==='delete-scene'&&scene){const list=getEvents(),index=list.indexOf(scene);if(index>=0)list.splice(index,1);stopEventPreview(scene.id);selectedSceneId=null;selectedActorId=null;changed({renderNow:true,preview:false});}
    else if(action==='select-actor'){selectedActorId=button.dataset.actorId;render();}
    else if(action==='add-existing-asset'&&scene){const src=host.querySelector('.dev-director-existing-asset')?.value,asset=availableAssets().find(item=>item.src===src);if(!asset){notify('Vyber existujúci asset.');return;}const actor=actorDefaults(scene.actors.length+1,Number(getViewCenterX().toFixed(2)),getDefaultEventY());actor.name=String(asset.name||actor.name).slice(0,60);actor.src=asset.src;scene.actors.push(actor);selectedActorId=actor.id;changed({renderNow:true});previewEventAt(scene.id,previewTime);notify('Existujúci asset bol použitý bez vytvorenia kópie súboru.');}
    else if((action==='place-start'||action==='place-end')&&selectedActor()){placingEndpoint=action==='place-start'?'start':'end';document.documentElement.classList.add('dev-director-placing');previewTime=placingEndpoint==='start'?0:Math.min(Number(scene.durationSec)||20,Number(selectedActor().moveStartSec||0)+Number(selectedActor().moveDurationSec||0));previewEventAt(scene.id,previewTime);notify(`Klikni do sveta a umiestni ${placingEndpoint==='start'?'štart':'cieľ'} assetu.`);}
    else if(action==='delete-actor'&&scene){scene.actors=scene.actors.filter(actor=>actor.id!==selectedActorId);scene.cues=scene.cues.filter(cue=>cue.actorId!==selectedActorId);selectedActorId=scene.actors[0]?.id||null;changed({renderNow:true});}
    else if(action==='add-cue'&&scene?.actors?.length){const actorId=selectedActorId||scene.actors[0].id;scene.cues.push({id:uid(),actorId,atSec:Number(previewTime.toFixed(1)),durationSec:3,text:'Nová replika',widthM:5,fontSize:20,textColor:'#25211d',backgroundColor:'#f2eadb'});changed({renderNow:true});}
    else if(action==='delete-cue'&&scene){const id=button.closest('[data-cue-id]')?.dataset.cueId;scene.cues=scene.cues.filter(cue=>cue.id!==id);changed({renderNow:true});}
    else if(action==='play'&&scene){previewTime=0;previewEventAt(scene.id,0);render();notify('Náhľad scénky beží od začiatku.');}
    else if(action==='stop'&&scene){stopEventPreview(scene.id);notify('Náhľad scénky zastavený.');}
    else if(action==='seek'&&scene){const rect=button.getBoundingClientRect();previewTime=clamp((event.clientX-rect.left)/rect.width*scene.durationSec,0,scene.durationSec);previewEventAt(scene.id,previewTime);render();}
  });

  host.addEventListener('input',event=>{
    const scene=selectedScene();if(!scene)return;const name=event.target.name;
    if(name==='sceneTime'){previewTime=clamp(event.target.value,0,scene.durationSec);event.target.nextElementSibling.textContent=`${previewTime.toFixed(1)} s`;previewEventAt(scene.id,previewTime);const playhead=host.querySelector('.dev-director-playhead');if(playhead)playhead.style.setProperty('--at',pct(previewTime,scene.durationSec));return;}
    if(name?.startsWith('scene.')){const field=name.slice(6);scene[field]=event.target.type==='checkbox'?event.target.checked:event.target.type==='number'?clamp(event.target.value,field==='durationSec'?1:0,field==='durationSec'?600:3600):event.target.value;if(field==='durationSec')scene.repeatEverySec=Math.max(scene.durationSec,scene.repeatEverySec);changed();return;}
    const actor=selectedActor();if(name?.startsWith('actor.')&&actor){const field=name.slice(6),ranges={startX:[0,700],endX:[0,700],pathY:[-3,5],widthM:[.2,30],moveStartSec:[0,scene.durationSec],moveDurationSec:[.1,scene.durationSec],frames:[2,60],fps:[.5,30]};actor[field]=event.target.type==='checkbox'?event.target.checked:ranges[field]?clamp(event.target.value,...ranges[field]):event.target.value;if(field==='frames')actor.frames=Math.round(actor.frames);if(field==='animated')host.querySelector('[data-actor-animation]').hidden=!actor.animated;changed();return;}
    const cueRow=event.target.closest('[data-cue-id]'),cue=scene.cues.find(item=>item.id===cueRow?.dataset.cueId);if(name?.startsWith('cue.')&&cue){const field=name.slice(4);cue[field]=event.target.type==='number'?clamp(event.target.value,field==='atSec'?0:.5,field==='atSec'?scene.durationSec:30):event.target.value;changed();}
  });

  host.addEventListener('change',async event=>{
    if(event.target.matches('.dev-director-actor-file')){const file=event.target.files?.[0],scene=selectedScene();if(!file||!scene)return;event.target.disabled=true;try{const src=await uploadAsset(file,`scene-${file.name.replace(/\.[^.]+$/,'')}`),actor=actorDefaults(scene.actors.length+1,Number(getViewCenterX().toFixed(2)),getDefaultEventY());actor.name=(file.name.replace(/\.[^.]+$/,'')||actor.name).slice(0,60);actor.src=src;scene.actors.push(actor);selectedActorId=actor.id;changed({renderNow:true});previewEventAt(scene.id,previewTime);notify('Asset bol pridaný do scénky.');}catch(error){notify(error.message);}finally{event.target.disabled=false;}}
    else if(event.target.name&&event.target.name!=='sceneTime')render();
  });

  canvas.addEventListener('pointerdown',event=>{
    if(!placingEndpoint||!selectedScene()||!selectedActor())return;
    event.preventDefault();event.stopImmediatePropagation();const point=moveEventFromScreen(event.clientX,event.clientY),actor=selectedActor();
    if(placingEndpoint==='start')actor.startX=Number(clamp(point.x,0,700).toFixed(2));else actor.endX=Number(clamp(point.x,0,700).toFixed(2));actor.pathY=Number(clamp(point.y,-3,5).toFixed(3));
    placingEndpoint=null;document.documentElement.classList.remove('dev-director-placing');changed({renderNow:true});notify('Bod assetu bol umiestnený.');
  },true);
  addEventListener('keydown',event=>{if(event.key==='Escape'&&placingEndpoint){event.preventDefault();event.stopImmediatePropagation();placingEndpoint=null;document.documentElement.classList.remove('dev-director-placing');notify('Umiestňovanie zrušené.');}});

  render();
  return {render};
}
