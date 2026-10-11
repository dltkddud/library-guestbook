/**
 * @OnlyCurrentDoc
 * ↑ 이 스크립트가 "연결된 이 스프레드시트 하나"에만 접근하도록 제한하는 표시.
 *   권한 승인 화면에서도 '이 파일만'으로 나와서, 내 다른 드라이브 파일은 건드릴 수 없어.
 */

/* =====================================================================
   Code.gs : 방명록의 "서버" (Google Apps Script)
   ---------------------------------------------------------------------
   하는 일
     doGet  : 사이트가 목록을 달라고 하면 → 시트에서 보이는 글만 골라 최신순으로 돌려줌
              (+ 방문자 수 세기)
     doPost : action='post'   → 검사 후 시트에 한 줄 추가
              action='delete' → 글 번호와 학번이 맞으면 그 글을 안 보이게 함(본인 삭제)
              action='like'   → 글의 공감 수를 +1 또는 -1 (보이는 글만, 글당 1분에 20번까지)
   시트 구조 (탭 이름: guestbook)
     A timestamp | B nickname | C message | D visible(체크박스) | E studentId | F deletedAt | G likes
     ※ E열(학번)은 이 시트에만 남고, 사이트 화면이나 서버 응답(JSON)에는 절대 나가지 않음.
       목록을 읽을 때 A~D열과 G열만 따로 읽기 때문에 구조적으로 샐 수 없음.
     ※ G열(likes)이 비어 있는 예전 글은 공감 0개로 봄.
   운영 방법
     - 문제 있는 글: D열 체크를 해제하면 사이트에서 사라짐 (원본은 시트에 남음)
     - 본인이 지운 글도 똑같이 D열 체크만 풀리고, F열에 지운 시각이 적힘 (행은 남음)
     - 행을 통째로 지우면 그 아래 글들의 번호(No.)가 하나씩 당겨지니까, 가능하면 체크 해제로
   코드를 고친 뒤에는 반드시: 배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포
   ===================================================================== */

// ---------- 설정 (config.js의 값과 똑같이 맞추기) ----------
const SHEET_NAME = 'guestbook';
const END_DATE = new Date('2026-11-30T23:59:59+09:00'); // 이 시각 이후 새 글·삭제는 거절 (config.js와 같게)
const MAX_WORDS = 50;
const MAX_CHARS = 300;
const MAX_NICKNAME = 10;
const STUDENT_ID_DIGITS = 7;                                   // 학번 자릿수 (config.js와 같게)
const STUDENT_ID_RE = new RegExp('^[0-9]{' + STUDENT_ID_DIGITS + '}$');
// 학번만으로 삭제하는 방식이라, 숫자를 계속 넣어보며 남의 글을 지우려는 시도를 막는 장치.
// 글 하나당 학번이 DELETE_MAX_FAIL번 틀리면 DELETE_LOCK_MINUTES 동안 그 글의 삭제를 잠금.
const DELETE_MAX_FAIL = 10;
const DELETE_LOCK_MINUTES = 60;
// 공감(따봉)
const LIKES_COL = 7;              // G열. 시트 열 구성을 바꾸면 이 숫자도 같이 바꾸기
const LIKE_LIMIT_PER_MIN = 20;    // 글 하나당 1분(시계 기준 1분 단위)에 반영되는 공감 누르기·취소 횟수 상한 (조작 방지)
const TIMEZONE = 'Asia/Seoul'; // TODAY 방문자 수를 한국 날짜 기준으로 셈


/* ---------- 1. GET: 방명록 목록 + 방문자 수 ---------- */
function doGet(e) {
  const params = (e && e.parameter) || {};
  try {
    // 사이트가 visit=1을 붙여 보내면 방문 1회로 셈 (같은 탭에서 새로고침하면 안 붙음)
    const stats = params.visit === '1' ? countVisit_() : readStats_();
    return json_({ ok: true, entries: listEntries_(), today: stats.today, total: stats.total });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'SERVER' });
  }
}


