/* =====================================================================
   config.js : 내용과 설정만 모아둔 파일
   ---------------------------------------------------------------------
   글 내용, 이미지·음원 경로, 마감일, 글자 수 제한은 전부 여기서 바꿔.
   동작 코드(app.js)와 디자인(style.css)은 건드리지 않아도 돼.
   'TODO'라고 적힌 곳이 아직 채워야 하는 부분이야.
   ===================================================================== */

const CONFIG = {
  // [필수] Apps Script 웹 앱 URL (/exec로 끝나는 주소)
  // 비어 있으면 "데모 모드": 시트 없이 가짜 방명록으로 화면만 확인할 수 있어.
  API_URL: 'https://script.google.com/macros/s/AKfycbxa9BvMLUR9XbaYvu6EB2h-DkivskZPBx0hg5RakkFs7palei7kM9X4qO0I8eu7bx0v1A/exec', // TODO: 예) 'https://script.google.com/macros/s/AKfy.../exec'

  // 방명록 마감 시각 (한국 시간). 지나면 입력창과 '삭제' 버튼만 닫히고, 남긴 글은 계속 보여.
  // ※ Code.gs의 END_DATE와 반드시 같은 값으로 맞춰야 해.
  //   (한쪽만 바꾸면 화면은 열려 있는데 서버가 거절하는 식으로 어긋나)
  // ※ 바꾼 뒤에는 Code.gs를 Apps Script에 다시 붙여넣고 '새 버전'으로 배포해야 반영돼.
  END_DATE: '2026-11-30T23:59:59+09:00',

  // 입력 제한 (Code.gs의 값과 같게 유지)
  MAX_WORDS: 50,     // 메시지: 띄어쓰기 기준 단어 수
  MAX_CHARS: 300,    // 메시지: 띄어쓰기 없이 길게 쓰는 경우를 막는 글자 수 상한
  MAX_NICKNAME: 10,  // 닉네임 글자 수
  // 학번: 숫자 몇 자리인지 (Code.gs의 STUDENT_ID_DIGITS와 반드시 같게 유지)
  // 학번은 시트에만 저장되고 사이트 화면·서버 응답에는 절대 나오지 않아.
  STUDENT_ID_DIGITS: 7,

  // TOTAL 방문자 수 = 이 숫자 + 방명록 사이트 실제 방문 수
  // 0으로 두면 이 사이트의 실제 방문 수만 올라가. (기존 홈페이지 누적 수를 얹고 싶으면 그 숫자를 넣어)
  BASE_TOTAL: 0,

  // 공감(따봉) 많은 글을 홈의 '친구들의 한마디'에 섞어 보여주는 기준
  POPULAR_MIN_LIKES: 2,  // 공감이 이 숫자 이상인 글만 후보
  POPULAR_COUNT: 2,      // 후보 중 공감 많은 순으로 몇 개를 보여줄지
  // ※ 글 하나당 1분에 20번까지만 반영하는 제한은 서버(Code.gs의 LIKE_LIMIT_PER_MIN)에 있어.

  // 프로필의 '놀러가기'를 누르면 이동할 새 홈페이지 주소.
  // 비어 있으면 '새 도서관 홈페이지' 메뉴가 선택 불가로 표시돼.
  // 10/16에 새 홈페이지가 열리면 여기에 https:// 주소만 넣으면 바로 연결돼.
  NEW_HOMEPAGE_URL: '',

  // 이미지 경로 (assets 폴더 기준). 파일이 없으면 자리 표시로 대체돼.
  // ?v=2 : 2026.10.11 프로필 그림 교체 (같은 이름이라 브라우저가 예전 그림을 쓰지 않게)
  PROFILE_IMAGE: 'assets/profile.webp?v=2',

  /* ---------- 다이어리 ----------
     일기 여러 편을 배열로 관리해. 여기 적은 순서대로 위에서부터 나오니까
     새 일기는 맨 앞에 넣어줘. 일기 사이에는 구분선이 저절로 들어가.
       date  : 작성일 표시 (글자 그대로 나와)
       image : 일기에 넣을 사진 (없으면 이 줄을 빼. 파일이 없으면 칸째로 숨겨짐)
       ko/en : 언어별 내용
         title : 제목
         body  : 본문 문단들 (따옴표 하나가 문단 하나)
         sign  : 맨 아래 서명
         photoAlt / photoCaption : 사진 설명(화면 읽기용) / 사진 아래 글 (image가 있을 때만)
     영어(en) 칸이 비어 있으면 한국어로 대신 보여줘. */
  DIARIES: [
    // 새 홈페이지의 첫 일기
    {
      date: '2026.10.12',
      ko: {
        title: '새 홈페이지의 첫 일기',
        body: [
          '안녕, 태재 친구들.',
          '나는 새로 문을 연 태재디지털도서관 홈페이지야.',
          '선배 홈페이지가 이것저것 잘 챙겨서 물려준 덕분에, 조금 더 똑똑해지고 볼거리도 많아졌어.',
          '먼저 Video Library의 Taejae Collection에 새로운 영상이 잔뜩 들어왔어. 태재에서 만든 다양한 유튜브 영상을 한곳에서 구경할 수 있어.',
          '책 구경도 빼놓을 수 없지. Books & Publications의 University Press에서는 출판문화원이 만든 태재만의 책들을, Faculty Book Picks에서는 교수님들이 직접 추천한 책들을 만나볼 수 있어.',
          '그래도 원하는 자료를 찾기 막막할 땐, 검색창 위에 새로 생긴 보라색 AI-powered Search 버튼을 눌러봐. EBSCO AI가 들어와서 필요한 학술자료를 조금 더 쉽게 찾을 수 있게 됐거든.',
          '아직은 낯설겠지만 여기저기 한번 눌러봐. 생각보다 재밌는 게 꽤 많을지도 몰라 ★',
          '앞으로 잘 부탁해!',
        ],
        sign: '태재디지털도서관 새 홈페이지가',
      },
      en: {
        title: "The new homepage's first diary entry",
        body: [
          'Hi, Taejae friends.',
          "I'm the newly opened Taejae Digital Library homepage.",
          "Thanks to everything my senior homepage carefully passed down, I've gotten a little smarter and have a lot more to show you.",
          'First, the Taejae Collection in the Video Library is full of new videos. You can browse all kinds of YouTube videos made at Taejae in one place.',
          "And of course, there are books to explore. In Books & Publications, University Press features Taejae's very own books, and Faculty Book Picks has books recommended by our professors.",
          "If you're ever stuck finding what you need, try the new purple AI-powered Search button above the search bar. With EBSCO AI, finding academic sources is a little easier now.",
          'It might feel unfamiliar for a while, but click around. You might find more fun things than you expect ★',
          'Looking forward to being with you!',
        ],
        sign: 'With love, the new library homepage',
      },
    },

    // 기존 홈페이지의 마지막 일기
    {
      date: '2026.10.05',
      image: 'assets/diary.webp',
      ko: {
        title: '마지막 일기',
        body: [
          '안녕, 태재 친구들.',
          '2023년부터 너희가 과제하던 새벽을 함께했어. 마감 직전에 급하게 논문 찾던 너희 모습, 다 기억하고 있어.',
          '자주 쓰던 기능은 새 홈페이지한테 그대로 물려줬어. 잘 안 쓰던 짐은 정리했고, 논문 찾을 때 쓰는 EBSCO AI 검색이 새로 들어왔대.',
          '10월 16일부터는 새 홈페이지가 너희를 맞이할 거야. 나 없어도 잘 찾아다닐 수 있지? ★',
          '방명록에 마지막 인사 한마디 남겨주면 정말 기쁠 것 같아.',
        ],
        sign: '2023~2026, 태재디지털도서관 홈페이지가',
        photoAlt: '도서관 라운지에서 공부하는 학생들',
        photoCaption: '과제하던 날의 라운지. 다들 각자 자리에서 열심이었지.',
      },
      en: {
        title: 'My last diary entry',
        body: [
          'Hi, Taejae friends.',
          "Since 2023, I've been with you through every assignment and every late night. I still remember you hunting for papers right before deadlines.",
          "I've handed my most-used features to the new homepage as they are. I packed away the ones nobody used, and I hear EBSCO AI search has joined for finding papers.",
          "From October 16, the new homepage will welcome you. You'll find your way without me, right? ★",
          'It would mean a lot if you left me a last note in the guestbook.',
        ],
        sign: 'With love, the library homepage (2023~2026)',
        photoAlt: 'Students studying in the library lounge',
        photoCaption: 'The lounge on an assignment day. Everyone hard at work.',
      },
    },
  ],

  /* ---------- 사진첩 ----------
     묶음(앨범) 여러 개를 배열로 관리해. 적은 순서대로 위에서부터 나와.
       title  : 묶음 제목 (ko/en)
       photos : 사진 목록. src = 파일 경로, ko/en = 사진 아래 설명
     실제 사이트(API_URL 연결 후)에서는 파일이 없는 사진은 자동으로 숨겨져. */
  ALBUMS: [
    {
      title: { ko: '추억 사진첩', en: 'Memory album' },
      photos: [
        { src: 'assets/photo1.webp', ko: '매일 제일 먼저 너희를 맞이하던 첫 화면', en: 'The first screen that greeted you every day' },
        { src: 'assets/photo2.webp', ko: '과제 때마다 제일 바빴던 검색창... 고생했다', en: 'The search bar, busiest whenever assignments were due' },
        { src: 'assets/photo3.webp', ko: '논문 찾으러 매번 들르던 DB 목록. 다들 단골 DB 하나씩 있었지?', en: 'The database list you visited for every paper. Everyone had a favorite, right?' },
        { src: 'assets/photo4.webp', ko: '다들 여기서 로그인하느라 헤맸지? ^^;', en: 'Everyone got lost at this login page, right? ^^;' },
      ],
    },
    {
      // 새 홈페이지 기능 소개 (원본: _originals/image.png, image2~5.png)
      title: { ko: '새 홈페이지 둘러보기', en: 'A look around the new homepage' },
      photos: [
        { src: 'assets/newsite1.webp', ko: '새 홈페이지 첫 화면 ★ 나보다 훨씬 깔끔하지? 쪼금 질투나...', en: 'The new front page ★ Way cleaner than me, right? A little jealous...' },
        { src: 'assets/newsite2.webp', ko: '검색창 위에 반짝이는 보라 버튼 발견! 자료 찾기 막막할 땐 EBSCO AI한테 물어봐 ♡', en: 'Spotted a shiny purple button above the search bar! Stuck on a search? Ask EBSCO AI ♡' },
        { src: 'assets/newsite3.webp', ko: '영상에 책에 태재 역사까지 한곳에~ 구경할 게 잔뜩 생겼어 ★', en: 'Videos, books, even Taejae history, all in one place~ So much to look around ★' },
        { src: 'assets/newsite4.webp', ko: '우리 학교가 직접 만든 책들이 여기 다 모였대. 태재 책장 구경 가자!', en: "All the books Taejae made itself are gathered here. Let's go browse the Taejae bookshelf!" },
        { src: 'assets/newsite5.webp', ko: '교수님들이 직접 골라주신 책들... 이건 한 권쯤 꼭 읽어봐야겠지? ^^', en: 'Books our professors picked themselves... we should read at least one, right? ^^' },
      ],
    },
    {
      // 디카 사진 (원본: _originals/SDC*.JPG). 학생 얼굴은 모자이크+블러로 가린 상태
      // 얼굴 가리기·변환은 사진 원본에서 다시 만들어야 할 때만 하면 돼 (assets에는 이미 가린 사진만 있음)
      title: { ko: '태재 일상', en: 'Everyday Taejae' },
      photos: [
        { src: 'assets/sdc12536.webp', ko: '북클럽 모이는 날 ★ 책 얘기하다 보면 시간 가는 줄 몰라~ 브이도 잊지 않았지?', en: "Book club day ★ Time flies when we talk about books~ Didn't forget the peace sign!" },
        { src: 'assets/sdc12542.webp', ko: '나무 사이로 보이는 저 건물, SFSU 도서관이야. 찾았어? ^^', en: "See that building through the trees? That's the SFSU library. Found it? ^^" },
        { src: 'assets/sdc12630.webp', ko: 'SFSU 도서관에 옛날 게임기가 있다고?! 공부하다 딱 한 판만~', en: 'A retro game console in the SFSU library?! Just one round between study sessions~' },
        { src: 'assets/sdc12637.webp', ko: '창가 자리에서 각자 책에 푹 빠진 북클럽. 조용해도 같이라서 좋아 ♡', en: 'Book club by the window, everyone lost in a book. Quiet, but better together ♡' },
        { src: 'assets/sdc12681.webp', ko: '바닷가 바위 옆 오래된 건물 터. 파도 소리 들리는 것 같지?', en: 'Old ruins by the rocks on the shore. Can you almost hear the waves?' },
        { src: 'assets/sdc12781.webp', ko: '호숫가에 선 커다란 기둥 건물. 여기 오면 다들 사진 찍느라 바빠 ★', en: 'A grand colonnade by the lake. Everyone gets busy taking photos here ★' },
        { src: 'assets/sdc12899.webp', ko: '해 질 녘 바닷가 산책로. 과제 끝내고 걷기 딱 좋은 길~', en: 'A seaside path at sunset. Perfect for a walk after finishing assignments~' },
        { src: 'assets/sdc12924.webp', ko: '갈매기들이 한꺼번에 날아올랐어! 타이밍 완벽했지?', en: 'All the seagulls took off at once! Perfect timing, right?' },
        { src: 'assets/sdc13005.webp', ko: '노을 지는 동네 골목. 오늘 하루도 수고했어 ♡', en: 'A neighborhood street at sunset. You did well today ♡' },
        { src: 'assets/sdc13014.webp', ko: '태재 3기 오케스트라 동아리 연습 중 ♪ 연습실에 웃음이 끊이질 않네~', en: "Taejae's third-cohort orchestra club at practice ♪ The laughter never stops~" },
      ],
    },
  ],

  /* ---------- 내 방 ----------
     방 그림 위를 캐릭터가 정해진 지점 사이로만 오가면서 돌아다녀.
     위치를 고치고 싶으면 주소 뒤에 ?debug=1 을 붙이고 그림을 클릭해봐.
     클릭한 자리의 x, y 값(%)이 화면에 나오니까 그 숫자를 spots에 넣으면 돼. */

  // 방 그림. 비워두면 예전처럼 코드로 그린 assets/miniroom.svg 방이 나와.
  // ?v=2 : 같은 이름으로 그림을 바꿨을 때 방문자 브라우저가 예전 그림을 쓰지 않게 하는 표시.
  //        그림을 또 바꾸면 숫자를 하나 올려줘. (2026.10.11 모니터가 생긴 그림으로 교체 → v=2)
  MINIROOM_IMAGE: 'assets/miniroom.webp?v=2',

  MINIMI: {
    // 포즈별 그림. 비워두면 캐릭터가 안 나와.
    poses: {
      idle: 'assets/minimi-idle.webp',      // 정면으로 서 있기
      walk1: 'assets/minimi-walk1.webp',    // 걷기 1
      walk2: 'assets/minimi-walk2.webp',    // 걷기 2
      wave: 'assets/minimi-wave.webp',      // 손 흔들기
      back: 'assets/minimi-back.webp',      // 뒷모습
      crouch: 'assets/minimi-crouch.webp',  // 쪼그려 앉아 책 읽기
    },

    // 캐릭터 키 = 방 그림 높이의 몇 % (크기 1.0일 때). 키우면 캐릭터가 커져.
    height: 20,

    // 도트 그림을 또렷하게(pixelated) 보여줄지, 부드럽게(auto) 보여줄지
    rendering: 'auto',

    // 머무는 지점. x, y는 방 그림 기준 %이고 "발이 닿는 위치"야.
    // scale은 크기(1이 기본), pose는 그 자리에서 취할 포즈,
    // flip: true면 그림을 좌우로 뒤집어 세워.
    spots: [
      // 지점 1: 새 그림(2026.10.11)에서 의자가 오른쪽으로 옮겨져서, 예전 자리(33.9, 67.4)는
      //         의자 바퀴 위였어. 의자 오른쪽 바닥으로 옮김 (책상 앞 탁자와도 안 겹치는 자리)
      { id: 1, x: 41.5, y: 67.5, scale: 0.95, pose: 'idle' },                // 의자 옆
      { id: 2, x: 51.4, y: 57.6, scale: 0.85, pose: 'back' },                // 책장 앞 (책장을 보고)
      { id: 3, x: 65.8, y: 68.4, scale: 0.95, pose: 'crouch', flip: true },  // 고양이 옆
      { id: 4, x: 27.3, y: 80.1, scale: 1.00, pose: 'wave' },                // 러그 왼쪽 끝
    ],

    // 오갈 수 있는 길 (지점 id 두 개씩). 3↔4는 탁자를 가로질러서 일부러 뺐어.
    paths: [[4, 1], [1, 2], [2, 3]],

    stayMin: 3,    // 도착해서 머무는 시간(초) 최소
    stayMax: 6,    // 머무는 시간 최대
    speed: 9,      // 걷는 속도 (1초에 방 너비의 몇 %)
    stepMs: 300,   // 걷기 그림 2장을 번갈아 바꾸는 간격(ms)
    bubbleMs: 3400, // 말풍선이 떠 있는 시간(ms)

    // 가만히 있을 때 혼잣말을 띄우는 간격(초). 이 사이에서 무작위로 정해져.
    chatterMin: 10,
    chatterMax: 22,
  },

  /* ---------- BGM ----------
     버튼 없이 저절로 흐르고, 방문자는 음량만 조절할 수 있어.
     (브라우저가 소리 자동재생을 막으면, 화면을 처음 누르거나 누르는 순간 시작돼) */

  // 곡 순서: 'random-start'(무작위 곡으로 시작한 뒤 순서대로) / 'shuffle'(매번 무작위) / 'first'(1번 곡부터)
  BGM_MODE: 'random-start',
  // 처음 음량 (0~100). 방문자가 조절하면 그 값이 기억돼.
  BGM_VOLUME: 25,
  // BGM 목록. 비워두면([]) 음량 조절기가 숨겨져.
  // title/artist는 지금은 비워둬서 전광판에 곡 이름이 안 나와.
  // 나중에 곡 이름을 넣고 싶으면 title과 artist만 채우면 자동으로 "♪ 제목 - 아티스트"로 흘러.
  BGM: [
    { src: 'assets/bgm1.mp3', title: '', artist: '' },
    { src: 'assets/bgm2.mp3', title: '', artist: '' },
    { src: 'assets/bgm3.mp3', title: '', artist: '' },
    { src: 'assets/bgm4.mp3', title: '', artist: '' },
  ],
};

