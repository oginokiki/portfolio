// js/data.js — site content + deterministic SVG placeholder generator

var SITE = { name: 'Kiki Ogino', tagline: 'paintings' };

// Deterministic PRNG so placeholders/drawing are stable across loads.
function mulberry32(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns an SVG data-URI: off-white bg, wobbly 9-point blob with diagonal
// hatching clipped inside it, a horizon line, and a small serif label.
function placeholder(seed, w, h, label) {
  var rand = mulberry32(seed * 7919 + 13);
  var cx = w / 2, cy = h / 2;
  var baseR = Math.min(w, h) * 0.34;
  var n = 9, pts = [];
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2;
    var r = baseR * (0.72 + rand() * 0.56);
    var px = cx + Math.cos(a) * r * (w / Math.min(w, h)) * 0.6 + (w / Math.min(w, h) - 1) * baseR * 0.4 * Math.cos(a);
    var py = cy + Math.sin(a) * r;
    pts.push(px.toFixed(1) + ',' + py.toFixed(1));
  }
  var poly = pts.join(' ');

  var hatch = '';
  var step = 11;
  for (var x = -h; x < w + h; x += step) {
    hatch += '<line x1="' + x + '" y1="0" x2="' + (x + h) + '" y2="' + h +
      '" stroke="#222" stroke-width="1" opacity="0.32"/>';
  }

  var horizonY = (h * (0.56 + rand() * 0.12)).toFixed(1);
  var clipId = 'ph-clip-' + seed;
  var safeLabel = 'placeholder ' + seed;

  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
    '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<rect width="' + w + '" height="' + h + '" fill="#fbfaf6"/>' +
    '<line x1="0" y1="' + horizonY + '" x2="' + w + '" y2="' + horizonY +
    '" stroke="#222" stroke-width="1" opacity="0.4"/>' +
    '<clipPath id="' + clipId + '"><polygon points="' + poly + '"/></clipPath>' +
    '<g clip-path="url(#' + clipId + ')">' + hatch + '</g>' +
    '<polygon points="' + poly + '" fill="none" stroke="#222" stroke-width="1.6"/>' +
    '<text x="' + (w / 2) + '" y="' + (h - 12) + '" font-family="Georgia, \'Times New Roman\', serif" ' +
    'font-size="13" fill="#222" text-anchor="middle" opacity="0.55">' + safeLabel + '</text>' +
    '</svg>';

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ---------------------------------------------------------------------
// "Tables" — flat row data, shaped like what a future fetch()/CSV/sheet
// read would return. COLLECTIONS below is assembled from these two.
// To swap in a real data source later, replace these two arrays with
// the equivalent rows (e.g. fetched JSON) and keep the same field names.
// ---------------------------------------------------------------------

var COLLECTIONS_TABLE = [
  { id: 'attic', title: 'The Attic', note: 'dusty light, old things' },
  { id: 'salon', title: 'The Salon', note: 'conversations and chairs' },
  { id: 'bedroom', title: 'The Bedroom', note: 'quiet mornings' },
  { id: 'kitchen', title: 'The Kitchen', note: 'fruit, bread, steam' }
];

// src is optional — leave blank/omit to auto-generate a placeholder image.
var PAINTINGS_TABLE = [
  { id: 1, collection: 'attic', title: 'Untitled I', year: 2024, medium: 'Oil on canvas', size: '40 × 50 cm', w: 400, h: 500, src: '',
    description: 'Light through a round window, caught on a stack of forgotten boxes.' },
  { id: 2, collection: 'attic', title: 'Trunk', year: 2024, medium: 'Oil on canvas', size: '50 × 50 cm', w: 450, h: 450, src: '',
    description: 'An old travel trunk, half-open, its contents left to the imagination.' },
  { id: 3, collection: 'attic', title: 'Skylight', year: 2023, medium: 'Acrylic on panel', size: '60 × 45 cm', w: 500, h: 400, src: '',
    description: 'Dust turning slowly in a shaft of afternoon sun.' },

  { id: 4, collection: 'salon', title: 'Sitting Room', year: 2023, medium: 'Oil on canvas', size: '45 × 60 cm', w: 450, h: 600, src: '',
    description: 'Two armchairs angled toward each other, mid-conversation.' },
  { id: 5, collection: 'salon', title: 'Two Chairs', year: 2022, medium: 'Oil on linen', size: '50 × 40 cm', w: 500, h: 400, src: '',
    description: 'A study of negative space between a pair of wingback chairs.' },
  { id: 6, collection: 'salon', title: 'Afternoon Tea', year: 2023, medium: 'Gouache on paper', size: '40 × 40 cm', w: 400, h: 400, src: '',
    description: 'Porcelain and steam, painted quickly before the tea went cold.' },
  { id: 7, collection: 'salon', title: 'The Curtain', year: 2024, medium: 'Oil on canvas', size: '48 × 60 cm', w: 480, h: 600, src: '',
    description: 'Heavy drapery catching the last of the evening light.' },

  { id: 8, collection: 'bedroom', title: 'Unmade', year: 2022, medium: 'Oil on canvas', size: '45 × 60 cm', w: 450, h: 600, src: '',
    description: 'Sheets still holding the shape of sleep.' },
  { id: 9, collection: 'bedroom', title: 'Window Seat', year: 2023, medium: 'Oil on canvas', size: '60 × 45 cm', w: 600, h: 450, src: '',
    description: 'A cushion worn soft by years of morning light.' },
  { id: 10, collection: 'bedroom', title: 'Lamp', year: 2024, medium: 'Acrylic on panel', size: '35 × 35 cm', w: 350, h: 350, src: '',
    description: 'A small study of warm light against a cool room.' },

  { id: 11, collection: 'kitchen', title: 'Pears', year: 2023, medium: 'Oil on panel', size: '30 × 30 cm', w: 300, h: 300, src: '',
    description: 'Three pears, slightly overripe, arranged without much thought.' },
  { id: 12, collection: 'kitchen', title: 'Bread Board', year: 2022, medium: 'Oil on canvas', size: '50 × 40 cm', w: 500, h: 400, src: '',
    description: 'Crumbs and a knife, left exactly where they fell.' },
  { id: 13, collection: 'kitchen', title: 'Kettle', year: 2024, medium: 'Oil on canvas', size: '40 × 50 cm', w: 400, h: 500, src: '',
    description: 'Steam rising in a thin, unsteady line.' }
];

// Assemble COLLECTIONS (what the rest of the site consumes) from the tables above.
var COLLECTIONS = COLLECTIONS_TABLE.map(function (col) {
  return {
    id: col.id,
    title: col.title,
    note: col.note,
    paintings: PAINTINGS_TABLE.filter(function (row) { return row.collection === col.id; })
      .map(function (row) {
        return {
          id: row.id,
          title: row.title,
          year: row.year,
          medium: row.medium,
          size: row.size,
          w: row.w,
          h: row.h,
          ratio: row.w + ' / ' + row.h,
          src: row.src ? row.src : placeholder(row.id, row.w, row.h, row.title),
          description: row.description
        };
      })
  };
});