/* ---------- 2. POST: 새 글 등록 ---------- */
function doPost(e) {
  // 사이트는 text/plain으로 JSON 글자를 보냄 → 여기서 직접 해석
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'BAD_REQUEST' });
  }

  // action으로 요청 종류를 구분 (값이 없으면 글 등록으로 봄)
  const action = String(body.action || 'post');
  if (action === 'post') return handlePost_(body);
  if (action === 'delete') return handleDelete_(body);
  if (action === 'like') return handleLike_(body);
  return json_({ ok: false, error: 'BAD_REQUEST' });
}

// 새 글 등록
function handlePost_(body) {
  // 마감 이후엔 거절 (사이트에서 입력창을 숨겨도, 주소로 직접 보내는 경우까지 막기 위해 서버에서도 확인)
  if (new Date() > END_DATE) return json_({ ok: false, error: 'CLOSED' });

  const nickname = String(body.nickname || '').trim();
  const studentId = String(body.studentId || '').trim();
  const message = String(body.message || '').trim();

  // 사이트에서 이미 검사했지만, 웹 앱 주소는 공개라 서버에서 한 번 더 검사
  const error = validate_(nickname, studentId, message);
  if (error) return json_({ ok: false, error: error });

  // 여러 명이 동시에 등록해도 줄이 꼬이지 않게 잠금
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'BUSY' });
  try {
    const sheet = getSheet_();
    // 앞에 붙인 ' 는 "글자 그대로 저장"하라는 표시.
    // 없으면 "=..."로 시작하는 글은 수식으로, "10/5"는 날짜로 바뀌어 버림. 시트 화면엔 ' 가 안 보여.
    // 학번은 E열에만 저장 (앞의 0이 사라지지 않게 ' 를 붙여 글자로 저장)
    // F열(deletedAt)은 비워두고, G열(likes)은 공감 0개로 시작
    sheet.appendRow([new Date(), "'" + nickname, "'" + message, true, "'" + studentId, '', 0]);
    sheet.getRange(sheet.getLastRow(), 4).insertCheckboxes().check(); // D열을 체크된 체크박스로
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}