/* ---------------------------------------------------------------------
   TEXT : 화면에 나오는 모든 문구 (한국어 ko / 영어 en)
   HTML에서 data-i18n="키이름" 이 붙은 곳에 이 문구가 들어가.
   문구를 고칠 때는 ko와 en을 같이 고쳐줘.
   --------------------------------------------------------------------- */
const TEXT = {
  ko: {
    pageTitle: '태재디지털도서관의 홈피',
    siteTitle: '태재디지털도서관의 홈피',
    langLabel: '언어',

    // 프로필
    profileAlt: '기존 도서관 홈페이지 첫 화면을 얼굴로 한 캐릭터가 책을 안고 있는 모습',
    photoMissing: '사진 준비 중',
    mood: '시원섭섭',
    intro: [
      '너희의 새벽 3시 검색창을 기억해...★',
      '도서관 홈페이지는 더 쓰기 편하고 예쁘게 바뀔 거야.',
      '새로운 홈페이지도 잘 부탁해 ♡',
    ],
    ownerName: '태재디지털도서관 홈페이지 since 2023',
    waveDefault: '놀러가기',
    waveNew: '새 도서관 홈페이지',

    // 탭
    tabsLabel: '메뉴',
    tabHome: '홈',
    tabDiary: '다이어리',
    tabAlbum: '사진첩',
    tabGuestbook: '방명록',

    // 홈
    secMiniroom: '내 방',
    roomAlt: '이삿짐 상자가 쌓여 있고, 책상 위 모니터에 새 홈페이지가 켜져 있는 도서관의 방',
    roomBubble: '그동안 고마웠어!',
    roomBox: '안 쓰던 메뉴',
    secRecent: '최근 방명록',
    seeAll: '방명록 전체 보기',
    secIlchon: '친구들의 한마디',
    ilchon: [
      { from: '새 홈페이지', text: '선배가 하던 거 그대로 이어받을게요! EBSCO AI 검색도 새로 들였어요 ★' },
      { from: 'Tlooto', text: '선배 덕분에 많이 배웠어요 (__)' },
    ],

    // 다이어리 내용은 위쪽 CONFIG.DIARIES에 있어 (일기 여러 편을 날짜별로 관리)

    // 사진첩 묶음 제목과 설명은 위쪽 CONFIG.ALBUMS에 있어

    // 방명록
    secGuestbook: '방명록',
    nickLabel: '닉네임',
    nickPlaceholder: '10자 이내',
    sidLabel: '학번',
    sidPlaceholder: '숫자 {n}자리',
    sidNote: '학번은 참여 확인과 본인 글 삭제에만 쓰여요. 사이트에 공개되지 않고, 브라우저에도 저장되지 않아요.',
    msgLabel: '방명록 내용',
    msgPlaceholder: '기존 홈페이지에게 마지막 인사를 남겨주세요.',
    wordsUnit: '단어',
    submit: '남기기',
    submitting: '남기는 중...',
    posted: '방명록을 남겼어요!',
    closed: '방명록이 마감되었어요. 남겨주신 인사는 계속 볼 수 있어요.',
    loading: '방명록을 불러오는 중...',
    loadError: '방명록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    loadTimeout: '서버 응답이 느려요. 잠시 후 다시 시도해주세요.',
    retry: '다시 시도',
    empty: '아직 방명록이 없어요. 첫 인사를 남겨주세요!',
    err_EMPTY: '닉네임과 내용을 모두 적어주세요.',
    err_NICKNAME_TOO_LONG: '닉네임은 10자까지 쓸 수 있어요.',
    err_SID_REQUIRED: '학번을 입력해주세요.',
    err_SID_INVALID: '학번은 숫자 {n}자리로 입력해주세요.',
    err_TOO_MANY_WORDS: '내용은 50단어까지 쓸 수 있어요.',
    err_TOO_LONG: '내용은 300자까지 쓸 수 있어요.',
    err_CLOSED: '방명록이 마감되었어요.',
    err_SERVER: '등록하지 못했어요. 잠시 후 다시 시도해주세요.',
    err_TIMEOUT: '서버 응답이 너무 느려요. 잠시 후 다시 시도해주세요.',

    // 본인 글 삭제 (학번만으로 인증)
    del: '삭제',
    delPrompt: '이 글을 쓸 때 입력한 학번을 넣어주세요.',
    delConfirm: '삭제하기',
    delCancel: '취소',
    deleting: '삭제 중...',
    deleted: '글을 삭제했어요.',
    err_DEL_MISMATCH: '학번이 일치하지 않아요. 본인이 쓴 글만 지울 수 있어요.',
    err_DEL_NOT_FOUND: '찾을 수 없는 글이에요. 새로고침한 뒤 다시 해주세요.',
    err_DEL_ALREADY: '이미 삭제된 글이에요.',
    err_DEL_LOCKED: '삭제 시도가 너무 많았어요. 1시간 뒤에 다시 해주세요.',
    err_DEL_CLOSED: '방명록이 마감되어 더 이상 삭제할 수 없어요.',

    // 공감(따봉) 버튼. like는 화면 읽기 프로그램이 "공감 3"처럼 읽는 이름
    like: '공감',
    err_LIKE_FAIL: '앗, 반영이 안 됐어요. 잠시 후 다시!',
    err_LIKE_LIMIT: '공감이 몰렸어요. 1분 뒤에 다시!',
    err_LIKE_GONE: '지워졌거나 숨겨진 글이에요',

    // 내 방 캐릭터를 눌렀을 때 나오는 말풍선 (무작위로 하나)
    minimiBubbles: [
      '어서 와! 와줘서 고마워 ★',
      '반가워~ 오늘도 들러줬구나 ♡',
      '가기 전에 방명록 한 줄 남겨줘 ♡',
      '새 홈페이지도 잘 부탁해!',
      '이 책 재밌다... 너도 읽어볼래?',
      '그동안 정말 고마웠어!',
      '책상 위 모니터 봤어? 새 홈페이지야!',
    ],

    // 가만히 서 있을 때 혼자 중얼거리는 말 (chatterMin~chatterMax초마다 하나씩)
    minimiChatter: [
      '10월 16일부터는 새 홈페이지에서 만나 ★',
      '심심해... 아무도 안 오나?',
      '반가워! 오늘은 무슨 일로 왔어?',
      '공부 안될 땐 일단 도서관으로 와 ㅎㅎ',
      '과제 마감 전에 미리미리~ (안 되는 거 알아)',
      '이삿짐 거의 다 쌌어~',
      '새 홈페이지엔 EBSCO AI 검색이 새로 들어왔대!',
      '오늘 하루도 수고했어 ♡',
      '다들 잘 지내지?',
      '여기 앉아서 책 보는 거 좋아해',
      '방명록 한 줄이면 충분해 :)',
      '그동안 정말 고마웠어... 진심이야',
    ],

    // BGM (음량만 조절)
    bgmVolume: '음량',
    bgmNone: 'BGM 준비 중',

    demoNote: '데모 모드: 아직 Google 시트와 연결되지 않았어요. config.js의 API_URL에 웹 앱 URL을 넣으면 실제 방명록으로 바뀌어요.',
    footer: '태재대학교 디지털도서관',
  },

  en: {
    pageTitle: "Taejae Digital Library's Little Homepage",
    siteTitle: "Taejae Digital Library's Little Homepage",
    langLabel: 'Language',

    profileAlt: 'A character whose face is the old library homepage, holding a book',
    photoMissing: 'Photo coming soon',
    mood: 'bittersweet',
    intro: [
      'I remember your 3 a.m. searches...★',
      'The library homepage is getting easier to use and prettier.',
      'Please welcome the new homepage too ♡',
    ],
    ownerName: 'Taejae Digital Library homepage, since 2023',
    waveDefault: 'Visit...',
    waveNew: 'The new library homepage',

    tabsLabel: 'Menu',
    tabHome: 'Home',
    tabDiary: 'Diary',
    tabAlbum: 'Album',
    tabGuestbook: 'Guestbook',

    secMiniroom: 'My Room',
    roomAlt: 'A library room with packed boxes and the new homepage on the desk monitor',
    roomBubble: 'Thanks for everything!',
    roomBox: 'Old menus',
    secRecent: 'Latest notes',
    seeAll: 'See all notes',
    secIlchon: "Friends' words",
    ilchon: [
      { from: 'New homepage', text: "I'll carry on everything you did, and EBSCO AI search has joined us too ★" },
      { from: 'Tlooto', text: 'I learned so much from you (__)' },
    ],


    secGuestbook: 'Guestbook',
    nickLabel: 'Nickname',
    nickPlaceholder: 'Up to 10 characters',
    sidLabel: 'Student ID',
    sidPlaceholder: '{n} digits',
    sidNote: 'Your student ID is used only to confirm participation and to delete your own note. It is never shown on this site, and never saved in your browser.',
    msgLabel: 'Your note',
    msgPlaceholder: 'Leave a last note for the old homepage.',
    wordsUnit: 'words',
    submit: 'Post',
    submitting: 'Posting...',
    posted: 'Your note is posted!',
    closed: 'The guestbook is closed. You can still read every note.',
    loading: 'Loading notes...',
    loadError: "Couldn't load the guestbook. Please try again in a moment.",
    loadTimeout: 'The server is slow to respond. Please try again in a moment.',
    retry: 'Try again',
    empty: 'No notes yet. Be the first to say goodbye!',
    err_EMPTY: 'Please fill in both your nickname and your note.',
    err_NICKNAME_TOO_LONG: 'Nicknames can be up to 10 characters.',
    err_SID_REQUIRED: 'Please enter your student ID.',
    err_SID_INVALID: 'Your student ID must be exactly {n} digits.',
    err_TOO_MANY_WORDS: 'Notes can be up to 50 words.',
    err_TOO_LONG: 'Notes can be up to 300 characters.',
    err_CLOSED: 'The guestbook is closed.',
    err_SERVER: "Couldn't post your note. Please try again in a moment.",
    err_TIMEOUT: 'The server is taking too long. Please try again in a moment.',

    del: 'Delete',
    delPrompt: 'Enter the student ID you used for this note.',
    delConfirm: 'Delete',
    delCancel: 'Cancel',
    deleting: 'Deleting...',
    deleted: 'Your note has been deleted.',
    err_DEL_MISMATCH: "That student ID doesn't match. You can only delete your own note.",
    err_DEL_NOT_FOUND: 'That note could not be found. Please refresh the page and try again.',
    err_DEL_ALREADY: 'That note is already deleted.',
    err_DEL_LOCKED: 'Too many delete attempts. Please try again in an hour.',
    err_DEL_CLOSED: 'The guestbook is closed, so notes can no longer be deleted.',

    like: 'Like',
    err_LIKE_FAIL: "Oops, that didn't go through. Try again!",
    err_LIKE_LIMIT: 'Lots of likes right now. Try again in a minute!',
    err_LIKE_GONE: 'This note was deleted or hidden',

    minimiBubbles: [
      'Hey, thanks for stopping by ★',
      'Nice to see you again ♡',
      'Leave me a note before you go ♡',
      'Take good care of the new homepage!',
      'This book is good... want to read it?',
      'Thank you for everything!',
      "See the monitor on the desk? That's the new homepage!",
    ],

    minimiChatter: [
      'From October 16, find me at the new homepage ★',
      "I'm bored... is anybody there?",
      'Hi there! What brings you by today?',
      "Can't focus? Just come to the library :)",
      'Start your assignment early~ (I know, I know)',
      "I've almost finished packing~",
      'The new homepage has EBSCO AI search now!',
      'You did well today ♡',
      'Hope you are all doing okay',
      'I love reading right here',
      'One line in the guestbook is plenty :)',
      'Thank you for everything... I really mean it',
    ],

    bgmVolume: 'Volume',
    bgmNone: 'BGM coming soon',

    demoNote: 'Demo mode: not connected to Google Sheets yet. Put your web app URL in API_URL in config.js to switch to the real guestbook.',
    footer: 'Taejae University Digital Library',
  },
};
