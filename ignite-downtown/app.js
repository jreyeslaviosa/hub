import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import locations from './locations.js';

const $ = selector => document.querySelector(selector);
const viewEl = $('#view');
const statusEl = $('#status');
const partEl = $('#part');
const sheetEl = $('#sheet');
const listEl = $('#site-list');
const marksButton = $('#toggle-marks');
const lightbox = $('#lightbox');

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewEl.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--vellum').trim());
scene.add(new THREE.HemisphereLight(0xffffff, 0x8d949c, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.9);
sun.position.set(-0.6, 1, 0.9);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.maxPolarAngle = Math.PI / 2 - 0.02; // stay above the ground

function resize() {
  const { clientWidth: w, clientHeight: h } = viewEl;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewEl);
resize();

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// ---------- model loading ----------
let model = null;
let subject = null;      // bounding box of everything except the ground slab
let showMarks = true;
let loadCount = 0;

const isMark = mesh => /OUTLINE|MARKER/i.test(mesh.name) || /^(red|marker)$/.test(mesh.material.name);
const isGround = mesh => /^ground$/i.test(mesh.name);

function disposeModel() {
  if (!model) return;
  scene.remove(model);
  model.traverse(node => {
    if (!node.isMesh) return;
    node.geometry.dispose();
    node.material.map?.dispose();
    node.material.dispose();
  });
  model = null;
}

function prepare(object) {
  subject = new THREE.Box3();
  object.traverse(node => {
    if (!node.isMesh) return;
    if (Array.isArray(node.material)) node.material = node.material[0];
    const source = node.material;
    if (/^(red|marker)$/.test(source.name)) {
      // frames and dimension markers stay at full strength from every angle
      node.material = new THREE.MeshBasicMaterial({ color: source.color, name: source.name });
    } else {
      node.material = new THREE.MeshLambertMaterial({
        color: source.color, map: source.map, name: source.name, side: THREE.DoubleSide
      });
    }
    node.userData.mark = isMark(node);
    node.visible = showMarks || !node.userData.mark;
    if (!isGround(node)) subject.expandByObject(node);
  });
}

function frame(direction) {
  if (!subject || subject.isEmpty()) return;
  const sphere = subject.getBoundingSphere(new THREE.Sphere());
  const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = (sphere.radius / Math.sin(Math.min(vertical, horizontal))) * 1.02;
  controls.target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction.clone().normalize(), distance);
  controls.minDistance = sphere.radius * 0.08;
  controls.maxDistance = distance * 4;
  controls.update();
}
const ANGLED = new THREE.Vector3(0.62, 0.34, 1);
const FRONT = new THREE.Vector3(0, 0.04, 1);

async function load(site) {
  const ticket = ++loadCount;
  statusEl.textContent = 'Loading ' + site.name + '…';
  partEl.hidden = true;
  disposeModel();
  try {
    const materials = await new MTLLoader().setPath(site.folder).loadAsync(site.mtl);
    materials.preload();
    const object = await new OBJLoader().setMaterials(materials).setPath(site.folder).loadAsync(site.obj);
    if (ticket !== loadCount) return; // another location was picked meanwhile
    prepare(object);
    model = object;
    scene.add(model);
    frame(ANGLED);
    statusEl.textContent = '';
  } catch (error) {
    if (ticket !== loadCount) return;
    console.error(error);
    statusEl.textContent = 'Could not load the model for ' + site.name +
      '. Check the folder and file names for this location in locations.js.';
  }
}

// ---------- view controls ----------
$('#view-front').addEventListener('click', () => frame(FRONT));
$('#view-angle').addEventListener('click', () => frame(ANGLED));
marksButton.addEventListener('click', () => {
  showMarks = !showMarks;
  marksButton.setAttribute('aria-pressed', String(showMarks));
  model?.traverse(node => { if (node.userData.mark) node.visible = showMarks; });
});

