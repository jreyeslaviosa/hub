import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import locations, { projectorModels, power } from './locations.js';

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

// ---------- projector power plan ----------
const MODES = [
  ['max', 'Full power'],
  ['normal', 'Normal'],
  ['eco', 'Eco'],
  ['standby', 'Standby']
];
const number = n => Math.round(n).toLocaleString('en-US');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const voltsOf = model => model.volts || power.volts;
const byVolts = map => [...map.entries()].sort((a, b) => a[0] - b[0]);

// How many projectors of one model fit on a circuit of `breaker` amps, kept to the continuous limit.
const perCircuit = (model, breaker) =>
  Math.floor((breaker * power.continuousShare) / (model.watts.max / voltsOf(model)));

function planFor(groupList) {
  const plan = { count: 0, circuits: new Map(), notes: new Set(), watts: {}, amps: {}, groups: [] };
  for (const group of groupList) {
    const model = projectorModels[group.model];
    if (!model) { console.warn('Unknown projector model', group.model); continue; }
    const volts = voltsOf(model);
    const per20 = perCircuit(model, 20);
    const per15 = perCircuit(model, 15);
    const circuits = per20 ? Math.ceil(group.count / per20) : group.count;
    const fits15 = per15 > 0 && Math.ceil(group.count / per15) === circuits;
    plan.count += group.count;
    plan.circuits.set(volts, (plan.circuits.get(volts) || 0) + circuits);
    plan.notes.add(per20
      ? `${fits15 ? '15 A or 20 A' : '20 A'} at ${volts} V${per20 === 1 ? ', one projector each' : ''}`
      : `larger than 20 A at ${volts} V`);
    plan.groups.push({ ...group, model });
  }
  // only modes that every projector here has a published figure for
  plan.modes = MODES.filter(([mode]) => plan.groups.every(g => g.model.watts[mode] !== undefined));
  for (const [mode] of plan.modes) {
    plan.watts[mode] = 0;
    plan.amps[mode] = new Map();
    for (const g of plan.groups) {
      const watts = g.count * g.model.watts[mode];
      const volts = voltsOf(g.model);
      plan.watts[mode] += watts;
      plan.amps[mode].set(volts, (plan.amps[mode].get(volts) || 0) + watts / volts);
    }
  }
  plan.circuitTotal = [...plan.circuits.values()].reduce((a, b) => a + b, 0);
  return plan;
}
const siteProjectors = site => site.projectors || [];

const ampsValue = map => byVolts(map).map(([, a]) => a.toFixed(1) + ' A').join(' + ');
const voltsList = map => byVolts(map).map(([v]) => v + ' V').join(' and ');
const ampsWithVolts = map => byVolts(map).map(([v, a]) => `${a.toFixed(1)} A at ${v} V`).join(', ');

function figure(value, label) {
  const wrap = el('div');
  wrap.append(el('dt', '', label), el('dd', '', value));
  return wrap;
}

function renderPower(site) {
  sheetEl.append(el('h2', '', 'Projectors and power'));
  const plan = planFor(siteProjectors(site));
  if (!plan.count) {
    sheetEl.append(el('p', 'empty', 'No projectors assigned yet. Add them to this location in locations.js.'));
    return;
  }

  const rigs = el('ul', 'rigs');
  for (const group of plan.groups) {
    const model = group.model;
    const volts = voltsOf(model);
    const item = el('li');
    item.append(
      el('span', 'section', group.section || site.code),
      el('span', 'model', `${group.count} × ${model.name}`),
      el('span', 'spec', `${model.detail}. ${number(model.watts.max)} W and ` +
        `${(model.watts.max / volts).toFixed(1)} A each at full power, at ${volts} V.`)
    );
    if (model.warning) item.append(el('span', 'warn', model.warning));
    if (model.note) item.append(el('span', 'spec', model.note));
    if (group.previz?.length) item.append(thumbnails(site, group.previz, 'drawings previz'));
    rigs.append(item);
  }
  sheetEl.append(rigs);

  const load = el('dl', 'load');
  load.append(
    figure(number(plan.watts.max) + ' W', 'At full power'),
    figure(ampsValue(plan.amps.max), 'At ' + voltsList(plan.amps.max)),
    figure(String(plan.circuitTotal),
      `${plan.circuitTotal === 1 ? 'Circuit' : 'Circuits'}, ${[...plan.notes].join('; ')}`)
  );
  sheetEl.append(load);

  const table = el('table', 'dims modes');
  const head = el('tr');
  for (const text of ['Mode', 'Watts', 'Amps']) {
    const th = el('th', '', text);
    th.scope = 'col';
    head.append(th);
  }
  const thead = el('thead');
  thead.append(head);
  table.append(thead);
  for (const [mode, label] of plan.modes) {
    const tr = el('tr');
    const th = el('th', '', label);
    th.scope = 'row';
    tr.append(th, el('td', 'm', number(plan.watts[mode]) + ' W'), el('td', 'ft', ampsValue(plan.amps[mode])));
    table.append(tr);
  }
  sheetEl.append(table);

  const btu = Math.round((plan.watts.max * 3.412) / 10) * 10;
  const missing = plan.modes.length < MODES.length
    ? ' Modes without a published figure for every projector here are left out.' : '';
  sheetEl.append(el('p', 'basis',
    `Watts are the manufacturers' published figures.${missing} Amps are planned at ${voltsList(plan.amps.max)}, ` +
    `with each circuit loaded to no more than ${power.continuousShare * 100}% of its breaker because projectors ` +
    `run for hours. Heat at full power is about ${number(btu)} BTU/h.`));
}