// 본인 글 삭제: 글 번호(no) + 학번이 시트의 값과 맞을 때만 안 보이게 바꿈.
// 행을 지우지 않는 이유: 행을 지우면 아래 글들의 번호가 당겨져서 다른 사람 글 번호가 바뀜.
function handleDelete_(body) {
  // 마감 뒤에는 삭제도 받지 않음 (마감 후 글은 그대로 보존하기로 정함)
  if (new Date() > END_DATE) return json_({ ok: false, error: 'DEL_CLOSED' });

  const no = Number(body.no);
  const studentId = String(body.studentId || '').trim();
  if (!studentId) return json_({ ok: false, error: 'SID_REQUIRED' });
  if (!STUDENT_ID_RE.test(studentId)) return json_({ ok: false, error: 'SID_INVALID' });
  if (!(no >= 1) || no !== Math.floor(no)) return json_({ ok: false, error: 'DEL_NOT_FOUND' });

  // 같은 글에 학번을 계속 틀리게 넣어보는 경우 차단
  if (isDeleteLocked_(no)) return json_({ ok: false, error: 'DEL_LOCKED' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'BUSY' });
  try {
    const sheet = getSheet_();
    const row = no + 1; // 1행이 제목줄이라 "글 번호 + 1"이 실제 시트 줄 번호
    if (row > sheet.getLastRow()) return json_({ ok: false, error: 'DEL_NOT_FOUND' });

    // 여기서만 E열(학번)을 읽음. 맞는지 비교만 하고 응답에는 절대 담지 않음.
    const values = sheet.getRange(row, 1, 1, 5).getValues()[0];
    if (!values[1] && !values[2]) return json_({ ok: false, error: 'DEL_NOT_FOUND' }); // 빈 줄
    if (!isVisible_(values[3])) return json_({ ok: false, error: 'DEL_ALREADY' });
    if (String(values[4]).trim() !== studentId) {
      countDeleteFail_(no);
      return json_({ ok: false, error: 'DEL_MISMATCH' });
    }

    sheet.getRange(row, 4).setValue(false);      // D열 체크 해제 → 사이트에서 사라짐
    sheet.getRange(row, 6).setValue(new Date()); // F열에 지운 시각 기록
    clearDeleteFail_(no);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// 공감(따봉): 글 번호(no)의 G열 숫자를 delta(+1 누르기 / -1 취소)만큼 바꿈.
// 누가 눌렀는지는 서버에 남기지 않음(익명). 한 사람이 한 번만 누르게 하는 건 사이트(브라우저) 쪽에서 하고,
// 서버는 주소로 직접 마구 보내는 조작을 막기 위해 "글 하나당 1분에 20번"까지만 받아줌.
function handleLike_(body) {
  const no = Number(body.no);
  const delta = Number(body.delta);
  if (delta !== 1 && delta !== -1) return json_({ ok: false, error: 'BAD_REQUEST' });
  if (!(no >= 1) || no !== Math.floor(no)) return json_({ ok: false, error: 'LIKE_GONE' });

  // 여러 명이 동시에 눌러도 "읽고 → 더하고 → 쓰기"가 섞이지 않게 잠금
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return json_({ ok: false, error: 'BUSY' });
  try {
    const sheet = getSheet_();
    const row = no + 1; // 1행이 제목줄이라 "글 번호 + 1"이 실제 시트 줄 번호
    if (row > sheet.getLastRow()) return json_({ ok: false, error: 'LIKE_GONE' });

    // A~D열만 읽어서 보이는 글인지 확인 (E열 학번은 읽지 않음)
    const values = sheet.getRange(row, 1, 1, 4).getValues()[0];
    if (!values[1] && !values[2]) return json_({ ok: false, error: 'LIKE_GONE' }); // 빈 줄
    if (!isVisible_(values[3])) return json_({ ok: false, error: 'LIKE_GONE' });   // 숨김·삭제된 글

    if (!takeLikeQuota_(no)) return json_({ ok: false, error: 'LIKE_LIMIT' });

    const cell = sheet.getRange(row, LIKES_COL);
    const likes = Math.max(0, toLikes_(cell.getValue()) + delta); // 0 아래로는 안 내려감
    cell.setValue(likes);
    return json_({ ok: true, likes: likes });
  } finally {
    lock.releaseLock();
  }
}

// 글 하나당 1분에 LIKE_LIMIT_PER_MIN번까지만 허용. 넘으면 false.
// 숫자는 CacheService(잠깐 쓰고 버리는 저장소)에 "글번호 + 몇 번째 분"을 이름으로 저장 → 2분 뒤 저절로 사라짐.
// 잠금(lock) 안에서만 불러서, 동시에 눌러도 횟수가 정확하게 셈.
function takeLikeQuota_(no) {
  const cache = CacheService.getScriptCache();
  const key = 'like_' + no + '_' + Math.floor(Date.now() / 60000);
  const count = Number(cache.get(key) || 0);
  if (count >= LIKE_LIMIT_PER_MIN) return false;
  cache.put(key, String(count + 1), 120);
  return true;
}

// G열 값을 숫자로 (비어 있거나 이상한 값이면 0)
function toLikes_(value) {
  const n = Math.floor(Number(value));
  return n > 0 ? n : 0;
}

/* ---------- 3. 시트 읽기 ---------- */

// 체크(visible)된 글만 골라 최신순으로 정리
function listEntries_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // 1행은 제목줄이라 2행부터가 글

  // A~D열만 읽음. E열(학번)은 아예 읽지 않으니 응답에 섞여 나갈 수 없음.
  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  // 공감 수는 G열만 따로 읽음 (E·F열을 건너뛰려고 한 번에 읽지 않음)
  const likeRows = sheet.getRange(2, LIKES_COL, lastRow - 1, 1).getValues();
  const entries = [];
  rows.forEach(function (row, i) {
    const timestamp = row[0], nickname = row[1], message = row[2], visible = row[3];
    if (!isVisible_(visible)) return;    // 체크 해제된 글은 건너뜀
    if (!nickname && !message) return;   // 빈 줄은 건너뜀
    entries.push({
      no: i + 1,                         // 글 번호 = 시트의 몇 번째 글인지
      nickname: String(nickname),
      message: String(message),
      createdAt: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp),
      likes: toLikes_(likeRows[i][0]),   // 공감 수
    });
  });
  return entries.reverse(); // 최신 글이 위로
}

