// js/home.js — scroll-driven camera engine for the house, room rendering, modal.

(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function smoothstep(e0, e1, x) {
    var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  var TRACK_START_Y = 70;

  function buildRooms(container) {
    COLLECTIONS.forEach(function (col) {
      var room = document.createElement('section');
      room.className = 'room';
      room.dataset.room = col.id;

      var track = document.createElement('div');
      track.className = 'track';

      var header = document.createElement('div');
      header.className = 'room-header';
      header.innerHTML = '<h2>' + escapeHtml(col.title) + '</h2><p class="note">' + escapeHtml(col.note) + '</p>';
      track.appendChild(header);

      var list = document.createElement('div');
      list.className = 'paintings';
      col.paintings.forEach(function (pt, pi) {
        var odd = (pi % 2 === 0);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'painting ' + (odd ? 'odd' : 'even');
        btn.setAttribute('data-collection', col.id);
        btn.setAttribute('data-painting', pi);
        btn.innerHTML =
          '<span class="frame" style="aspect-ratio:' + pt.w + '/' + pt.h + '">' +
          '<img src="' + pt.src + '" alt="' + escapeHtml(pt.title) + '" loading="lazy"></span>' +
          '<span class="caption">' + escapeHtml(pt.title) + '</span>';
        list.appendChild(btn);
      });
      track.appendChild(list);
      room.appendChild(track);
      container.appendChild(room);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var svgEl = document.getElementById('house-svg');
    var camGroupEl = document.getElementById('cam');
    if (!svgEl || !camGroupEl) return;

    House.init(camGroupEl);

    var roomsContainer = document.querySelector('.rooms');
    buildRooms(roomsContainer);
    var roomEls = Array.prototype.slice.call(roomsContainer.querySelectorAll('.room'));
    var roomTrackEls = roomEls.map(function (r) { return r.querySelector('.track'); });

    var heroEl = document.querySelector('.hero');
    var hintEl = document.querySelector('.scroll-hint');
    var finaleEl = document.querySelector('.finale');
    var spacerEl = document.querySelector('.scroll-spacer');

    var modalEl = document.getElementById('modal');
    var modalImg = modalEl.querySelector('.modal-img');
    var modalTitle = modalEl.querySelector('.modal-title');
    var modalMeta = modalEl.querySelector('.modal-meta');
    var modalDesc = modalEl.querySelector('.modal-desc');
    var modalClose = modalEl.querySelector('.modal-close');
    var modalBackdrop = modalEl.querySelector('.modal-backdrop');

    function openModal(collectionId, paintingIndex) {
      var col = COLLECTIONS.filter(function (c) { return c.id === collectionId; })[0];
      if (!col) return;
      var pt = col.paintings[paintingIndex];
      if (!pt) return;
      modalImg.src = pt.src;
      modalImg.alt = pt.title;
      modalTitle.textContent = pt.title;
      modalMeta.textContent = pt.year + ' · ' + pt.medium + ' · ' + pt.size;
      modalDesc.textContent = pt.description;
      modalEl.classList.add('open');
      document.body.classList.add('modal-open');
    }
    function closeModal() {
      modalEl.classList.remove('open');
      document.body.classList.remove('modal-open');
    }

    roomsContainer.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.painting') : null;
      if (!btn) return;
      openModal(btn.getAttribute('data-collection'), +btn.getAttribute('data-painting'));
    });
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl.classList.contains('open')) closeModal();
    });

    // ---- Landing camera ----
    var landing = { cx0: 200, cy0: 300, z0: 1 };
    function computeLanding() {
      var boxW = window.innerWidth, boxH = window.innerHeight;
      var u = Math.min(boxW / 340, boxH / 540);
      var z0 = 0.65 * boxH / (498 * u);
      var screenY = boxH * (0.97 - 0.325);
      var cy0 = 305 - (screenY - boxH / 2) / (u * z0);
      landing = { cx0: 200, cy0: cy0, z0: z0, u: u };
    }

    // ---- Timeline ----
    var timeline = { segs: [], total: 0, H: window.innerHeight };
    function buildTimeline() {
      var H = window.innerHeight;
      var segs = [];
      var cursor = 0;
      segs.push({ type: 'hold', start: cursor, end: cursor + 0.5 * H });
      cursor += 0.5 * H;

      COLLECTIONS.forEach(function (col, i) {
        var trackHeight = roomTrackEls[i].offsetHeight;
        var startY = TRACK_START_Y;
        var endY = Math.min(TRACK_START_Y, H - trackHeight - 40);
        var travel = startY - endY;
        var roomDur = Math.max(travel, 0.5 * H);

        segs.push({ type: 'zoomIn', start: cursor, end: cursor + 0.9 * H, index: i });
        cursor += 0.9 * H;
        segs.push({ type: 'room', start: cursor, end: cursor + roomDur, index: i, startY: startY, endY: endY, travel: travel });
        cursor += roomDur;
        segs.push({ type: 'zoomOut', start: cursor, end: cursor + 0.9 * H, index: i });
        cursor += 0.9 * H;
        segs.push({ type: 'gap', start: cursor, end: cursor + 0.12 * H });
        cursor += 0.12 * H;
      });

      segs.push({ type: 'holdEnd', start: cursor, end: cursor + 0.8 * H });
      cursor += 0.8 * H;

      timeline = { segs: segs, total: cursor, H: H };
      spacerEl.style.height = (cursor + H) + 'px';
    }

    function findSegment(y) {
      var segs = timeline.segs;
      for (var i = 0; i < segs.length; i++) {
        if (y >= segs[i].start && y < segs[i].end) return segs[i];
      }
      return segs[segs.length - 1];
    }

    // ---- Render ----
    function render(y) {
      var seg = findSegment(y);
      var cam = { cx: landing.cx0, cy: landing.cy0, z: landing.z0 };
      var activeIndex = -1, roomOpacity = 0, trackY = null;
      var zmax = 2200 / window.innerWidth;

      if (seg.type === 'zoomIn' || seg.type === 'zoomOut') {
        var raw = clamp((y - seg.start) / (seg.end - seg.start), 0, 1);
        var t = seg.type === 'zoomIn' ? raw : 1 - raw;
        var win = House.windows[seg.index];
        var te = easeInOutCubic(t);
        var z = Math.exp(Math.log(landing.z0) + (Math.log(zmax) - Math.log(landing.z0)) * te);
        var c = 1 - Math.pow(1 - t, 2.2);
        cam = {
          cx: landing.cx0 + (win.cx - landing.cx0) * c,
          cy: landing.cy0 + (win.cy - landing.cy0) * c,
          z: z
        };
        roomOpacity = smoothstep(0.72, 0.96, t);
        activeIndex = seg.index;
        trackY = TRACK_START_Y;
      } else if (seg.type === 'room') {
        var winR = House.windows[seg.index];
        cam = { cx: winR.cx, cy: winR.cy, z: zmax };
        roomOpacity = 1;
        activeIndex = seg.index;
        var rp = clamp((y - seg.start) / (seg.end - seg.start), 0, 1);
        var p = clamp((rp - 0.04) / 0.92, 0, 1);
        trackY = seg.startY - p * seg.travel;
      }

      camGroupEl.setAttribute('transform',
        'translate(200 300) scale(' + cam.z.toFixed(5) + ') translate(' + (-cam.cx).toFixed(2) + ' ' + (-cam.cy).toFixed(2) + ')');
      House.setScale(cam.z);

      roomEls.forEach(function (el, i) {
        var active = (i === activeIndex);
        if (active) {
          el.style.visibility = 'visible';
          el.style.opacity = roomOpacity;
          if (trackY != null) {
            roomTrackEls[i].style.transform = 'translate3d(0,' + trackY.toFixed(1) + 'px,0)';
          }
        } else {
          el.style.visibility = 'hidden';
          el.style.opacity = 0;
        }
        el.classList.toggle('active', active && roomOpacity >= 0.999);
      });

      svgEl.style.visibility = roomOpacity >= 1 ? 'hidden' : 'visible';

      var heroFade = 1 - clamp(y / (0.3 * timeline.H), 0, 1);
      heroEl.style.opacity = heroFade;
      hintEl.style.opacity = heroFade;

      var finaleStart = timeline.total - 0.8 * timeline.H;
      var finaleP = clamp((y - finaleStart) / (0.8 * timeline.H), 0, 1);
      finaleEl.style.opacity = finaleP;
    }

    // ---- Smooth scroll loop ----
    var scrollState = { cur: 0, target: 0 };
    var ticking = false;
    function frame() {
      var diff = scrollState.target - scrollState.cur;
      if (Math.abs(diff) > 0.3) {
        scrollState.cur += diff * 0.2;
        render(scrollState.cur);
        requestAnimationFrame(frame);
      } else {
        scrollState.cur = scrollState.target;
        render(scrollState.cur);
        ticking = false;
      }
    }
    function onScroll() {
      scrollState.target = window.scrollY;
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    function recompute() {
      computeLanding();
      buildTimeline();
      render(scrollState.cur);
    }
    window.addEventListener('resize', recompute);
    window.addEventListener('load', recompute);

    computeLanding();
    buildTimeline();
    render(0);
  });
})();