// ---------- name of the part under the pointer ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoverQueued = false;

function partName(name) {
  return name
    .replace(/^MARKER_/, '')
    .replace(/_/g, ' ')
    .replace(/\b[A-Z]{3,}\b/g, word => word[0] + word.slice(1).toLowerCase())
    .replace(/(\d)(m|ft)\b/g, '$1 $2')
    .replace(/ UV$/i, '');
}

renderer.domElement.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || event.buttons || !model || hoverQueued) {
    if (event.buttons) partEl.hidden = true;
    return;
  }
  hoverQueued = true;
  requestAnimationFrame(() => {
    hoverQueued = false;
    const box = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(model, true).find(h => h.object.visible && !isGround(h.object));
    partEl.hidden = !hit;
    if (hit) partEl.textContent = partName(hit.object.name);
  });
});
renderer.domElement.addEventListener('pointerleave', () => { partEl.hidden = true; });

// ---------- information sheet ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function feet(m) {
  let inches = Math.round(m / 0.0254);
  const ft = Math.floor(inches / 12);
  inches -= ft * 12;
  return ft ? `${ft}′ ${inches}″` : `${inches}″`;
}

function renderSheet(site) {
  sheetEl.replaceChildren(
    el('p', 'code', site.code),
    el('h1', '', site.name),
    el('p', 'place', site.place),
    el('p', 'summary', site.summary)
  );

  if (site.measurements?.length) {
    sheetEl.append(el('h2', '', 'Measurements'));
    const table = el('table', 'dims');
    for (const row of site.measurements) {
      const tr = el('tr');
      const th = el('th', '', row.label);
      th.scope = 'row';
      if (row.status === 'published') th.append(el('span', 'pub', 'published'));
      tr.append(th, el('td', 'm', row.m.toFixed(2) + ' m'), el('td', 'ft', feet(row.m)));
      table.append(tr);
    }
    sheetEl.append(table);
    const published = site.measurements.some(row => row.status === 'published');
    sheetEl.append(el('p', 'basis',
      (published ? 'Figures not marked published are estimates. ' : 'All figures are estimates. ') + (site.basis || '')));
  }

  if (site.drawings?.length) {
    sheetEl.append(el('h2', '', site.drawings.length > 1 ? 'Drawings' : 'Drawing'));
    const list = el('div', 'drawings');
    for (const drawing of site.drawings) {
      const button = el('button');
      button.type = 'button';
      const img = el('img');
      img.src = site.folder + drawing.src;
      img.alt = '';
      img.loading = 'lazy';
      button.append(img, el('span', '', drawing.title));
      button.addEventListener('click', () => {
        const full = lightbox.querySelector('img');
        full.src = img.src;
        full.alt = drawing.title + ', ' + site.name;
        lightbox.showModal();
      });
      list.append(button);
    }
    sheetEl.append(list);
  }
  sheetEl.scrollTop = 0;
}

lightbox.addEventListener('click', event => {
  if (event.target === lightbox) lightbox.close(); // click outside the drawing
});

// ---------- location list ----------
for (const site of locations) {
  const item = el('li');
  const button = el('button');
  button.type = 'button';
  button.dataset.id = site.id;
  button.append(el('span', 'code', site.code), el('span', 'name', site.name));
  button.addEventListener('click', () => { location.hash = site.id; });
  item.append(button);
  listEl.append(item);
}

let current = null;
function select() {
  const site = locations.find(s => s.id === location.hash.slice(1)) || locations[0];
  if (!site || site === current) return;
  current = site;
  for (const button of listEl.querySelectorAll('button')) {
    if (button.dataset.id === site.id) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
  document.title = 'IGNITE 2027 Downtown: ' + site.name;
  renderSheet(site);
  load(site);
}
addEventListener('hashchange', select);

if (locations.length) select();
else statusEl.textContent = 'No locations yet. Add one to locations.js.';
