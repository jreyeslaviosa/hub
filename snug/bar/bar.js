import * as T from '../three.module.js';
const $=id=>document.getElementById(id), stage=$('stage');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true})}catch(e){$('error').hidden=false;throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#e8e1d4');
const camera=new T.PerspectiveCamera(38,1,.1,1500);
scene.add(new T.HemisphereLight('#fff3df','#826e60',2.3));
const sun=new T.DirectionalLight('#ffffff',2);sun.position.set(-130,190,170);scene.add(sun);
const grid=new T.GridHelper(420,21,'#b0a694','#cbc2b3');grid.position.y=-.6;scene.add(grid);
const palette={frame:['2×4 framing','#bc894e'],brace:['¾″ plywood bracing','#d7bc83'],skin:['Timber face and ends','#87512e'],top:['Double plywood top','#ad7545'],shelf:['Staff-side shelving','#b58a62'],fix:['Attachment details','#466a78']};
const materials={};const groups={};
function grain(color){const cn=document.createElement('canvas');cn.width=256;cn.height=256;const ctx=cn.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);for(let i=0;i<105;i++){ctx.strokeStyle=i%3?'#41231028':'#ffe5b53c';ctx.beginPath();ctx.moveTo(i*2.49,0);ctx.bezierCurveTo(i*2.49+4,100,i*2.49-5,180,i*2.49,256);ctx.stroke()}const map=new T.CanvasTexture(cn);map.colorSpace=T.SRGBColorSpace;return map}
for(const [key,[name,color]] of Object.entries(palette)){materials[key]=new T.MeshStandardMaterial(key==='fix'?{color,metalness:.35,roughness:.45}:{map:grain(color),roughness:.84});groups[key]=[]}
const model=new T.Group();scene.add(model);const edgeMat=new T.LineBasicMaterial({color:'#4d3528',transparent:true,opacity:.42});
function part(key,x,y,z,w,h,d,offset=[0,0,0],i=1){
 const geom=new T.BoxGeometry(w,h,d), m=new T.Mesh(geom,materials[key]);m.position.set(x,y,z);m.add(new T.LineSegments(new T.EdgesGeometry(geom),edgeMat));model.add(m);groups[key].push({m,home:m.position.clone(),offset:new T.Vector3(...offset),i});return m
}
function fastener(x,y,z,axis,i,offset){const m=new T.Mesh(new T.CylinderGeometry(.39,.39,.22,12),materials.fix);m.position.set(x,y,z);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;model.add(m);groups.fix.push({m,home:m.position.clone(),offset:new T.Vector3(...offset),i});}
for(let i=0;i<3;i++){
 const cx=57*(i-1);
 for(const y of [1.75,38.75]){
  for(const z of [-12.0,12.0])part('frame',cx,y,z,57,3.5,1.5,undefined,i);
  for(const dx of [-27.75,0,27.75])part('frame',cx+dx,y,0,1.5,3.5,22.5,undefined,i);
 }
 for(const dx of [-26.75,0,26.75])for(const z of [-11.5,11.5])part('frame',cx+dx,20.25,z,3.5,33.5,1.5,undefined,i);
 {
  for(const level of [6,23]){
   part('shelf',cx,level,0,49,.75,20,[0,0,-14],i);
   for(const dx of [-25,25])part('shelf',cx+dx,level-1.125,0,1.5,1.5,23,[0,0,-14],i);
  }
 }
 for(const dx of [-18,18])part('brace',cx+dx,7,-12.8,15,7,.75,[0,0,-14],i);
 part('brace',cx,20.25,12.75,57,40.5,.75,[0,0,16],i);
 if(i!==1)part('brace',cx+(i===0?-28:28),20.25,0,.75,40.5,27,[i===0?-17:17,0,0],i);
 for(let j=0;j<12;j++)part('skin',cx-28.5+(j+.5)*4.75,20.25,13.25,4.66,40.5,.5,[0,0,31],i);
 if(i!==1)for(let j=0;j<6;j++)part('skin',cx+(i===0?-28.25:28.25),20.25,-13.5+(j+.5)*4.5,.5,40.5,4.41,[i===0?-30:30,0,0],i);
 part('top',cx,40.875,1.5,57,.75,32,[0,25,0],i);
 part('top',cx,41.625,1.5,57,.75,32,[0,37,0],i);
 for(const dx of [-25,0,25])for(const y of [2,38])fastener(cx+dx,y,13.22,'z',i,[0,0,17]);
 for(const dx of [-24,24])for(const z of [-9,9])fastener(cx+dx,40.43,z,'y',i,[0,23,0]);
}
for(const seam of [-28.5,28.5])for(const z of [-11.5,11.5])for(const y of [10,31]){
 const pin=new T.Mesh(new T.CylinderGeometry(.20,.20,7,12),materials.fix);pin.rotation.z=Math.PI/2;pin.position.set(seam,y,z);model.add(pin);groups.fix.push({m:pin,home:pin.position.clone(),offset:new T.Vector3(0,0,0),i:1,seam:true});
 for(const x of [seam-3.5,seam+3.5])fastener(x,y,z,'x',1,[0,0,0]);
}
const stages=[
 ['01 · Finished bar','Three 57″ modules form one 171″ counter. All three modules have two staff-side shelves. The top projects 4″ on the guest side and 1″ on the staff side.',['frame','brace','skin','top','shelf'],0,'front'],
 ['02 · Build the frames','Build three matching 2×4 frames with top and bottom rectangles, corner posts and centre supports. Blue pins show where adjacent modules bolt through paired posts.',['frame','fix'],22,'back'],
 ['03 · Add plywood bracing','Fasten plywood to the guest face and exposed ends into the frame. Brace the open staff side. The blue dots show the attachment principle; confirm the screw schedule with the builder.',['frame','brace','fix'],48,'front'],
 ['04 · Attach the timber','The timber finish goes over the structural plywood face and ends. Keep module joints accessible so the bar can come apart after the installation.',['frame','brace','skin'],76,'front'],
 ['05 · Staff-side storage','Two shelves in each of the three bays provide storage across the bar. The short plywood pieces below are rear braces; the long rails at floor level are part of the 2×4 base frame. Toggle Plywood bracing to see the difference.',['frame','brace','skin','top','shelf'],0,'back'],
 ['06 · Fit the countertop','Laminate two nominal ¾″ plywood layers for each top section, seal the surface, and fasten from below through the frame. Align the three top sections and cover the exposed edge with solid timber.',['frame','brace','skin','top','fix'],90,'front']
];
const checks={};const buttons=[];
for(const [k,[name,color]] of Object.entries(palette)){
 const l=document.createElement('label');l.className='key';const check=document.createElement('input');check.type='checkbox';check.onchange=update;checks[k]=check;l.append(check);const s=document.createElement('span');s.className='swatch';s.style.setProperty('--sw',color);l.append(s,name);$('layers').append(l);
}
let yaw=.32,elev=.33,radius=290;const target=new T.Vector3(0,25,0);
function view(which){[yaw,elev]=({front:[.32,.33],back:[Math.PI+.34,.37],end:[Math.PI/2,.30],top:[0,1.54]})[which];render()}
for(const b of $('views').querySelectorAll('button'))b.onclick=()=>view(b.dataset.view);
function update(){const n=+$('explode').value/100;$('amount').value=Math.round(n*100)+'%';target.y=24+n*13;
 for(const [k,list] of Object.entries(groups))for(const p of list){p.m.visible=checks[k].checked;p.m.position.copy(p.home).addScaledVector(p.offset,n);if(!p.seam)p.m.position.x+=(p.i-1)*14*n}
 render()
}
function select(i){const [_,note,visible,n,angle]=stages[i];for(const [k,c] of Object.entries(checks))c.checked=visible.includes(k);buttons.forEach((b,j)=>b.setAttribute('aria-pressed',j===i));$('note').textContent=note;$('explode').value=n;view(angle);update()}
stages.forEach(([name],i)=>{const b=document.createElement('button');b.className='step';b.textContent=name;b.onclick=()=>select(i);const row=document.createElement('div');row.className='row';row.append(b);$('steps').append(row);buttons.push(b)});
function render(){const ce=Math.cos(elev), aspect=camera.aspect;const d=radius*Math.max(1,1.1/aspect);camera.position.set(target.x+d*ce*Math.sin(yaw),target.y+d*Math.sin(elev),target.z+d*ce*Math.cos(yaw));camera.lookAt(target);renderer.render(scene,camera)}
new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);render()}).observe(stage);
$('explode').oninput=update;
const el=renderer.domElement;let drag=null;el.onpointerdown=e=>{drag=[e.clientX,e.clientY];el.setPointerCapture(e.pointerId)};el.onpointerup=el.onpointercancel=()=>{drag=null};el.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.009;elev=Math.max(-.12,Math.min(1.55,elev+(e.clientY-drag[1])*.009));drag=[e.clientX,e.clientY];render()};
el.addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(105,Math.min(560,radius*Math.exp(e.deltaY*.001)));render()},{passive:false});select(4);
