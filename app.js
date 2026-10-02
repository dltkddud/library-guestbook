/* =====================================================================
   app.js : 미니홈피의 "동작"을 담당하는 파일
   ---------------------------------------------------------------------
   구성
     0. 공통 도구        : 자주 쓰는 작은 함수들
     1. 언어(한/영)      : 선택한 언어의 문구를 화면에 채움
     2. 탭               : 홈 / 다이어리 / 사진첩 / 방명록 전환
     3. 프로필·사진첩    : 이미지 표시, 파일이 없을 때 대체 처리
     3-2. 미니룸        : 방 그림 위를 캐릭터가 지점 사이로 걸어다님
     4. 서버 통신        : 방명록 불러오기(GET), 남기기(POST)
     5. 방명록 화면      : 목록 그리기, 입력 검사, 등록, 본인 글 삭제
     6. BGM             : 저절로 흐르고 음량만 조절, 곡이 끝나면 다음 곡
     7. 시작             : 페이지가 열리면 위 기능들을 순서대로 켬
   내용·설정 값은 전부 config.js의 CONFIG, TEXT에서 가져와.
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- 0-1. 옛 브라우저 보완 ----------
     replaceChildren는 2020년 하반기 이후 브라우저에만 있어. 그 전 기기(iOS 14 이하 등)에서는
     이게 없어서 화면이 통째로 안 그려져. 없을 때만 같은 동작을 직접 만들어 끼워 넣음. */
  if (!Element.prototype.replaceChildren) {
    Element.prototype.replaceChildren = function () {
      while (this.firstChild) this.removeChild(this.firstChild);
      if (arguments.length) this.append.apply(this, arguments);
    };
  }

  /* ---------- 0. 공통 도구 ---------- */

  const $ = (selector) => document.querySelector(selector);

  // 태그를 만들고 클래스·글자를 한 번에 넣는 도구.
  // 글자는 항상 textContent로 넣어서, 누가 방명록에 코드를 적어도 실행되지 않게 막아.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // 글자 수: 이모지도 1글자로 세기 위해 Array.from 사용
  const charCount = (str) => Array.from(str).length;

  // 단어 수: 띄어쓰기(공백, 줄바꿈) 기준
  function wordCount(str) {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  // 날짜 표시: 2026.10.05 12:30 형식 (보는 사람 기기의 시간대 기준)
  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // 닉네임마다 항상 같은 색의 책 아이콘이 나오게, 닉네임으로 색을 고르는 함수
  const AVATAR_COLORS = ['#501D83', '#00A597', '#E4B84A', '#E57C6E', '#3B4C8C', '#7A4BAA', '#3FA56B'];
  function colorFor(name) {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }

  // 브라우저 저장소는 개인정보 보호 모드 등에서 막힐 수 있어서 실패해도 넘어가게 감쌈
  const storage = {
    get(store, key) { try { return window[store].getItem(key); } catch { return null; } },
    set(store, key, value) { try { window[store].setItem(key, value); } catch { /* 무시 */ } },
  };

  // API_URL을 아직 안 넣었으면 데모 모드 (가짜 데이터로 화면만 확인)
  const DEMO = !/^https:\/\//.test(CONFIG.API_URL || '');

  // 마감 여부. 마감 뒤에는 새 글 등록도, 본인 글 삭제도 막음 (서버에서도 똑같이 막음)
  const isClosed = () => Date.now() > new Date(CONFIG.END_DATE).getTime();

  // 주소 뒤에 ?debug=1 을 붙이면 미니룸 위치 조정 도구가 켜짐
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
  // 기기에서 '움직임 줄이기'를 켠 사람에겐 캐릭터를 움직이지 않음
  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 화면 상태를 한곳에 모아둠
  const state = {
    lang: 'ko',
    loading: true,      // 방명록 불러오는 중인지
    loadError: false,   // 불러오기 실패했는지
    timedOut: false,    // 실패 이유가 '응답 없음'인지 (안내 문구를 다르게 보여주려고)
    entries: [],        // 방명록 글 목록 (최신순)
    stats: null,        // { today, total } 방문자 수
  };

  /* ---------- 1. 언어(한/영) ---------- */

  // 처음 언어: 예전에 고른 언어 → 기기 언어가 한국어면 ko → 그 외 en
  function initialLang() {
    const saved = storage.get('localStorage', 'gb-lang');
    if (saved === 'ko' || saved === 'en') return saved;
    return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }

  // 키에 맞는 문구 꺼내기. 영어 문구가 비어 있으면 한국어로 대신 보여줌
  function t(key) {
    const pack = TEXT[state.lang] || TEXT.ko;
    const value = pack[key] !== undefined ? pack[key] : (TEXT.ko[key] !== undefined ? TEXT.ko[key] : key);
    // 문구 속 {n}은 config.js의 학번 자릿수로 바꿔 넣음 (자릿수를 한 곳에서만 고치면 되게)
    return typeof value === 'string' ? value.replace('{n}', CONFIG.STUDENT_ID_DIGITS) : value;
  }

  // data-i18n 계열 속성이 붙은 모든 곳에 현재 언어 문구를 채우고, 목록형 내용도 다시 그림
  function applyLang() {
    document.documentElement.lang = state.lang;
    document.title = t('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-alt]').forEach((node) => { node.alt = t(node.dataset.i18nAlt); });

    renderIntro();
    renderIlchon();
    renderDiary();
    renderPhotos();
    renderEntries();
    renderStats();
    updateCounts();
    renderBgm();
  }

  function initLang() {
    state.lang = initialLang();
    const select = $('#lang-select');
    select.value = state.lang;
    select.addEventListener('change', () => {
      state.lang = select.value;
      storage.set('localStorage', 'gb-lang', state.lang);
      applyLang();
    });
  }

  /* ---------- 2. 탭 ---------- */

  function showTab(name) {
    document.querySelectorAll('[role="tab"]').forEach((btn) => {
      const active = btn.dataset.tab === name;
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      panel.hidden = panel.id !== `tab-${name}`;
    });
  }

  function initTabs() {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    tabs.forEach((btn, i) => {
      btn.addEventListener('click', () => showTab(btn.dataset.tab));
      // 키보드 방향키로도 탭 이동 가능하게 (접근성)
      btn.addEventListener('keydown', (e) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = tabs[(i + step + tabs.length) % tabs.length];
        showTab(next.dataset.tab);
        next.focus();
      });
    });
    // 홈의 '방명록 전체 보기' 버튼
    $('#go-guestbook').addEventListener('click', () => {
      showTab('guestbook');
      $('#tabbtn-guestbook').focus();
    });
    showTab('home');
  }

  /* ---------- 3. 프로필·사진첩·다이어리 ---------- */

  function initProfile() {
    const img = $('#profile-img');
    const figure = $('#profile-figure');
    // 프로필 사진이 없으면 '사진 준비 중' 자리 표시로 바꿈
    img.addEventListener('error', () => {
      figure.classList.add('missing');
      img.remove();
      const ph = el('div', 'ph');
      ph.dataset.i18n = 'photoMissing';
      ph.textContent = t('photoMissing');
      figure.prepend(ph);
    });
    img.src = CONFIG.PROFILE_IMAGE;

    // 다이어리 사진: 경로가 있으면 보여주고, 파일이 없으면 칸째로 숨김
    const diaryFigure = $('#diary-photo');
    const diaryImg = $('#diary-img');
    if (CONFIG.DIARY_IMAGE) {
      diaryImg.addEventListener('load', () => { diaryFigure.hidden = false; });
      diaryImg.addEventListener('error', () => { diaryFigure.hidden = true; });
      diaryImg.src = CONFIG.DIARY_IMAGE;
    }

    loadMiniroom();

    // 파도타기: '새 도서관 홈페이지'를 고르면 새 탭으로 이동
    const wave = $('#wave-select');
    const newOption = wave.querySelector('option[value="new"]');
    if (!CONFIG.NEW_HOMEPAGE_URL) newOption.disabled = true;
    wave.addEventListener('change', () => {
      if (wave.value === 'new' && CONFIG.NEW_HOMEPAGE_URL) {
        window.open(CONFIG.NEW_HOMEPAGE_URL, '_blank', 'noopener');
      }
      wave.value = '';
    });
  }

  // 미니룸 그리기
  //  - MINIROOM_IMAGE가 있으면: 그 그림을 깔고 그 위에 캐릭터를 올림
  //  - 없으면: assets/miniroom.svg(코드로 그린 도트 방)를 예전처럼 불러와 넣음
  async function loadMiniroom() {
    const box = $('#miniroom');
    if (CONFIG.MINIROOM_IMAGE) {
      const stage = el('div', 'miniroom-stage');   // 캐릭터 위치의 기준이 되는 칸
      const room = el('img', 'miniroom-img');
      room.dataset.i18nAlt = 'roomAlt';
      room.alt = t('roomAlt');
      room.src = CONFIG.MINIROOM_IMAGE;
      stage.append(room);
      box.replaceChildren(stage);
      initMinimi(stage);
      return;
    }
    box.classList.add('is-svg');   // 예전 SVG 방은 가로세로 비율이 달라서 표시
    try {
      const res = await fetch('assets/miniroom.svg');
      if (!res.ok) throw new Error(res.status);
      box.innerHTML = await res.text(); // 우리 사이트의 고정 파일이라 그대로 넣어도 안전
      box.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    } catch (err) {
      console.error('미니룸 불러오기 실패 (Live Server로 열었는지 확인):', err);
    }
  }

  /* ---------- 3-2. 미니룸 캐릭터 ----------
     config.js의 MINIMI.spots(머무는 지점)와 MINIMI.paths(오갈 수 있는 길)만 보고 움직여.
     위치·크기는 모두 방 그림 기준 %라서, 화면이 커지면 캐릭터도 같이 커져. */

  function initMinimi(stage) {
    const conf = CONFIG.MINIMI || {};
    const poses = conf.poses || {};
    const spots = conf.spots || [];
    if (!spots.length || !poses.idle) return;

    // 걷는 중에 그림이 깜빡이지 않도록 모든 포즈를 미리 받아둠
    Object.values(poses).forEach((src) => { const pre = new Image(); pre.src = src; });

    const shadow = el('div', 'minimi-shadow');       // 발밑 그림자
    const sprite = el('img', 'minimi');
    sprite.alt = '';
    sprite.setAttribute('role', 'button');
    sprite.tabIndex = 0;
    sprite.style.imageRendering = conf.rendering === 'pixelated' ? 'pixelated' : 'auto';
    const bubble = el('div', 'minimi-bubble');
    bubble.hidden = true;
    stage.append(shadow, sprite, bubble);

    const height = Number(conf.height) || 20;        // 캐릭터 키 (방 높이의 %)
    const speed = Number(conf.speed) || 9;           // 1초에 가는 거리 (%)
    const stepMs = Number(conf.stepMs) || 300;       // 걷기 그림 바꾸는 간격
    const bubbleMs = Number(conf.bubbleMs) || 3400;
    // 혼잣말 간격 (이 사이에서 무작위로 정해짐)
    const chatterMin = Number(conf.chatterMin) || 10;
    const chatterMax = Number(conf.chatterMax) || 22;

    // 지점을 id로 찾고, 길로 이어진 이웃 목록을 만들어 둠
    const byId = new Map(spots.map((spot) => [spot.id, spot]));
    const links = new Map(spots.map((spot) => [spot.id, []]));
    (conf.paths || []).forEach(([a, b]) => {
      if (links.has(a) && links.has(b)) { links.get(a).push(b); links.get(b).push(a); }
    });

    // 지금 캐릭터 상태
    const me = { x: spots[0].x, y: spots[0].y, scale: spots[0].scale || 1, pose: spots[0].pose || 'idle', flip: !!spots[0].flip, spot: spots[0] };

    let seg = null;              // 지금 걷고 있는 구간 { from, to, len, done }
    let route = [];              // 앞으로 지날 지점들
    let paused = null;           // 말풍선 때문에 잠시 멈춰둔 상태
    let stayUntil = 0;           // 이 시각까지는 그 자리에 머묾
    let stepAt = 0;
    let walkFrame = 0;
    let bubbleUntil = 0;    // 눌러서 띄운 말풍선 (손 흔들며 멈춤)
    let chatterUntil = 0;   // 혼자 중얼거리는 말풍선 (걸음을 멈추지 않음)
    let chatterAt = 0;      // 다음 혼잣말을 할 시각
    let lastTime = 0;
    let lastSrc = '';

    function draw() {
      const h = height * me.scale;
      const src = poses[me.pose] || poses.idle;
      if (src !== lastSrc) { sprite.src = src; lastSrc = src; }   // 같은 그림이면 다시 안 바꿈
      sprite.style.height = `${h}%`;
      sprite.style.left = `${me.x}%`;
      sprite.style.top = `${me.y}%`;
      // 기준점(발)이 지점에 오도록 아래 가운데를 맞추고, 왼쪽으로 갈 땐 좌우 반전
      sprite.style.transform = `translate(-50%, -100%) scaleX(${me.flip ? -1 : 1})`;
      shadow.style.height = `${h * 0.07}%`;
      shadow.style.left = `${me.x}%`;
      shadow.style.top = `${me.y}%`;
      if (!bubble.hidden) {
        bubble.style.left = `${me.x}%`;
        bubble.style.top = `${me.y - h - 1}%`;   // 머리 위
      }
    }

    // 두 지점을 잇는 길 찾기 (가까운 곳부터 차례로 살펴보는 방식)
    function findRoute(fromId, toId) {
      const came = new Map([[fromId, null]]);
      const queue = [fromId];
      while (queue.length) {
        const id = queue.shift();
        if (id === toId) break;
        (links.get(id) || []).forEach((next) => {
          if (!came.has(next)) { came.set(next, id); queue.push(next); }
        });
      }
      if (!came.has(toId)) return [];
      const ids = [];
      for (let id = toId; id !== null && id !== undefined; id = came.get(id)) ids.unshift(id);
      return ids.slice(1).map((id) => byId.get(id));   // 출발 지점은 빼고
    }

    function pickDestination() {
      const others = spots.filter((spot) => spot.id !== me.spot.id);
      if (!others.length) return;
      const goal = others[Math.floor(Math.random() * others.length)];
      route = findRoute(me.spot.id, goal.id);
    }

    function startSegment() {
      const to = route[0];
      seg = { from: { x: me.x, y: me.y, scale: me.scale }, to, len: Math.hypot(to.x - me.x, to.y - me.y) || 0.001, done: 0 };
      me.flip = to.x < me.x;
    }

    function arrive(spot) {
      me.spot = spot;
      me.x = spot.x;
      me.y = spot.y;
      me.scale = spot.scale || 1;
      me.pose = spot.pose || 'idle';
      me.flip = !!spot.flip;
    }

    const between = (min, max) => min + Math.random() * (max - min);

    // 말풍선 두 종류가 모두 끝났을 때만 숨김
    function hideBubbleIfDone() {
      if (!bubbleUntil && !chatterUntil) bubble.hidden = true;
    }

    function tick(time) {
      const dt = Math.min(0.05, (time - (lastTime || time)) / 1000);
      lastTime = time;

      if (bubbleUntil && time > bubbleUntil) {
        // 눌러서 띄운 말풍선이 끝나면, 멈춰뒀던 걸음을 그대로 이어감
        bubbleUntil = 0;
        hideBubbleIfDone();
        seg = paused ? paused.seg : null;
        route = paused ? paused.route : [];
        paused = null;
        if (!seg && !route.length) arrive(me.spot);
      }
      if (chatterUntil && time > chatterUntil) {
        chatterUntil = 0;
        hideBubbleIfDone();
      }

      // 가끔 혼잣말 (걸어가면서도 함. 말풍선은 캐릭터를 따라다님)
      if (!bubbleUntil && !chatterUntil && time >= chatterAt) {
        const lines = t('minimiChatter');
        if (Array.isArray(lines) && lines.length) {
          bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
          bubble.hidden = false;
          chatterUntil = time + bubbleMs;
        }
        chatterAt = time + between(chatterMin, chatterMax) * 1000;
      }

      if (!bubbleUntil) {
        if (seg) {
          seg.done += speed * dt;
          const p = Math.min(1, seg.done / seg.len);
          me.x = seg.from.x + (seg.to.x - seg.from.x) * p;
          me.y = seg.from.y + (seg.to.y - seg.from.y) * p;
          // 크기는 지점 사이에서 조금씩 변함 (멀어질수록 작아지게)
          me.scale = seg.from.scale + ((seg.to.scale || 1) - seg.from.scale) * p;
          if (time > stepAt) { walkFrame ^= 1; stepAt = time + stepMs; }
          me.pose = walkFrame ? 'walk2' : 'walk1';
          if (p >= 1) {
            const reached = seg.to;
            seg = null;
            route.shift();
            if (route.length) startSegment();
            else {
              arrive(reached);
              stayUntil = time + between(Number(conf.stayMin) || 3, Number(conf.stayMax) || 6) * 1000;
            }
          }
        } else if (time >= stayUntil) {
          pickDestination();
          if (route.length) startSegment();
          else stayUntil = time + 2000;
        }
      }

      draw();
      requestAnimationFrame(tick);
    }

    // 캐릭터를 누르면 손을 흔들며 말풍선 (문구는 config.js의 minimiBubbles에서 무작위)
    function greet() {
      const lines = t('minimiBubbles');
      if (!Array.isArray(lines) || !lines.length) return;
      bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
      bubble.hidden = false;
      me.pose = 'wave';
      me.flip = false;
      paused = { seg, route };     // 걷던 중이었다면 상태를 보관했다가 나중에 이어감
      seg = null;
      route = [];
      const now = performance.now();
      chatterUntil = 0;                                        // 혼잣말보다 인사가 우선
      chatterAt = now + between(chatterMin, chatterMax) * 1000; // 다음 혼잣말은 미뤄둠
      bubbleUntil = now + bubbleMs;
      draw();
      if (REDUCE_MOTION) {
        // 움직이지 않는 모드에선 화면 갱신 반복이 없으니 직접 되돌림
        setTimeout(() => { bubble.hidden = true; bubbleUntil = 0; paused = null; arrive(me.spot); draw(); }, bubbleMs);
      }
    }
    sprite.addEventListener('click', greet);
    sprite.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); greet(); }
    });

    draw();
    if (DEBUG) initMinimiDebug(stage, spots, conf.paths || []);
    if (REDUCE_MOTION) return;   // 움직임 줄이기: 첫 지점에 서 있기만 함 (혼잣말도 안 함)
    chatterAt = performance.now() + between(4, 9) * 1000;   // 첫 혼잣말은 조금 일찍
    requestAnimationFrame(tick);
  }

  // ?debug=1 일 때만: 지점·길을 그림 위에 표시하고, 클릭한 자리의 좌표(%)를 보여줌
  function initMinimiDebug(stage, spots, paths) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'minimi-debug');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');  // 좌표가 그대로 %가 되게
    const byId = new Map(spots.map((spot) => [spot.id, spot]));
    paths.forEach(([a, b]) => {
      const from = byId.get(a);
      const to = byId.get(b);
      if (!from || !to) return;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      svg.append(line);
    });
    stage.append(svg);

    spots.forEach((spot) => {
      const dot = el('div', 'minimi-debug-dot', String(spot.id));
      dot.style.left = `${spot.x}%`;
      dot.style.top = `${spot.y}%`;
      stage.append(dot);
    });

    const readout = el('div', 'minimi-debug-readout', '그림을 클릭하면 좌표가 나와요');
    stage.append(readout);
    stage.addEventListener('click', (e) => {
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const text = `x: ${x.toFixed(1)}, y: ${y.toFixed(1)}`;
      readout.textContent = text;
      console.log('[미니룸 좌표]', text);
    });
  }

  function renderIntro() {
    const box = $('#intro');
    box.replaceChildren(...t('intro').map((line) => el('p', '', line)));
  }

  function renderIlchon() {
    const list = $('#ilchon-list');
    list.replaceChildren(...t('ilchon').map((item) => {
      const li = el('li');
      li.append(el('b', 'ilchon-from', item.from), el('span', '', item.text));
      return li;
    }));
  }

  function renderDiary() {
    $('#diary-date').textContent = CONFIG.DIARY_DATE;
    $('#diary-body').replaceChildren(...t('diaryBody').map((para) => el('p', '', para)));
  }

  function renderPhotos() {
    const grid = $('#album-grid');
    grid.replaceChildren();
    CONFIG.PHOTOS.forEach((photo) => {
      const caption = photo[state.lang] || photo.ko;
      const fig = el('figure', 'photo');
      const img = el('img');
      img.loading = 'lazy';
      img.alt = caption;
      // 사진 파일이 없을 때: 데모 모드에선 자리 표시, 실제 사이트에선 그 칸을 아예 숨김
      img.addEventListener('error', () => {
        if (DEMO) {
          fig.classList.add('missing');
          img.replaceWith(el('div', 'ph', t('photoMissing')));
        } else {
          fig.remove();
        }
      });
      img.src = photo.src;
      fig.append(img, el('figcaption', '', caption));
      grid.append(fig);
    });
  }

  /* ---------- 4. 서버 통신 ---------- */

  // 데모 모드에서 쓰는 가짜 방명록 (실제 사이트에선 안 쓰임)
  // studentId는 데모(가짜) 값이라 공개돼도 상관없어. 실제 모드에선 브라우저로 내려오지 않아.
  const demoEntries = [
    { no: 1, nickname: '도서관러버', message: '그동안 고마웠어! 과제할 때마다 신세 많이 졌어 ㅠㅠ', createdAt: '2026-10-05T09:12:00+09:00', studentId: '1111111' },
    { no: 2, nickname: 'Alex', message: 'Thanks for all the late-night searches. See you on the new site!', createdAt: '2026-10-05T11:40:00+09:00', studentId: '2222222' },
    { no: 3, nickname: '새내기', message: '새 홈페이지도 기대할게요 ★', createdAt: '2026-10-05T13:05:00+09:00', studentId: '3333333' },
  ];

  // 서버가 끝내 응답하지 않으면 화면이 '불러오는 중...'에서 영영 멈춰버려.
  // 그래서 정해진 시간이 지나면 요청을 취소하고 실패로 처리함(AbortError).
  const TIMEOUT_GET = 12000;   // 목록 불러오기: 12초
  const TIMEOUT_POST = 15000;  // 등록·삭제: 15초 (시트에 쓰는 시간이 더 걸림)

  async function fetchJson(url, options, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      // Apps Script가 오류 페이지(HTML)를 돌려줄 때도 있어서 상태 코드를 먼저 확인
      if (!res.ok) throw new Error('SERVER');
      return await res.json();
    } finally {
      clearTimeout(timer);   // 성공하든 실패하든 타이머는 반드시 정리
    }
  }

  // 새로고침할 때마다 방문자 수가 오르지 않게, 브라우저 탭 하나당 한 번만 센다
  function shouldCountVisit() {
    if (storage.get('sessionStorage', 'gb-visited')) return false;
    storage.set('sessionStorage', 'gb-visited', '1');
    return true;
  }

  // GET: 방명록 목록 + 방문자 수 받아오기
  async function fetchEntries(countVisit) {
    if (DEMO) {
      // 실제 서버와 똑같이: 삭제된 글은 빼고, 학번은 아예 담지 않고 돌려줌
      const visible = demoEntries
        .filter((entry) => !entry.deleted)
        .map(({ no, nickname, message, createdAt }) => ({ no, nickname, message, createdAt }));
      return { ok: true, entries: visible.reverse(), today: 1, total: 1 };
    }
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', 'list');
    if (countVisit) url.searchParams.set('visit', '1');
    return fetchJson(url.toString(), {}, TIMEOUT_GET);
  }

  // POST: 새 글 보내기
  // Content-Type을 일부러 지정하지 않아(기본값 text/plain).
  // application/json으로 보내면 Apps Script가 CORS 사전 요청을 처리하지 못해서 막히거든.
  // 학번(studentId)은 서버로만 보내고, 응답에도 화면에도 다시 나오지 않음
  async function sendEntry(nickname, studentId, message) {
    if (DEMO) {
      demoEntries.push({ no: demoEntries.length + 1, nickname, message, createdAt: new Date().toISOString(), studentId });
      return { ok: true };
    }
    return fetchJson(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'post', nickname, studentId, message }),
    }, TIMEOUT_POST);
  }

  // POST: 본인 글 삭제 (글 번호 + 학번이 시트의 값과 맞아야 서버가 지워줌)
  async function sendDelete(no, studentId) {
    if (DEMO) {
      const target = demoEntries.find((entry) => entry.no === no);
      if (!target) return { ok: false, error: 'DEL_NOT_FOUND' };
      if (target.deleted) return { ok: false, error: 'DEL_ALREADY' };
      if (target.studentId !== studentId) return { ok: false, error: 'DEL_MISMATCH' };
      target.deleted = true;
      return { ok: true };
    }
    return fetchJson(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', no, studentId }),
    }, TIMEOUT_POST);
  }

  async function loadEntries(countVisit) {
    try {
      const data = await fetchEntries(countVisit);
      if (!data.ok) throw new Error(data.error || 'SERVER');
      state.entries = data.entries;
      state.stats = { today: data.today, total: data.total };
      state.loadError = false;
      state.timedOut = false;
    } catch (err) {
      console.error('방명록 불러오기 실패:', err);
      state.loadError = true;
      state.timedOut = err.name === 'AbortError';   // 시간 초과인지 구분
    }
    state.loading = false;
    renderEntries();
    renderStats();
  }

  /* ---------- 5. 방명록 화면 ---------- */

  function renderStats() {
    const fmt = (n) => Number(n).toLocaleString(state.lang === 'ko' ? 'ko-KR' : 'en-US');
    $('#today').textContent = state.stats ? fmt(state.stats.today) : '-';
    $('#total').textContent = state.stats ? fmt(CONFIG.BASE_TOTAL + state.stats.total) : '-';
  }

  // 삭제할 때 서버가 돌려줄 수 있는 오류 코드 (이 목록에 없으면 '잠시 후 다시'로 안내)
  const DELETE_ERRORS = ['SID_REQUIRED', 'SID_INVALID', 'DEL_MISMATCH', 'DEL_NOT_FOUND', 'DEL_ALREADY', 'DEL_LOCKED', 'DEL_CLOSED'];

  // 글 하나에 붙는 '삭제' 기능.
  // 브라우저 기본 prompt 창을 쓰지 않고, 글 안에서 학번 입력칸이 펼쳐지도록 만듦.
  // 돌려주는 값은 머리말에 붙일 '삭제' 버튼이고, 입력칸 상자는 글(article) 아래에 붙여둠.
  function deleteSection(entry, article) {
    const button = el('button', 'entry-del', t('del'));
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');

    const box = el('form', 'entry-del-box');
    box.hidden = true;

    const input = el('input');
    input.type = 'text';
    input.id = `del-sid-${entry.no}`;
    input.inputMode = 'numeric';
    input.autocomplete = 'off';           // 학번이 브라우저 자동완성에 남지 않게
    input.maxLength = CONFIG.STUDENT_ID_DIGITS;
    input.placeholder = t('sidPlaceholder');

    const label = el('label', 'entry-del-label', t('delPrompt'));
    label.htmlFor = input.id;

    const confirm = el('button', 'btn btn-sm', t('delConfirm'));
    confirm.type = 'submit';
    const cancel = el('button', 'link-btn', t('delCancel'));
    cancel.type = 'button';

    const status = el('span', 'gb-status');
    status.setAttribute('role', 'status');

    const row = el('div', 'entry-del-row');
    row.append(input, confirm, cancel);
    box.append(label, row, status);

    // 닫을 때 입력한 학번을 지워서 화면에 남지 않게 함
    const close = () => {
      box.hidden = true;
      input.value = '';
      status.textContent = '';
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    };

    button.addEventListener('click', () => {
      if (box.hidden) {
        box.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        input.focus();
      } else {
        close();
      }
    });
    cancel.addEventListener('click', close);

    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = input.value.trim();
      // 보내기 전에 형식부터 확인 (서버에서도 똑같이 확인함)
      const bad = !studentId ? 'SID_REQUIRED' : (!STUDENT_ID_RE.test(studentId) ? 'SID_INVALID' : null);
      if (bad) {
        status.className = 'gb-status error';
        status.textContent = t(`err_${bad}`);
        return;
      }
      confirm.disabled = true;
      confirm.textContent = t('deleting');
      status.className = 'gb-status';
      status.textContent = '';
      try {
        const data = await sendDelete(entry.no, studentId);
        if (!data.ok) throw new Error(data.error || 'SERVER');
        input.value = '';
        setStatus('ok', t('deleted'));    // 방명록 입력창 쪽 상태줄에 결과 표시
        await loadEntries(false);         // 목록을 다시 불러오면 이 글은 사라져 있음
      } catch (err) {
        console.error('방명록 삭제 실패:', err);
        const code = err.name === 'AbortError' ? 'TIMEOUT'
          : (DELETE_ERRORS.includes(err.message) ? err.message : 'SERVER');
        status.className = 'gb-status error';
        status.textContent = t(`err_${code}`);
        confirm.disabled = false;
        confirm.textContent = t('delConfirm');
      }
    });

    article.append(box);
    return button;
  }

  // 방명록 글 하나를 미니홈피 스타일 상자로 만듦
  function entryElement(entry) {
    const article = el('article', 'entry');

    const head = el('header', 'entry-head');
    const time = el('time', 'entry-time', formatDate(entry.createdAt));
    time.dateTime = entry.createdAt;
    // 글 번호(entry.no)는 화면에 보여주지 않음. 삭제할 때 어느 줄인지 서버에 알려주는 용도로만 씀.
    head.append(el('span', 'entry-nick', entry.nickname), time);

    const body = el('div', 'entry-body');
    const avatar = el('span', 'avatar');
    avatar.setAttribute('aria-hidden', 'true');
    avatar.style.setProperty('--c', colorFor(entry.nickname));
    body.append(avatar, el('p', 'entry-msg', entry.message));

    article.append(head, body);
    // 마감 전에만 '삭제'를 붙임 (마감 뒤에는 서버에서도 삭제를 거절함)
    if (!isClosed()) head.append(deleteSection(entry, article));
    return article;
  }

  // 방명록 탭의 전체 목록 + 홈의 '최근 방명록' 3개를 함께 그림
  function renderEntries() {
    const list = $('#gb-list');
    const recent = $('#recent-list');

    let notice = null;
    if (state.loading) notice = t('loading');
    else if (state.loadError) notice = t(state.timedOut ? 'loadTimeout' : 'loadError');
    else if (!state.entries.length) notice = t('empty');

    if (notice) {
      list.replaceChildren(el('p', 'gb-notice', notice));
      // 통신에 실패했을 때는 새로고침하지 않고도 다시 받아올 수 있게 버튼을 붙임
      if (state.loadError) {
        const again = el('button', 'btn btn-sm', t('retry'));
        again.type = 'button';
        again.addEventListener('click', () => {
          state.loading = true;
          state.loadError = false;
          renderEntries();
          loadEntries(false);
        });
        const wrap = el('p', 'gb-retry');
        wrap.append(again);
        list.append(wrap);
      }
      recent.replaceChildren(el('li', 'recent-empty', notice));
      return;
    }

    list.replaceChildren(...state.entries.map(entryElement));
    recent.replaceChildren(...state.entries.slice(0, 3).map((entry) => {
      const li = el('li');
      li.append(el('b', '', entry.nickname), el('span', '', entry.message));
      return li;
    }));
  }

  // 학번 형식: 숫자 N자리만 허용 (N은 config.js의 STUDENT_ID_DIGITS)
  const STUDENT_ID_RE = new RegExp(`^[0-9]{${CONFIG.STUDENT_ID_DIGITS}}$`);

  // 입력 검사: 문제가 있으면 오류 코드, 없으면 null (Code.gs의 validate_와 같은 규칙)
  function validate(nickname, studentId, message) {
    if (!nickname || !message) return 'EMPTY';
    if (charCount(nickname) > CONFIG.MAX_NICKNAME) return 'NICKNAME_TOO_LONG';
    if (!studentId) return 'SID_REQUIRED';
    if (!STUDENT_ID_RE.test(studentId)) return 'SID_INVALID';
    if (wordCount(message) > CONFIG.MAX_WORDS) return 'TOO_MANY_WORDS';
    if (charCount(message) > CONFIG.MAX_CHARS) return 'TOO_LONG';
    return null;
  }

  // 입력하는 동안 '3/10', '12/50 단어' 표시를 갱신하고, 넘치면 빨간색으로
  function updateCounts() {
    const nick = $('#gb-nick').value.trim();
    const msg = $('#gb-msg').value;
    const nickLen = charCount(nick);
    const words = wordCount(msg);

    const nickCount = $('#nick-count');
    nickCount.textContent = `${nickLen}/${CONFIG.MAX_NICKNAME}`;
    nickCount.classList.toggle('over', nickLen > CONFIG.MAX_NICKNAME);

    const wordCountEl = $('#word-count');
    wordCountEl.textContent = `${words}/${CONFIG.MAX_WORDS} ${t('wordsUnit')}`;
    wordCountEl.classList.toggle('over', words > CONFIG.MAX_WORDS || charCount(msg.trim()) > CONFIG.MAX_CHARS);
  }

  function setStatus(kind, message) {
    const status = $('#gb-status');
    status.className = `gb-status ${kind}`;
    status.textContent = message;
  }

  const KNOWN_ERRORS = ['EMPTY', 'NICKNAME_TOO_LONG', 'SID_REQUIRED', 'SID_INVALID', 'TOO_MANY_WORDS', 'TOO_LONG', 'CLOSED'];

  function initGuestbook() {
    const form = $('#gb-form');
    const button = $('#gb-submit');

    // 마감 시각이 지났으면 입력창을 숨기고 안내문만 보여줌 (목록은 그대로)
    if (isClosed()) {
      form.hidden = true;
      $('#gb-closed').hidden = false;
    }

    $('#gb-nick').addEventListener('input', updateCounts);
    $('#gb-msg').addEventListener('input', updateCounts);

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // 페이지가 새로고침되지 않게
      const nickname = $('#gb-nick').value.trim();
      const studentId = $('#gb-sid').value.trim();
      const message = $('#gb-msg').value.trim();

      const error = validate(nickname, studentId, message);
      if (error) {
        setStatus('error', t(`err_${error}`));
        return;
      }

      // 중복 클릭 방지: 보내는 동안 버튼 잠금
      button.disabled = true;
      button.textContent = t('submitting');
      setStatus('', '');
      try {
        const data = await sendEntry(nickname, studentId, message);
        if (!data.ok) throw new Error(data.error || 'SERVER');
        $('#gb-msg').value = '';  // 닉네임은 남겨두고 내용만 비움
        $('#gb-sid').value = '';  // 학번은 기기에 남지 않게 보낸 즉시 지움
        updateCounts();
        setStatus('ok', t('posted'));
        await loadEntries(false); // 방금 쓴 글이 보이게 목록 새로고침
      } catch (err) {
        console.error('방명록 등록 실패:', err);
        const code = err.name === 'AbortError' ? 'TIMEOUT'
          : (KNOWN_ERRORS.includes(err.message) ? err.message : 'SERVER');
        setStatus('error', t(`err_${code}`));
      } finally {
        button.disabled = false;
        button.textContent = t('submit');
      }
    });
  }

  /* ---------- 6. BGM (음량만 조절) ----------
     싸이월드 미니홈피처럼 들어오면 저절로 흐르게 하되, 방문자는 음량만 조절해.
     요즘 브라우저는 소리 자동재생을 막기 때문에, 막히면 조용히 기다렸다가
     방문자가 화면을 처음 누르는 순간 재생을 시작해. */

  const tracks = (CONFIG.BGM || []).filter((track) => track && track.src);
  const bgm = {
    audio: new Audio(),
    index: 0,
    started: false,
    unavailable: false,   // 모든 곡 파일을 못 찾았을 때
  };

  function setTrack(index) {
    bgm.index = (index + tracks.length) % tracks.length;
    bgm.audio.src = tracks[bgm.index].src;
    renderBgm();
  }

  // 다음 곡 번호: shuffle이면 지금 곡을 뺀 무작위, 아니면 다음 순서
  function nextIndex() {
    if (CONFIG.BGM_MODE === 'shuffle' && tracks.length > 1) {
      let i;
      do { i = Math.floor(Math.random() * tracks.length); } while (i === bgm.index);
      return i;
    }
    return bgm.index + 1;
  }

  // 재생 시도. 파일이 없으면 다음 곡으로 넘어가며 곡 수만큼 다시 시도.
  // 자동재생이 막힌 경우(NotAllowedError)는 실패가 아니라 '아직 못 틀었다'로 보고 false를 돌려줌.
  async function play(attempt = 0) {
    try {
      await bgm.audio.play();
      bgm.started = true;
    } catch (err) {
      if (err.name === 'NotAllowedError') return false;
      if (attempt + 1 < tracks.length) {
        setTrack(bgm.index + 1);
        return play(attempt + 1);
      }
      bgm.unavailable = true;
      renderBgm();
    }
    return bgm.started;
  }

  function renderBgm() {
    if (!tracks.length) return;
    const track = tracks[bgm.index] || {};
    const name = [track.title, track.artist].filter(Boolean).join(' - ');
    // 곡 제목을 안 적었으면 빈칸으로 둠 (config.js의 BGM에서 채우면 자동으로 나옴)
    $('#bgm-title-text').textContent = bgm.unavailable ? t('bgmNone') : (name ? `♪ ${name}` : '');
    $('#bgm-volume').disabled = bgm.unavailable;
  }

  function initBgm() {
    if (!tracks.length) {
      $('#bgm').hidden = true;
      return;
    }
    const slider = $('#bgm-volume');

    // 음량: 예전에 고른 값이 있으면 그걸로, 없으면 config.js의 기본값
    const saved = storage.get('localStorage', 'gb-volume');
    const number = saved === null ? NaN : Number(saved);
    const volume = Number.isFinite(number) && number >= 0 && number <= 100
      ? number
      : (Number(CONFIG.BGM_VOLUME) || 35);
    slider.value = String(volume);
    bgm.audio.volume = volume / 100;

    slider.addEventListener('input', () => {
      bgm.audio.volume = Number(slider.value) / 100;
      storage.set('localStorage', 'gb-volume', slider.value);
      if (!bgm.started) play();   // 슬라이더를 만진 것도 '방문자가 누른 것'이라 여기서 시작될 수 있음
    });

    // 한 곡이 끝나면 다음 곡으로 (버튼이 없으니 자동으로만 넘어감)
    bgm.audio.addEventListener('ended', () => { setTrack(nextIndex()); play(); });

    const start = CONFIG.BGM_MODE === 'first' ? 0 : Math.floor(Math.random() * tracks.length);
    setTrack(start);

    // 먼저 자동재생을 시도하고, 막히면 첫 클릭·터치·키 입력 때 시작
    play().then((ok) => {
      if (ok) return;
      const types = ['pointerdown', 'keydown', 'touchstart'];
      // 재생에 성공했을 때만 대기를 끝냄.
      // (한 번 실패했다고 리스너를 지워버리면 다시는 시작할 기회가 없어짐)
      const kick = async () => {
        if (await play()) types.forEach((type) => document.removeEventListener(type, kick));
      };
      types.forEach((type) => document.addEventListener(type, kick, { passive: true }));
    });
  }

  /* ---------- 7. 시작 ---------- */

  function init() {
    if (DEMO) $('#demo-note').hidden = false;
    initLang();
    initTabs();
    initProfile();
    initGuestbook();
    initBgm();
    applyLang();                        // 모든 문구 채우기
    loadEntries(shouldCountVisit());   // 방명록 + 방문자 수 불러오기
  }

  init();
})();
