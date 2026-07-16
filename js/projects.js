/* ============================================
   RECENT PROJECTS — dynamic carousel
   Fetches the latest projects from the Walls & Dreams
   WordPress REST API (custom post type "projects") and
   renders them into an auto-advancing carousel.
   Self-contained; does not touch js/main.js.
============================================ */
(function () {
  'use strict';

  var FALLBACK_ENDPOINT =
    'https://wallsanddreams.com/wp-json/wp/v2/projects?per_page=10&_embed';
  var AUTOPLAY_MS = 4000;

  function init() {
    var section = document.querySelector('[data-projects]');
    if (!section) return;

    var carousel = section.querySelector('[data-proj-carousel]');
    var track = section.querySelector('[data-proj-track]');
    var controls = section.querySelector('[data-proj-controls]');
    var prevBtn = section.querySelector('[data-proj-prev]');
    var nextBtn = section.querySelector('[data-proj-next]');
    var dotsContainer = section.querySelector('[data-proj-dots]');
    var autoBar = section.querySelector('[data-proj-auto-bar]');
    var autoFill = section.querySelector('[data-proj-auto-fill]');
    if (!track) return;

    var endpoint = section.getAttribute('data-endpoint') || FALLBACK_ENDPOINT;

    renderSkeletons();
    fetchProjects();

    /* ---------- Data ---------- */

    function fetchProjects() {
      fetch(endpoint, { headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (posts) {
          if (!Array.isArray(posts) || posts.length === 0) {
            failGracefully('No projects returned.');
            return;
          }
          renderCards(posts);
          setupCarousel();
        })
        .catch(function (err) {
          failGracefully(err && err.message ? err.message : err);
        });
    }

    function failGracefully(reason) {
      // Marketing page: never show a broken/empty widget — hide the section.
      section.hidden = true;
      if (window.console && console.warn) {
        console.warn('[projects] hidden —', reason);
      }
    }

    /* ---------- Rendering ---------- */

    function renderSkeletons() {
      track.innerHTML = '';
      for (var i = 0; i < 3; i++) {
        var sk = document.createElement('div');
        sk.className = 'proj-card proj-card--skeleton';
        sk.setAttribute('aria-hidden', 'true');
        sk.innerHTML =
          '<div class="proj-card-media proj-skeleton"></div>' +
          '<div class="proj-card-body">' +
          '<div class="proj-skeleton proj-skeleton-line"></div>' +
          '<div class="proj-skeleton proj-skeleton-line"></div>' +
          '<div class="proj-skeleton proj-skeleton-line proj-skeleton-line--short"></div>' +
          '</div>';
        track.appendChild(sk);
      }
    }

    function renderCards(posts) {
      track.innerHTML = '';
      posts.forEach(function (post) {
        track.appendChild(buildCard(post));
      });
    }

    function buildCard(post) {
      var title = decodeEntities((post.title && post.title.rendered) || 'Project');
      var href = post.link || '#';

      var card = document.createElement('a');
      card.className = 'proj-card';
      card.href = href; // same-tab navigation to the WordPress project page

      // Media
      var media = document.createElement('div');
      media.className = 'proj-card-media';
      var img = getFeaturedImage(post);
      if (img && img.url) {
        var el = document.createElement('img');
        el.src = img.url;
        el.alt = img.alt || title;
        el.loading = 'lazy';
        el.decoding = 'async';
        el.addEventListener('error', function () {
          media.classList.add('proj-card-media--empty');
          if (el.parentNode) media.removeChild(el);
        });
        media.appendChild(el);
      } else {
        media.classList.add('proj-card-media--empty');
      }

      // Optional category badge
      var category = getCategory(post);
      if (category) {
        var tag = document.createElement('span');
        tag.className = 'proj-card-tag';
        tag.textContent = category;
        media.appendChild(tag);
      }
      card.appendChild(media);

      // Body
      var body = document.createElement('div');
      body.className = 'proj-card-body';

      var h3 = document.createElement('h3');
      h3.className = 'proj-card-title';
      h3.textContent = title;
      body.appendChild(h3);

      var descText = getDescription(post);
      if (descText) {
        var desc = document.createElement('p');
        desc.className = 'proj-card-desc';
        desc.textContent = descText;
        body.appendChild(desc);
      }

      var cta = document.createElement('span');
      cta.className = 'proj-card-cta';
      cta.innerHTML =
        'View Project' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
      body.appendChild(cta);

      card.appendChild(body);
      return card;
    }

    function getFeaturedImage(post) {
      var embedded = post._embedded || {};
      var media = embedded['wp:featuredmedia'];
      if (!media || !media.length) return null;
      var m = media[0];
      if (!m || m.code) return null; // error object (e.g. no permission)

      var url = '';
      var sizes = m.media_details && m.media_details.sizes;
      if (sizes) {
        var pref = ['large', 'medium_large', 'medium', 'full'];
        for (var i = 0; i < pref.length; i++) {
          if (sizes[pref[i]] && sizes[pref[i]].source_url) {
            url = sizes[pref[i]].source_url;
            break;
          }
        }
      }
      if (!url) url = m.source_url || '';
      if (!url) return null;

      return { url: url, alt: m.alt_text || '' };
    }

    function getDescription(post) {
      // The projects CPT has no editorial excerpt; the Yoast meta description
      // is a clean, human-readable sentence present on every project.
      var y = post.yoast_head_json || {};
      var raw =
        y.description ||
        y.og_description ||
        (post.excerpt && post.excerpt.rendered) ||
        '';
      var text = decodeEntities(raw);
      if (!text && post.content && post.content.rendered) {
        text = decodeEntities(post.content.rendered).slice(0, 160);
      }
      return text;
    }

    function getCategory(post) {
      var embedded = post._embedded || {};
      var termGroups = embedded['wp:term'];
      if (!termGroups || !termGroups.length) return '';
      for (var i = 0; i < termGroups.length; i++) {
        var group = termGroups[i];
        if (!group || !group.length) continue;
        for (var j = 0; j < group.length; j++) {
          var term = group[j];
          if (term && term.taxonomy === 'project_category' && term.name) {
            return decodeEntities(term.name);
          }
        }
      }
      return '';
    }

    var _decoder;
    function decodeEntities(str) {
      if (!str) return '';
      if (!_decoder) _decoder = document.createElement('textarea');
      _decoder.innerHTML = str;
      var text = _decoder.value;
      // Strip any residual tags (titles are plain text; belt-and-braces).
      return text.replace(/<[^>]*>/g, '').trim();
    }

    /* ---------- Carousel ---------- */

    function setupCarousel() {
      var cards = Array.prototype.slice.call(track.children);
      if (!cards.length) return;

      var reduceMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (controls) controls.hidden = false;

      function getCardsPerView() {
        var w = window.innerWidth;
        if (w >= 1101) return 3;
        if (w >= 721) return 2;
        return 1;
      }
      function getGap() {
        var cs = getComputedStyle(track);
        return parseFloat(cs.columnGap || cs.gap) || 0;
      }
      function getPageCount() {
        return Math.max(1, Math.ceil(cards.length / getCardsPerView()));
      }
      function getPageWidth() {
        var cardW = cards[0].getBoundingClientRect().width;
        return (cardW + getGap()) * getCardsPerView();
      }
      function getCurrentPage() {
        return Math.round(track.scrollLeft / (getPageWidth() || 1));
      }

      function buildDots() {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        var count = getPageCount();
        for (var i = 0; i < count; i++) {
          (function (idx) {
            var dot = document.createElement('button');
            dot.className = 'proj-dot' + (idx === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
            dot.addEventListener('click', function () {
              stopAuto();
              goTo(idx);
              if (!isPaused()) startAuto();
            });
            dotsContainer.appendChild(dot);
          })(i);
        }
      }

      function goTo(page) {
        var max = getPageCount() - 1;
        var target = Math.max(0, Math.min(page, max));
        track.scrollTo({ left: target * getPageWidth(), behavior: 'smooth' });
      }

      function update() {
        var current = getCurrentPage();
        var last = getPageCount() - 1;
        if (dotsContainer) {
          var dots = dotsContainer.querySelectorAll('.proj-dot');
          for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('active', i === current);
          }
        }
        if (prevBtn) prevBtn.disabled = current <= 0;
        if (nextBtn) nextBtn.disabled = current >= last;
      }

      // Single page: no dots, arrows, autoplay or progress bar.
      var singlePage = getPageCount() <= 1;
      if (singlePage) {
        if (dotsContainer) dotsContainer.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (autoBar) autoBar.style.display = 'none';
        return;
      }

      if (prevBtn) prevBtn.addEventListener('click', function () {
        stopAuto();
        goTo(getCurrentPage() - 1);
      });
      if (nextBtn) nextBtn.addEventListener('click', function () {
        stopAuto();
        goTo(getCurrentPage() + 1);
      });

      var ticking = false;
      track.addEventListener('scroll', function () {
        if (!ticking) {
          requestAnimationFrame(function () { update(); ticking = false; });
          ticking = true;
        }
      }, { passive: true });

      // Drag to scroll (6px threshold cancels the click so a drag never navigates)
      var isDown = false, startX = 0, startScroll = 0, moved = 0;
      var DRAG_THRESHOLD = 6;

      track.addEventListener('mousedown', function (e) {
        isDown = true; moved = 0; startX = e.pageX; startScroll = track.scrollLeft;
        track.classList.add('is-dragging');
        stopAuto();
      });
      track.addEventListener('mousemove', function (e) {
        if (!isDown) return;
        var dx = e.pageX - startX;
        moved = Math.abs(dx);
        track.scrollLeft = startScroll - dx;
        e.preventDefault();
      });
      function endDrag() {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('is-dragging');
        if (moved >= DRAG_THRESHOLD) {
          var pageW = getPageWidth();
          track.scrollTo({ left: Math.round(track.scrollLeft / pageW) * pageW, behavior: 'smooth' });
        }
        if (!isPaused()) startAuto();
      }
      track.addEventListener('mouseup', endDrag);
      track.addEventListener('mouseleave', endDrag);
      // Capture-phase click cancel: a drag must not trigger card navigation.
      track.addEventListener('click', function (e) {
        if (moved >= DRAG_THRESHOLD) { e.preventDefault(); e.stopPropagation(); }
      }, true);
      track.addEventListener('dragstart', function (e) { e.preventDefault(); });

      // Touch
      track.addEventListener('touchstart', function () {
        stopAuto();
      }, { passive: true });
      track.addEventListener('touchend', function () {
        var pageW = getPageWidth();
        track.scrollTo({ left: Math.round(track.scrollLeft / pageW) * pageW, behavior: 'smooth' });
        if (!isPaused()) startAuto();
      }, { passive: true });

      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          buildDots();
          goTo(0);
          update();
        }, 150);
      });

      /* ---------- Autoplay + progress bar ---------- */

      var autoTimer = null;
      var autoStart = 0;
      var rafId = null;
      var hovering = false;
      var focused = false;
      var docHidden = false;

      function isPaused() {
        return reduceMotion || hovering || focused || docHidden;
      }

      function tickBar() {
        if (!autoFill) return;
        var elapsed = performance && performance.now
          ? performance.now() - autoStart
          : Date.now() - autoStart;
        var pct = Math.min(100, (elapsed / AUTOPLAY_MS) * 100);
        autoFill.style.width = pct + '%';
        if (pct < 100) rafId = requestAnimationFrame(tickBar);
      }

      function startAuto() {
        if (reduceMotion) return;
        stopAuto();
        autoStart = performance && performance.now ? performance.now() : Date.now();
        if (autoFill) { autoFill.style.width = '0%'; rafId = requestAnimationFrame(tickBar); }
        autoTimer = setInterval(function () {
          var next = getCurrentPage() + 1;
          if (next > getPageCount() - 1) next = 0; // wrap around
          goTo(next);
          autoStart = performance && performance.now ? performance.now() : Date.now();
        }, AUTOPLAY_MS);
      }

      function stopAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (autoFill) autoFill.style.width = '0%';
      }

      function maybeStart() { if (!isPaused()) startAuto(); }

      if (carousel) {
        carousel.addEventListener('mouseenter', function () { hovering = true; stopAuto(); });
        carousel.addEventListener('mouseleave', function () { hovering = false; maybeStart(); });
        carousel.addEventListener('focusin', function () { focused = true; stopAuto(); });
        carousel.addEventListener('focusout', function () { focused = false; maybeStart(); });
      }
      document.addEventListener('visibilitychange', function () {
        docHidden = document.hidden;
        if (docHidden) stopAuto(); else maybeStart();
      });

      buildDots();
      update();
      maybeStart();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
