/**
 * cms-loader.js — 台所の魔法 / Kitchen Witch
 * Decap CMS で編集した JSON コンテンツを各ページの DOM に反映させる
 */
(function () {
  'use strict';

  /* ── ユーティリティ ── */

  function nl2br(str) {
    return String(str || '').replace(/\n/g, '<br>');
  }

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  function setText(el, val) { if (el && val != null) el.textContent = String(val); }
  function setHtml(el, html) { if (el && html != null) el.innerHTML = html; }

  function fetchJson(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* ── settings.json ローダー（全ページ共通） ── */
  function loadSettings() {
    fetchJson('/content/settings.json').then(function (d) {
      var snsMap = {
        instagram: '[aria-label="Instagram"]',
        note_url:  '[aria-label="note"]',
        youtube:   '[aria-label="YouTube"]'
      };
      Object.keys(snsMap).forEach(function (key) {
        if (!d[key]) return;
        qsa(snsMap[key]).forEach(function (el) { el.href = d[key]; });
      });
      if (d.site_name_ja) qsa('.footer-logo-ja').forEach(function (el) { setText(el, d.site_name_ja); });
      if (d.site_name_en) qsa('.footer-logo-en').forEach(function (el) { setText(el, d.site_name_en); });
      if (d.tagline) qsa('.footer-tagline').forEach(function (el) { setHtml(el, nl2br(d.tagline)); });
      if (d.copyright) qsa('.site-footer__copy small').forEach(function (el) { setText(el, d.copyright); });
    }).catch(function () {});
  }

  /* ── トップページ (top.json) ── */
  function loadTopPage() {
    fetchJson('/content/pages/top.json').then(function (d) {

      // Hero
      setText(qs('.hero__title'), d.hero_title);
      if (d.hero_sub) setHtml(qs('.hero__copy'), nl2br(d.hero_sub));

      // About
      setText(qs('#about-title'), d.about_title);
      setText(qs('.about-lead'), d.about_lead);
      if (d.about_body) {
        var bodyEl = qs('.about-text');
        if (bodyEl) {
          bodyEl.querySelectorAll('.about-body').forEach(function (e) { e.remove(); });
          var btnEl = bodyEl.querySelector('.btn');
          var frag = document.createDocumentFragment();
          d.about_body.split(/\n\n+/).forEach(function (p) {
            var el = document.createElement('p');
            el.className = 'about-body';
            el.innerHTML = p.replace(/\n/g, '<br>');
            frag.appendChild(el);
          });
          bodyEl.insertBefore(frag, btnEl);
        }
      }

      // バリューカード
      renderValueCards('about-cards-grid', d.values);

      // 季節レシピカード
      renderSeasonCards('home-recipe-grid', d.season_recipes);

      // お客様の声（トップ）
      renderVoiceCardsSimple('home-voice-grid', d.voices);

      // 登録者数
      var trustSpans = qsa('.cta-final__trust span');
      if (trustSpans.length > 0 && d.member_count) setText(trustSpans[0], d.member_count);

    }).catch(function () {});
  }

  /* ── コンセプトページ (concept.json + top.json) ── */
  function loadConceptPage() {
    fetchJson('/content/pages/top.json').then(function (d) {
      renderValueCards('concept-values-grid', d.values);
    }).catch(function () {});

    fetchJson('/content/pages/concept.json').then(function (d) {
      setText(qs('#page-title'), d.page_title);
      if (d.page_sub) setHtml(qs('.page-hero__sub'), nl2br(d.page_sub));

      // フードレメディ 6原則
      var priGrid = qs('#concept-principles-grid');
      if (priGrid && Array.isArray(d.principles)) {
        priGrid.innerHTML = d.principles.map(function (p, i) {
          return '<div class="remedy-card kw-reveal" style="--kw-i:' + (i % 3) + '">' +
            '<span class="remedy-card__num">' + (p.num || '') + '</span>' +
            '<h3 class="remedy-card__title">' + (p.title || '') + '</h3>' +
            '<p class="remedy-card__text">' + (p.body || '') + '</p>' +
            '</div>';
        }).join('');
      }

      // 四季セクション
      renderSeasonCards('concept-seasons-grid', d.seasons, true);

    }).catch(function () {});
  }

  /* ── サービスページ (service.json) ── */
  function loadServicePage() {
    fetchJson('/content/pages/service.json').then(function (d) {

      // サービスカード
      var svcGrid = qs('#service-cards-grid');
      if (svcGrid && Array.isArray(d.cards)) {
        svcGrid.innerHTML = d.cards.map(function (c, i) {
          var features = (c.features || []).map(function (f) { return '<li>' + f + '</li>'; }).join('');
          var priceNote = c.price_note ? '<span class="price-unit">（' + c.price_note + '）</span>' : '';
          return '<article class="service-card kw-reveal" style="--kw-i:' + i + '">' +
            '<div class="service-card__head">' +
            '<span class="service-card__icon">' + (c.icon || '') + '</span>' +
            '<p class="service-card__category">' + (c.category || '') + '</p>' +
            '<h3 class="service-card__title">' + nl2br(c.title || '') + '</h3>' +
            '</div>' +
            '<div class="service-card__body">' +
            '<p class="service-card__desc">' + (c.desc || '') + '</p>' +
            '<ul class="service-detail-list">' + features + '</ul>' +
            '<div class="service-card__price">' +
            '<span class="price-label">料金</span>' +
            '<span class="price-amount">' + (c.price || '') + '</span>' +
            priceNote +
            '</div></div></article>';
        }).join('');
      }

      // FAQ
      var faqGrid = qs('#service-faq-grid');
      if (faqGrid && Array.isArray(d.faq)) {
        faqGrid.innerHTML = d.faq.map(function (f, i) {
          var num = 'Q ' + String(i + 1).padStart(2, '0');
          return '<div class="remedy-card">' +
            '<span class="remedy-card__num">' + num + '</span>' +
            '<h3 class="remedy-card__title">' + (f.q || '') + '</h3>' +
            '<p class="remedy-card__text">' + (f.a || '') + '</p>' +
            '</div>';
        }).join('');
      }

    }).catch(function () {});
  }

  /* ── お客様の声ページ (voice.json) ── */
  function loadVoicePage() {
    fetchJson('/content/pages/voice.json').then(function (d) {

      // 統計バー
      if (d.stats) {
        var statNums   = qsa('.voice-stat__num');
        var statLabels = qsa('.voice-stat__label');
        var stats = [
          [d.stats.members,      d.stats.members_label],
          [d.stats.satisfaction, d.stats.satisfaction_label],
          [d.stats.retention,    d.stats.retention_label]
        ];
        stats.forEach(function (s, i) {
          if (statNums[i]   && s[0]) setHtml(statNums[i], s[0]);
          if (statLabels[i] && s[1]) setText(statLabels[i], s[1]);
        });
      }

      renderVoiceCardsDetail('voice-recipe-grid',  d.recipe_voices);
      renderVoiceCardsDetail('voice-course-grid',  d.course_voices);
      renderVoiceCardsDetail('voice-retreat-grid', d.retreat_voices);

    }).catch(function () {});
  }

  /* ── リトリートページ (retreat.json) ── */
  function loadRetreatPage() {
    fetchJson('/content/pages/retreat.json').then(function (d) {

      // プログラムカード
      var proGrid = qs('#retreat-programs-grid');
      if (proGrid && Array.isArray(d.programs)) {
        var visualClass = ['spring', 'forest', 'harvest'];
        proGrid.innerHTML = d.programs.map(function (p, i) {
          var vc = visualClass[i] || 'forest';
          var metaHtml = [
            ['期間', p.duration],
            ['定員', p.capacity],
            ['場所', p.location],
            ['参加費', p.price]
          ].map(function (m) {
            return '<div class="retreat-meta-item">' +
              '<span class="retreat-meta-label">' + m[0] + '</span>' +
              '<span class="retreat-meta-value">' + (m[1] || '') + '</span></div>';
          }).join('');
          return '<article class="retreat-card kw-reveal" style="--kw-i:' + i + '">' +
            '<div class="retreat-card__visual retreat-card__visual--' + vc + '">' +
            '<span class="retreat-card__emoji">' + (p.emoji || '') + '</span>' +
            '<span class="retreat-card__badge">' + (p.season_badge || '') + '</span>' +
            '</div>' +
            '<div class="retreat-card__body">' +
            '<p class="retreat-card__season">' + (p.season || '') + '</p>' +
            '<h3 class="retreat-card__title">' + nl2br(p.title || '') + '</h3>' +
            '<p class="retreat-card__desc">' + (p.desc || '') + '</p>' +
            '<div class="retreat-card__meta">' + metaHtml + '</div>' +
            '</div></article>';
        }).join('');
      }

      // スケジュール
      var schedGrid = qs('#retreat-schedule-timeline');
      if (schedGrid && Array.isArray(d.schedule)) {
        schedGrid.innerHTML = d.schedule.map(function (s) {
          return '<div class="timeline-item">' +
            '<p class="timeline-item__year">' + (s.time || '') + '</p>' +
            '<h3 class="timeline-item__title">' + (s.title || '') + '</h3>' +
            '<p class="timeline-item__text">' + (s.text || '') + '</p>' +
            '</div>';
        }).join('');
      }

      // 参加者の声
      renderVoiceCardsSimple('retreat-voice-grid', d.voices);

    }).catch(function () {});
  }

  /* ── ストーリーページ (story.json) ── */
  function loadStoryPage() {
    fetchJson('/content/pages/story.json').then(function (d) {
      setText(qs('.story-portrait__caption .caption-name'), d.portrait_name);

      // タイムライン
      var timeline = qs('#story-timeline');
      if (timeline && Array.isArray(d.timeline)) {
        timeline.innerHTML = d.timeline.map(function (t) {
          return '<div class="timeline-item">' +
            '<p class="timeline-item__year">' + (t.year || '') + '</p>' +
            '<h3 class="timeline-item__title">' + (t.title || '') + '</h3>' +
            '<p class="timeline-item__text">' + (t.text || '') + '</p>' +
            '</div>';
        }).join('');
      }

    }).catch(function () {});
  }

  /* ── 共通レンダラー ── */

  function renderValueCards(containerId, values) {
    var grid = qs('#' + containerId);
    if (!grid || !Array.isArray(values)) return;
    grid.innerHTML = values.map(function (v, i) {
      return '<div class="value-card kw-reveal" style="--kw-i:' + i + '">' +
        '<div class="value-card__icon">' + (v.icon || '') + '</div>' +
        '<h3 class="value-card__title">' + (v.title || '') + '</h3>' +
        '<p class="value-card__text">' + (v.text || '') + '</p>' +
        '</div>';
    }).join('');
  }

  function renderSeasonCards(containerId, seasons, isConcept) {
    var grid = qs('#' + containerId);
    if (!grid || !Array.isArray(seasons)) return;
    var seasonClass = ['spring', 'summer', 'autumn', 'winter'];
    grid.innerHTML = seasons.map(function (s, i) {
      var sc = seasonClass[i] || 'spring';
      var tags = (s.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
      var bodyField = isConcept ? (s.body || '') : (s.desc || '');
      return '<article class="recipe-card kw-reveal" style="--kw-i:' + i + '">' +
        '<div class="recipe-card__photo recipe-card__photo--' + sc + '">' +
        '<span class="recipe-card__emoji">' + (s.emoji || '') + '</span>' +
        '<div class="recipe-card__season-badge">' +
        '<span class="season-en">' + (s.season_en || '') + '</span>' +
        '<span class="season-ja">' + (s.season_ja || '') + '</span></div>' +
        '</div>' +
        '<div class="recipe-card__body">' +
        '<h3 class="recipe-card__title">' + (s.title || '') + '</h3>' +
        '<p class="recipe-card__text">' + bodyField + '</p>' +
        '<div class="recipe-card__tags">' + tags + '</div>' +
        '</div></article>';
    }).join('');
  }

  function renderVoiceCardsSimple(containerId, voices) {
    var grid = qs('#' + containerId);
    if (!grid || !Array.isArray(voices)) return;
    grid.innerHTML = voices.map(function (v, i) {
      return '<div class="voice-card kw-reveal" style="--kw-i:' + i + '">' +
        '<div class="voice-card__stars" aria-label="星5つ">★★★★★</div>' +
        '<p class="voice-card__text">' + (v.text || '') + '</p>' +
        '<div class="voice-card__author">' +
        '<div class="voice-card__avatar">' + (v.avatar || '') + '</div>' +
        '<div>' +
        '<p class="voice-card__name">' + (v.name || '') + '</p>' +
        '<p class="voice-card__badge">' + (v.badge || '') + '</p>' +
        '</div></div></div>';
    }).join('');
  }

  function renderVoiceCardsDetail(containerId, voices) {
    var grid = qs('#' + containerId);
    if (!grid || !Array.isArray(voices)) return;
    grid.innerHTML = voices.map(function (v, i) {
      var detail = v.detail ? '<p class="voice-card__detail">' + v.detail + '</p>' : '';
      return '<div class="voice-card kw-reveal" style="--kw-i:' + i + '">' +
        '<div class="voice-card__stars" aria-label="星5つ">★★★★★</div>' +
        '<p class="voice-card__text">' + (v.text || '') + '</p>' +
        '<div class="voice-card__author">' +
        '<div class="voice-card__avatar">' + (v.avatar || '') + '</div>' +
        '<div>' +
        '<p class="voice-card__name">' + (v.name || '') + '</p>' +
        '<p class="voice-card__badge">' + (v.badge || '') + '</p>' +
        '</div></div>' + detail + '</div>';
    }).join('');
  }

  /* ── 公開 API ── */
  window.KwCms = {
    loadSettings:    loadSettings,
    loadTopPage:     loadTopPage,
    loadConceptPage: loadConceptPage,
    loadServicePage: loadServicePage,
    loadVoicePage:   loadVoicePage,
    loadRetreatPage: loadRetreatPage,
    loadStoryPage:   loadStoryPage
  };

}());