function isVisible_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('시트 탭 이름이 "' + SHEET_NAME + '"인지 확인해줘');
  return sheet;
}


/* ---------- 4. 입력 검사 (app.js의 validate와 같은 규칙) ---------- */
function validate_(nickname, studentId, message) {
  if (!nickname || !message) return 'EMPTY';
  if (Array.from(nickname).length > MAX_NICKNAME) return 'NICKNAME_TOO_LONG';
  if (!studentId) return 'SID_REQUIRED';
  if (!STUDENT_ID_RE.test(studentId)) return 'SID_INVALID';
  if (message.split(/\s+/).filter(String).length > MAX_WORDS) return 'TOO_MANY_WORDS';
  if (Array.from(message).length > MAX_CHARS) return 'TOO_LONG';
  return null;
}


/* ---------- 4-2. 삭제 실패 횟수 (스크립트 속성에 "횟수:마지막시각"으로 저장) ---------- */

function deleteFailKey_(no) {
  return 'delfail_' + no;
}

function deleteFailState_(no) {
  const raw = PropertiesService.getScriptProperties().getProperty(deleteFailKey_(no));
  if (!raw) return { count: 0, last: 0 };
  const parts = String(raw).split(':');
  return { count: Number(parts[0]) || 0, last: Number(parts[1]) || 0 };
}

// 실패가 꽉 찼고, 잠금 시간이 아직 안 지났으면 true
function isDeleteLocked_(no) {
  const state = deleteFailState_(no);
  if (state.count < DELETE_MAX_FAIL) return false;
  return (Date.now() - state.last) < DELETE_LOCK_MINUTES * 60 * 1000;
}

function countDeleteFail_(no) {
  const state = deleteFailState_(no);
  // 잠금 시간이 지났으면 0부터 다시 셈
  const expired = state.count >= DELETE_MAX_FAIL && (Date.now() - state.last) >= DELETE_LOCK_MINUTES * 60 * 1000;
  const count = expired ? 0 : state.count;
  PropertiesService.getScriptProperties().setProperty(deleteFailKey_(no), (count + 1) + ':' + Date.now());
}

function clearDeleteFail_(no) {
  PropertiesService.getScriptProperties().deleteProperty(deleteFailKey_(no));
}


/* ---------- 5. 방문자 수 (시트가 아니라 스크립트 속성에 숫자만 저장) ---------- */

function todayKey_() {
  return 'day_' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

function readStats_() {
  const props = PropertiesService.getScriptProperties();
  return {
    today: Number(props.getProperty(todayKey_()) || 0),
    total: Number(props.getProperty('total') || 0),
  };
}

function countVisit_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return readStats_(); // 너무 붐비면 이번 방문은 세지 않고 넘어감
  try {
    const props = PropertiesService.getScriptProperties();
    const key = todayKey_();
    const today = Number(props.getProperty(key) || 0) + 1;
    const total = Number(props.getProperty('total') || 0) + 1;
    const update = { total: String(total) };
    update[key] = String(today);
    props.setProperties(update);
    return { today: today, total: total };
  } finally {
    lock.releaseLock();
  }
}


/* ---------- 6. 응답 도구 ---------- */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
