// The list of locations shown in the viewer.
//
// To add a location:
//   1. Put its .obj, .mtl and any images in a new folder under models/
//      (letters, numbers and dashes only in the folder name).
//   2. Copy one of the entries below and edit it.
//
// All lengths are in metres; the viewer works out feet and inches.
// status: 'published' for a figure from a published source, 'estimate' otherwise.
//
// projectors: one line per group, e.g. { section: '1b', model: 'PT-RZ120', count: 2 }.
// model must be a key in projectorModels below; add a new model there first.
// stacks (optional): how many stacks the projectors are split into, e.g. count: 6, stacks: 2.
// previz (optional): images for that section, e.g. [{ src: 'file.webp', title: 'What it shows' }].

// Power planning assumptions.
export const power = {
  volts: 110,            // US outlet voltage, used unless a projector model sets its own volts
  continuousShare: 0.8   // projectors run for hours, so a circuit carries at most 80% of its breaker rating
};

// Projector models with the manufacturer's published power figures, in watts.
// watts.max is required; leave out any mode the manufacturer doesn't publish.
// volts: the supply voltage to plan for, when the projector can't run at power.volts.
export const projectorModels = {
  'PT-RZ120': {
    name: 'Panasonic PT-RZ120',
    detail: '12,000 lm, WUXGA, laser',
    watts: { max: 1100, normal: 730, eco: 590, standby: 7 }
  },
  'HDX-W20-FLEX': {
    name: 'Barco HDX-W20 FLEX',
    detail: '20,000 lm, WUXGA, 3-chip DLP, 2.5 kW xenon lamp',
    volts: 208,
    watts: { max: 2850, standby: 8 },
    warning: 'Runs on 200–240 V only, so it will not run from a 110 V outlet. Plan 208 V or 240 V circuits.',
    note: 'Rental houses commonly feed it from a 30 A, L6-30 circuit.'
  },
  'PT-DZ8700U': {
    name: 'Panasonic PT-DZ8700U',
    detail: '10,600 lm, WUXGA, 3-chip DLP, 2 × 355 W lamps',
    lumens: 10600,
    watts: { max: 970, standby: 6 }
  }
};

export default [
  {
    id: 'new-river-inn',
    code: '1a/1b',
    name: 'New River Inn',
    place: '231 SW 2nd Ave, Fort Lauderdale',
    summary:
      'Two-storey block building from 1905 with a hipped roof, dormers on every side and a ' +
      'two-storey veranda on 13 columns along the east and south sides. The east front faces the viewer.',
    basis: 'Scaled from a photo, taking the front door as 2.2 m tall.',
    folder: 'models/new-river-inn/',
    obj: 'new_river_inn.obj',
    mtl: 'new_river_inn.mtl',
    projectors: [
      {
        section: '1b', model: 'PT-RZ120', count: 2,
        previz: [{ src: '1b_previz_test_pattern.webp', title: '1b previz, test pattern on the facade' }]
      }
    ],
    measurements: [
      { label: 'Main block length', m: 26.5 },
      { label: 'Main block depth', m: 11.5 },
      { label: 'Second floor level', m: 3.8 },
      { label: 'Veranda eave', m: 6.8 },
      { label: 'Top of wall', m: 7.8 },
      { label: 'Roof ridge', m: 11.2 },
      { label: 'Veranda depth', m: 3.0 },
      { label: 'Column, square', m: 0.55 },
      { label: 'Column height', m: 6.4 },
      { label: 'Column spacing, centre to centre', m: 3.79 },
      { label: 'Window width', m: 1.0 },
      { label: 'Window height', m: 2.0 }
    ],
    drawings: [
      { src: 'inn_front_details.png', title: 'East (front) elevation' },
      { src: 'inn_back_details.png', title: 'West (back) elevation' },
      { src: 'inn_plan_columns.png', title: 'Plan and column layout' }
    ]
  },
  {
    id: 'flow-back',
    code: '2',
    name: 'FLOW, back facade',
    place: 'Tower facade with the mural panel',
    summary:
      'Mural panel high on the tower, above a three-level glass podium. ' +
      'The red frame marks the mural. The tower height is unknown and drawn for context only.',
    basis: 'Estimated from a photo.',
    folder: 'models/flow-back/',
    obj: 'facade_mural.obj',
    mtl: 'facade_mural.mtl',
    projectors: [
      {
        section: '2', model: 'HDX-W20-FLEX', count: 2,
        previz: [{ src: '2_previz_test_pattern.webp', title: '2 previz, test pattern on the mural panel' }]
      }
    ],
    measurements: [
      { label: 'Mural width', m: 18.0 },
      { label: 'Mural height', m: 22.0 },
      { label: 'Ground to bottom of mural', m: 16.0 },
      { label: 'Ground to top of mural', m: 38.0 },
      { label: 'Lobby level height', m: 6.0 },
      { label: 'Podium level 2 height', m: 4.3 },
      { label: 'Podium level 3 height', m: 4.5 }
    ],
    drawings: [{ src: 'mural_texture.png', title: 'Mural, straightened from the photo' }]
  },
  {
    id: 'flow-canopy',
    code: '5',
    name: 'FLOW, canopy and wall',
    basis: 'Estimated from a Street View photo, calibrated on the parked cars.',
    folder: 'models/flow-canopy/',
    obj: 'site_canopy_wall.obj',
    mtl: 'site_canopy_wall.mtl',
    projectors: [
      {
        section: '5', model: 'PT-DZ8700U', count: 6, stacks: 2,
        previz: [{ src: '5_previz_test_pattern.webp', title: '5 previz, test pattern on the wall' }]
      }
    ],
    measurements: [
      { label: 'Band width', m: 23.0 },
      { label: 'Band height', m: 1.7 },
      { label: 'Ground to underside of band', m: 7.8 },
      { label: 'Ground to top of band', m: 9.5 },
      { label: 'Wall width', m: 30.0 },
      { label: 'Wall height', m: 26.0 },
      { label: 'Ground to top of wall', m: 35.5 }
    ],
    drawings: []
  },
  {
    id: 'fau-west-wall',
    code: '10b',
    name: 'FAU / BC Higher Education Complex',
    place: '111 E Las Olas Blvd, Fort Lauderdale',
    summary:
      'West wall of the 12-storey complex, facing the SE 1st Ave lot. The whole wall is the canvas; ' +
      'the dark vertical strip is a column of windows to mask out.',
    basis: 'Width is the published 90 ft. Height is estimated from 12 storeys plus parapet and could be 48 to 56 m.',
    folder: 'models/fau-west-wall/',
    obj: 'hec_west_wall.obj',
    mtl: 'hec_west_wall.mtl',
    projectors: [],
    measurements: [
      { label: 'Wall width', m: 27.432, status: 'published' },
      { label: 'Wall height', m: 52.0 },
      { label: 'Window strip, from left edge', m: 13.55 },
      { label: 'Window strip width', m: 2.63 },
      { label: 'Window strip starts above ground', m: 3.0 }
    ],
    drawings: []
  }
];
