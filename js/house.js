// js/house.js — hand-drawn pencil townhouse, built as SVG paths.

var House = (function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PENCIL_BASE = 1.2;
  var LEVEL_NAMES = ['light', 'medium', 'heavy'];
  var LEVEL_MULT = { light: 0.4, medium: 0.7, heavy: 1.0 };

  function rectPath(x, y, w, h) {
    return 'M' + x + ',' + y + ' H' + (x + w) + ' V' + (y + h) + ' H' + x + ' Z';
  }
  function lerp(a, b, t) { t = Math.max(0, Math.min(1, t)); return a + (b - a) * t; }

  // ---- Pencil: builds hand-drawn, jittered, multi-pass SVG paths ----
  function Pencil(root, rand) {
    this.root = root;
    this.rand = rand;
    this.order = 0;
    this.allGroups = [];
    this.camGroup = null;
    this._newWeightSet();
  }

  Pencil.prototype._newWeightSet = function () {
    var self = this, g = {};
    LEVEL_NAMES.forEach(function (level) {
      var el = document.createElementNS(SVGNS, 'g');
      el.setAttribute('class', 'pw pw-' + level);
      self.root.appendChild(el);
      var rec = { el: el, mult: LEVEL_MULT[level] };
      self.allGroups.push(rec);
      g[level] = rec;
    });
    this.groups = g;
  };

  Pencil.prototype.setCamGroup = function (el) { this.camGroup = el; };

  Pencil.prototype.setScale = function (z) {
    if (this.camGroup) this.camGroup.style.strokeWidth = (PENCIL_BASE / z).toFixed(3) + 'px';
    for (var i = 0; i < this.allGroups.length; i++) {
      var rec = this.allGroups[i];
      rec.el.style.strokeWidth = (PENCIL_BASE * rec.mult / z).toFixed(3) + 'px';
    }
  };

  Pencil.prototype.fill = function (d, color) {
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', color || '#eeede8');
    p.setAttribute('stroke', 'none');
    this.root.appendChild(p);
    this._newWeightSet();
    return p;
  };

  Pencil.prototype._rand = function () { return this.rand(); };
  Pencil.prototype._signed = function () { return this._rand() * 2 - 1; };

  Pencil.prototype._basePoints = function (x1, y1, x2, y2) {
    var o1 = this._rand() * 3, o2 = this._rand() * 3;
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var sx = x1 - ux * o1, sy = y1 - uy * o1;
    var ex = x2 + ux * o2, ey = y2 + uy * o2;
    var fullLen = Math.sqrt((ex - sx) * (ex - sx) + (ey - sy) * (ey - sy));
    var count = Math.max(2, Math.round(fullLen / 12));
    var pts = [];
    for (var i = 0; i <= count; i++) {
      var t = i / count;
      pts.push([sx + (ex - sx) * t, sy + (ey - sy) * t]);
    }
    return pts;
  };

  Pencil.prototype._bezierPoints = function (x1, y1, cx, cy, x2, y2) {
    var approx = Math.hypot(x2 - x1, y2 - y1) + Math.hypot(cx - x1, cy - y1);
    var count = Math.max(6, Math.round(approx / 10));
    var pts = [];
    for (var i = 0; i <= count; i++) {
      var t = i / count, mt = 1 - t;
      pts.push([mt * mt * x1 + 2 * mt * t * cx + t * t * x2, mt * mt * y1 + 2 * mt * t * cy + t * t * y2]);
    }
    return pts;
  };

  Pencil.prototype._smoothPath = function (pts) {
    if (pts.length < 2) return '';
    var d = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + pts[i][0].toFixed(2) + ',' + pts[i][1].toFixed(2) + ' ' + mx.toFixed(2) + ',' + my.toFixed(2);
    }
    var last = pts[pts.length - 1];
    d += ' L' + last[0].toFixed(2) + ',' + last[1].toFixed(2);
    return d;
  };

  Pencil.prototype._polyLength = function (pts) {
    var len = 0;
    for (var i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return len;
  };

  Pencil.prototype._splitPoints = function (pts, n) {
    if (n <= 1) return [pts];
    var out = [], total = pts.length - 1, per = total / n;
    for (var i = 0; i < n; i++) {
      var s = Math.floor(i * per), e = Math.floor((i + 1) * per);
      if (i === n - 1) e = total;
      var seg = pts.slice(s, e + 1);
      if (seg.length < 2) seg = pts.slice(Math.max(0, s - 1), e + 1);
      out.push(seg);
    }
    return out;
  };

  Pencil.prototype._emitPath = function (ptsOrD, level, opacity, orderIdx) {
    var d = Array.isArray(ptsOrD) ? this._smoothPath(ptsOrD) : ptsOrD;
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', 'draw');
    if (opacity != null && opacity < 1) p.style.opacity = opacity.toFixed(2);
    p.style.animationDelay = Math.min(2400, orderIdx * 5) + 'ms';
    this.groups[level].el.appendChild(p);
    return p;
  };

  Pencil.prototype._emitPass = function (pts, passIndex, baseOpacity, forcedWeight, bias) {
    if (passIndex === 0) {
      if (forcedWeight) { this._emitPath(pts, forcedWeight, baseOpacity, this.order); return; }
      var pieceCount = Math.max(1, Math.min(4, Math.round(this._polyLength(pts) / 30)));
      var midLevel = bias === 'heavy' ? 2 : bias === 'light' ? 0 : (this._rand() < 0.5 ? 1 : 2);
      var segs = this._splitPoints(pts, pieceCount);
      for (var i = 0; i < segs.length; i++) {
        var level = midLevel;
        if (i === 0 || i === segs.length - 1) level = Math.max(0, level - 1);
        if (this._rand() < 0.25) level = Math.max(0, level - 1);
        this._emitPath(segs[i], LEVEL_NAMES[level], baseOpacity, this.order);
      }
    } else {
      var lvl = forcedWeight || 'light';
      this._emitPath(pts, lvl, baseOpacity * (0.55 + this._rand() * 0.05), this.order);
    }
  };

  Pencil.prototype._jitterAndEmit = function (basePts, opts) {
    opts = opts || {};
    var j = opts.j != null ? opts.j : 2.6;
    var passes = opts.passes != null ? opts.passes : 2;
    var baseOpacity = opts.o != null ? opts.o : 1;
    var forcedWeight = opts.weight || null;
    var bias = opts.bias || null;
    var lean = this._signed() * j * 0.5;
    var n = basePts.length;
    for (var pass = 0; pass < passes; pass++) {
      var passJ = pass === 0 ? j : j * 0.9;
      var pts = [], off = 0;
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1 || 1);
        var p0 = basePts[Math.max(0, i - 1)], p1 = basePts[Math.min(n - 1, i + 1)];
        var tx = p1[0] - p0[0], ty = p1[1] - p0[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
        var nx = -ty / tl, ny = tx / tl;
        off = off * 0.55 + this._signed() * passJ * 0.9;
        var ox = basePts[i][0] + nx * (off + lean * t);
        var oy = basePts[i][1] + ny * (off + lean * t);
        if (pass > 0) { var j2 = this._signed() * 1.1; ox += nx * j2; oy += ny * j2; }
        pts.push([ox, oy]);
      }
      this._emitPass(pts, pass, baseOpacity, forcedWeight, bias);
    }
    this.order++;
  };

  Pencil.prototype.line = function (x1, y1, x2, y2, opts) { this._jitterAndEmit(this._basePoints(x1, y1, x2, y2), opts); };
  Pencil.prototype.curve = function (x1, y1, cx, cy, x2, y2, opts) { this._jitterAndEmit(this._bezierPoints(x1, y1, cx, cy, x2, y2), opts); };
  Pencil.prototype.poly = function (points, opts, closed) {
    for (var i = 0; i < points.length - 1; i++) this.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], opts);
    if (closed) this.line(points[points.length - 1][0], points[points.length - 1][1], points[0][0], points[0][1], opts);
  };
  Pencil.prototype.rect = function (x, y, w, h, opts) {
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], opts, true);
  };
  Pencil.prototype.zigzag = function (x1, y1, x2, y2, amp, count, opts) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len, pts = [];
    for (var i = 0; i <= count; i++) {
      var t = i / count, side = (i % 2 === 0 ? 1 : -1) * amp;
      pts.push([x1 + dx * t + nx * side, y1 + dy * t + ny * side]);
    }
    this.poly(pts, opts, false);
  };
  Pencil.prototype.scribbleEllipse = function (cx, cy, rx, ry, opts) {
    opts = opts || {};
    var passes = opts.passes || 3, n = 16, base = [];
    for (var i = 0; i <= n; i++) { var a = (i / n) * Math.PI * 2; base.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    for (var pIdx = 0; pIdx < passes; pIdx++) {
      var pts = [];
      for (var k = 0; k < base.length; k++) {
        pts.push([base[k][0] + this._signed() * (opts.j || 2), base[k][1] + this._signed() * (opts.j || 2)]);
      }
      var d = this._smoothPath(pts) + ' Z';
      var level = pIdx === 0 ? (opts.weight || 'medium') : 'light';
      var op = pIdx === 0 ? 1 : (0.5 + this._rand() * 0.1);
      this._emitPath(d, level, op, this.order);
      this.order++;
    }
  };

  // ---- Roof silhouette helper (mansard curve, symmetric about x=200) ----
  function leftRoofX(y) {
    if (y <= 140) return lerp(104, 91, (y - 97) / (140 - 97));
    return lerp(91, 82, (y - 140) / (192 - 140));
  }

  // ---- Drawing sections, in build order ----
  function drawGround(p) {
    p.line(14, 540, 112, 540, { j: 2.2, bias: 'medium' });
    p.line(124, 540, 296, 540, { j: 2.2, bias: 'medium' });
    p.line(306, 540, 388, 540, { j: 2.2, bias: 'medium' });
    p.line(170, 547, 230, 547, { j: 1.8, bias: 'light' });
    p.line(164, 554, 236, 554, { j: 1.8, bias: 'light' });
    for (var i = 0; i < 16; i++) {
      var x = 16 + p._rand() * 368;
      if (x > 95 && x < 305) continue;
      var y = 540 + p._rand() * 7;
      p.line(x, y, x + (p._rand() * 4 - 2), y - 4 - p._rand() * 3, { j: 1, passes: 1, o: 0.5, bias: 'light' });
    }
  }

  function drawWalls(p) {
    p.line(89, 215, 86, 540, { j: 1.6, passes: 3, bias: 'heavy' });
    p.line(313, 215, 316, 540, { j: 1.6, passes: 3, bias: 'heavy' });
  }

  function drawChimneys(p) {
    p.fill(rectPath(102, 64, 16, 36), '#eeede8');
    p.rect(102, 64, 16, 36, { bias: 'heavy', passes: 3 });
    p.line(99, 64, 121, 64, { bias: 'heavy' });
    p.fill(rectPath(262, 76, 32, 22), '#eeede8');
    p.rect(262, 76, 32, 22, { bias: 'heavy', passes: 3 });
    p.line(259, 76, 297, 76, { bias: 'heavy' });
  }

  function drawMansard(p) {
    p.line(104, 97, 296, 96, { bias: 'heavy', passes: 3 });
    p.line(104, 97, 91, 140, { bias: 'heavy' });
    p.line(91, 140, 82, 192, { bias: 'heavy' });
    p.line(296, 96, 309, 140, { bias: 'heavy' });
    p.line(309, 140, 318, 192, { bias: 'heavy' });
    p.line(78, 193, 322, 193, { bias: 'heavy', passes: 3 });
    for (var y = 110; y < 188; y += 9) {
      var lx = leftRoofX(y) + 4, rx = 400 - leftRoofX(y) - 4;
      var segs = 2 + Math.floor(p._rand() * 2);
      var segLen = (rx - lx) / segs;
      for (var s = 0; s < segs; s++) {
        if (p._rand() < 0.25) continue;
        var sx = lx + s * segLen + p._rand() * 4;
        var ex = Math.min(sx + segLen * (0.5 + p._rand() * 0.4), rx);
        p.line(sx, y, ex, y, { j: 1.2, passes: 1, o: 0.35, bias: 'light' });
      }
    }
  }

  function drawWindowFrame(p, cx, cy, w, h, opts) {
    var lit = opts.lit, cols = opts.cols || 1, rows = opts.rows || 1;
    var x = cx - w / 2, y = cy - h / 2;
    p.rect(x, y, w, h, { bias: 'heavy' });
    p.rect(x + 3, y + 3, w - 6, h - 6, { bias: 'medium' });
    for (var c = 1; c <= cols; c++) {
      var mx = x + 3 + (w - 6) * (c / (cols + 1));
      p.line(mx, y + 3, mx, y + h - 3, { j: 1, bias: 'medium' });
    }
    for (var r = 1; r <= rows; r++) {
      var my = y + 3 + (h - 6) * (r / (rows + 1));
      p.line(x + 3, my, x + w - 3, my, { j: 1, bias: 'medium' });
    }
    p.line(x - 4, y - 3, x + w + 4, y - 3, { bias: 'heavy' });
    p.line(x - 5, y + h + 4, x + w + 5, y + h + 4, { bias: 'heavy' });
    if (lit) drawCurtains(p, x + 3, y + 3, w - 6, h - 6);
    else drawHatch(p, x + 3, y + 3, w - 6, h - 6);
  }

  function drawCurtains(p, x, y, w, h) {
    for (var side = 0; side < 2; side++) {
      var baseX = side === 0 ? x + w * 0.16 : x + w * 0.84;
      for (var i = 0; i < 3; i++) {
        var y1 = y + h * (0.08 + i * 0.3), y2 = y1 + h * 0.24;
        var bow = (side === 0 ? 1 : -1) * (w * 0.14);
        var midX = baseX + bow, midY = (y1 + y2) / 2;
        p.curve(baseX, y1, midX, midY, baseX, y2, { j: 0.7, passes: 1, o: 0.65, bias: 'light' });
      }
    }
  }

  function drawHatch(p, x, y, w, h) {
    for (var i = 0; i < 4; i++) {
      var t = i / 3;
      p.line(x + w * t * 0.5, y + h, x + w * 0.6 + w * t * 0.4, y, { j: 0.6, passes: 1, o: 0.3, bias: 'light' });
    }
  }

  function drawDormer(p, cx, lit) {
    var cy = 143, w = 26, h = 40, topY = cy - h / 2, botY = cy + h / 2;
    var apex = [cx, topY - 17], baseL = [cx - 16, topY], baseR = [cx + 16, topY];
    var maskPath = 'M' + apex[0] + ',' + apex[1] +
      ' L' + baseR[0] + ',' + baseR[1] +
      ' L' + (cx + w / 2) + ',' + topY +
      ' L' + (cx + w / 2) + ',' + botY +
      ' L' + (cx - w / 2) + ',' + botY +
      ' L' + (cx - w / 2) + ',' + topY +
      ' L' + baseL[0] + ',' + baseL[1] + ' Z';
    p.fill(maskPath, '#eeede8');
    p.line(apex[0], apex[1], baseL[0], baseL[1], { bias: 'heavy' });
    p.line(apex[0], apex[1], baseR[0], baseR[1], { bias: 'heavy' });
    drawWindowFrame(p, cx, cy, w, h, { lit: lit, cols: 1, rows: 1 });
  }
  function drawDormers(p) {
    drawDormer(p, 130, false);
    drawDormer(p, 200, true);
    drawDormer(p, 270, false);
  }

  function drawCornice(p) {
    p.line(80, 214, 320, 214, { bias: 'heavy', passes: 3 });
    var pts = [];
    for (var x = 78; x <= 322; x += 7) {
      pts.push([x, (Math.round((x - 78) / 7) % 2 === 0) ? 201 : 208]);
    }
    p.poly(pts, { j: 1, passes: 1, bias: 'medium' }, false);
  }

  function drawStonework(p) {
    for (var y = 228; y < 540; y += 20) {
      if (y >= 340 && y < 366) continue;
      for (var x = 90; x < 312; x += 20) {
        if (p._rand() < 0.5) {
          var len = 6 + p._rand() * 6;
          p.line(x, y, x + len, y, { j: 0.8, passes: 1, o: 0.3, bias: 'light' });
        }
        if (p._rand() < 0.4) {
          p.line(x + p._rand() * 10, y, x + p._rand() * 10, y + 8, { j: 0.6, passes: 1, o: 0.25, bias: 'light' });
        }
      }
    }
  }

  function drawMaskedWindow(p, cx, cy, w, h, opts) {
    var x = cx - w / 2, y = cy - h / 2;
    p.fill(rectPath(x - 6, y - 5, w + 12, h + 11), '#eeede8');
    drawWindowFrame(p, cx, cy, w, h, opts);
  }
  function drawFirstFloorWindows(p) {
    drawMaskedWindow(p, 130, 272, 34, 80, { lit: true, cols: 1, rows: 2 });
    drawMaskedWindow(p, 200, 272, 34, 80, { lit: false, cols: 1, rows: 2 });
    drawMaskedWindow(p, 270, 272, 34, 80, { lit: true, cols: 1, rows: 2 });
  }

  function drawBalcony(p) {
    p.line(100, 320, 300, 320, { bias: 'heavy', passes: 3 });
    p.line(98, 347, 302, 347, { bias: 'heavy' });
    p.line(98, 354, 302, 354, { bias: 'heavy' });
    p.line(100, 320, 98, 347, { bias: 'heavy' });
    p.line(300, 320, 302, 347, { bias: 'heavy' });
    for (var x = 106; x <= 298; x += 11) {
      p.zigzag(x, 320, x, 347, 2.2, 3, { j: 0.8, passes: 1, bias: 'light' });
    }
  }

  function drawStringCourse(p) {
    p.line(84, 366, 316, 366, { bias: 'heavy', passes: 3 });
  }

  function drawDoor(p) {
    var outerPath = 'M170,540 Q166,440 200,362 Q234,440 230,540 Z';
    p.fill(outerPath, '#eeede8');
    p.curve(170, 540, 166, 440, 200, 362, { bias: 'heavy' });
    p.curve(200, 362, 234, 440, 230, 540, { bias: 'heavy' });
    p.curve(176, 540, 173, 445, 200, 370, { bias: 'heavy', passes: 3 });
    p.curve(200, 370, 227, 445, 224, 540, { bias: 'heavy', passes: 3 });
    p.rect(182, 420, 16, 45, { bias: 'medium' });
    p.rect(202, 420, 16, 45, { bias: 'medium' });
    p.rect(182, 472, 16, 55, { bias: 'medium' });
    p.rect(202, 472, 16, 55, { bias: 'medium' });
    p.scribbleEllipse(214, 485, 2.2, 2.2, { passes: 2, weight: 'medium' });
    p.line(200, 362, 200, 357, { bias: 'medium' });
    p.scribbleEllipse(200, 355, 4, 5, { passes: 2, weight: 'medium' });
    for (var i = 0; i < 6; i++) {
      var t = i / 5;
      var ex = 180 + t * 40;
      var ey = 375 + Math.abs(t - 0.5) * 16;
      p.line(200, 398, ex, ey, { j: 0.8, passes: 1, bias: 'light' });
    }
  }

  function drawGroundWindow(p, cx, lit) {
    var cy = 440, w = 34, h = 62, x = cx - w / 2, y = cy - h / 2;
    p.fill(rectPath(x - 8, y - 14, w + 16, h + 28), '#eeede8');
    var hoodY = y - 6;
    p.line(x - 6, hoodY, cx, hoodY - 12, { bias: 'heavy' });
    p.line(cx, hoodY - 12, x + w + 6, hoodY, { bias: 'heavy' });
    p.line(x - 6, hoodY, x + w + 6, hoodY, { bias: 'medium' });
    drawWindowFrame(p, cx, cy, w, h, { lit: lit, cols: 1, rows: 2 });
    var boxY = y + h + 4;
    p.rect(x - 2, boxY, w + 4, 10, { bias: 'medium' });
    for (var i = 0; i < 5; i++) {
      var bx = x + 4 + i * (w - 8) / 4;
      p.scribbleEllipse(bx, boxY - 3, 3, 2.4, { passes: 2, weight: 'light' });
    }
  }
  function drawGroundWindows(p) {
    drawGroundWindow(p, 125, false);
    drawGroundWindow(p, 275, true);
  }

  function drawPot(p, cx) {
    var topY = 528, botY = 540, topW = 20, botW = 14;
    p.line(cx - topW / 2, topY, cx - botW / 2, botY, { bias: 'medium' });
    p.line(cx + topW / 2, topY, cx + botW / 2, botY, { bias: 'medium' });
    p.line(cx - botW / 2, botY, cx + botW / 2, botY, { bias: 'medium' });
    p.line(cx - topW / 2, topY, cx + topW / 2, topY, { bias: 'medium' });
    p.line(cx, topY, cx, topY - 16, { bias: 'medium' });
    p.scribbleEllipse(cx, topY - 24, 14, 12, { passes: 3, weight: 'medium' });
  }
  function drawPots(p) {
    drawPot(p, 58);
    drawPot(p, 342);
  }

  function smokePath(x, y, rand) {
    var pts = [[x, y]], cx = x, cy = y;
    for (var i = 0; i < 5; i++) {
      cx += (rand() - 0.5) * 14;
      cy -= 10 + rand() * 6;
      pts.push([cx, cy]);
    }
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var j = 1; j < pts.length; j++) {
      d += ' Q' + ((pts[j - 1][0] + pts[j][0]) / 2).toFixed(1) + ',' + ((pts[j - 1][1] + pts[j][1]) / 2).toFixed(1) +
        ' ' + pts[j][0].toFixed(1) + ',' + pts[j][1].toFixed(1);
    }
    return d;
  }
  function drawSmoke(camGroup, rand) {
    [smokePath(110, 64, rand), smokePath(278, 76, rand)].forEach(function (d, i) {
      var el = document.createElementNS(SVGNS, 'path');
      el.setAttribute('d', d);
      el.setAttribute('class', 'smoke');
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', '#2b2b2b');
      el.setAttribute('stroke-width', '1');
      el.setAttribute('stroke-linecap', 'round');
      el.style.animationDelay = (i * 1.6) + 's';
      camGroup.appendChild(el);
    });
  }

  // ---- Public API ----
  var WINDOWS = [
    { cx: 200, cy: 143, w: 26, h: 40 },
    { cx: 270, cy: 272, w: 34, h: 80 },
    { cx: 130, cy: 272, w: 34, h: 80 },
    { cx: 275, cy: 440, w: 34, h: 62 }
  ];
  var pencilInstance = null;

  function init(camGroupEl) {
    var rand = mulberry32(20260929);
    var sketch = document.createElementNS(SVGNS, 'g');
    sketch.setAttribute('class', 'sketch');
    camGroupEl.appendChild(sketch);
    var p = new Pencil(sketch, rand);
    p.setCamGroup(camGroupEl);
    pencilInstance = p;

    drawGround(p);
    drawWalls(p);
    drawChimneys(p);
    drawMansard(p);
    drawDormers(p);
    drawCornice(p);
    drawStonework(p);
    drawFirstFloorWindows(p);
    drawBalcony(p);
    drawStringCourse(p);
    drawDoor(p);
    drawGroundWindows(p);
    drawPots(p);
    drawSmoke(camGroupEl, rand);

    p.setScale(1);
    setTimeout(function () { sketch.classList.add('done'); }, 3400);
  }

  function setScale(z) { if (pencilInstance) pencilInstance.setScale(z); }

  return { init: init, setScale: setScale, windows: WINDOWS };
})();
