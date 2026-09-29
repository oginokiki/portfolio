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

function painting(n, title, year, medium, size, w, h, description) {
  return {
    id: n,
    title: title,
    year: year,
    medium: medium,
    size: size,
    w: w,
    h: h,
    ratio: w + ' / ' + h,
    src: placeholder(n, w, h, title),
    description: description
  };
}

var COLLECTIONS = [
  {
    id: 'attic',
    title: 'The Attic',
    note: 'dusty light, old things',
    paintings: [
      painting(1, 'Untitled I', 2024, 'Oil on canvas', '40 × 50 cm', 400, 500,
        'Light through a round window, caught on a stack of forgotten boxes.'),
      painting(2, 'Trunk', 2024, 'Oil on canvas', '50 × 50 cm', 450, 450,
        'An old travel trunk, half-open, its contents left to the imagination.'),
      painting(3, 'Skylight', 2023, 'Acrylic on panel', '60 × 45 cm', 500, 400,
        'Dust turning slowly in a shaft of afternoon sun.')
    ]
  },
  {
    id: 'salon',
    title: 'The Salon',
    note: 'conversations and chairs',
    paintings: [
      painting(4, 'Sitting Room', 2023, 'Oil on canvas', '45 × 60 cm', 450, 600,
        'Two armchairs angled toward each other, mid-conversation.'),
      painting(5, 'Two Chairs', 2022, 'Oil on linen', '50 × 40 cm', 500, 400,
        'A study of negative space between a pair of wingback chairs.'),
      painting(6, 'Afternoon Tea', 2023, 'Gouache on paper', '40 × 40 cm', 400, 400,
        'Porcelain and steam, painted quickly before the tea went cold.'),
      painting(7, 'The Curtain', 2024, 'Oil on canvas', '48 × 60 cm', 480, 600,
        'Heavy drapery catching the last of the evening light.')
    ]
  },
  {
    id: 'bedroom',
    title: 'The Bedroom',
    note: 'quiet mornings',
    paintings: [
      painting(8, 'Unmade', 2022, 'Oil on canvas', '45 × 60 cm', 450, 600,
        'Sheets still holding the shape of sleep.'),
      painting(9, 'Window Seat', 2023, 'Oil on canvas', '60 × 45 cm', 600, 450,
        'A cushion worn soft by years of morning light.'),
      painting(10, 'Lamp', 2024, 'Acrylic on panel', '35 × 35 cm', 350, 350,
        'A small study of warm light against a cool room.')
    ]
  },
  {
    id: 'kitchen',
    title: 'The Kitchen',
    note: 'fruit, bread, steam',
    paintings: [
      painting(11, 'Pears', 2023, 'Oil on panel', '30 × 30 cm', 300, 300,
        'Three pears, slightly overripe, arranged without much thought.'),
      painting(12, 'Bread Board', 2022, 'Oil on canvas', '50 × 40 cm', 500, 400,
        'Crumbs and a knife, left exactly where they fell.'),
      painting(13, 'Kettle', 2024, 'Oil on canvas', '40 × 50 cm', 400, 500,
        'Steam rising in a thin, unsteady line.')
    ]
  }
];