function renderTotals() {
  const plan = planFor(locations.flatMap(siteProjectors));
  const box = $('#totals');
  if (!plan.count) { box.replaceChildren(); return; }
  const circuits = byVolts(plan.circuits);
  box.replaceChildren(
    el('p', 'totals-title', 'All locations'),
    el('p', '', plural(plan.count, 'projector')),
    el('p', '', `${number(plan.watts.max)} W at full power`),
    el('p', '', ampsWithVolts(plan.amps.max)),
    el('p', '', circuits.length === 1
      ? `${plural(plan.circuitTotal, 'circuit')} at ${circuits[0][0]} V`
      : `${plural(plan.circuitTotal, 'circuit')}: ` + circuits.map(([v, n]) => `${n} at ${v} V`).join(', '))
  );
}

function renderSheet(site) {
  sheetEl.replaceChildren(
    el('p', 'code', site.code),
    el('h1', '', site.name),
    el('p', 'place', site.place),
    el('p', 'summary', site.summary)
  );

  renderPower(site);

  if (site.measurements?.length) {
    const more = el('details', 'more');
    more.append(el('summary', '', `Measurements (${site.measurements.length})`));
    const table = el('table', 'dims');
    for (const row of site.measurements) {
      const tr = el('tr');
      const th = el('th', '', row.label);
      th.scope = 'row';
      if (row.status === 'published') th.append(el('span', 'pub', 'published'));
      tr.append(th, el('td', 'm', row.m.toFixed(2) + ' m'), el('td', 'ft', feet(row.m)));
      table.append(tr);
    }
    const published = site.measurements.some(row => row.status === 'published');
    more.append(table, el('p', 'basis',
      (published ? 'Figures not marked published are estimates. ' : 'All figures are estimates. ') + (site.basis || '')));
    sheetEl.append(more);
  }

  if (site.drawings?.length) {
    sheetEl.append(el('h2', '', site.drawings.length > 1 ? 'Drawings' : 'Drawing'));
    sheetEl.append(thumbnails(site, site.drawings));
  }
  sheetEl.scrollTop = 0;
}

// Image thumbnails that open full size in the lightbox.
function thumbnails(site, images, className = 'drawings') {
  const list = el('div', className);
  for (const image of images) {
    const button = el('button');
    button.type = 'button';
    const img = el('img');
    img.src = site.folder + image.src;
    img.alt = '';
    img.loading = 'lazy';
    button.append(img, el('span', '', image.title));
    button.addEventListener('click', () => {
      const full = lightbox.querySelector('img');
      full.src = img.src;
      full.alt = image.title + ', ' + site.name;
      lightbox.showModal();
    });
    list.append(button);
  }
  return list;
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
  const count = siteProjectors(site).reduce((sum, group) => sum + group.count, 0);
  button.append(
    el('span', 'code', site.code),
    el('span', 'name', site.name),
    el('span', 'count', count ? `${count} projector${count === 1 ? '' : 's'}` : 'No projectors yet')
  );
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
renderTotals();

if (locations.length) select();
else statusEl.textContent = 'No locations yet. Add one to locations.js.';
