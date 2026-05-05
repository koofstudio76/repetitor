const app = document.getElementById('app');

const state = {
  manifest: null,
  blocks: {},
  screen: 'home',
  courseId: null,
  blockId: null,
  levelId: null,
  quiz: null
};

const SUBJECTS = [
  {
    id: 'obshchestvo',
    title: 'Обществознание',
    subtitle: 'Школьная база + тесты по 6 блокам',
    icon: '⚖️',
    status: 'ready',
    stats: '6 блоков · 250+ карточек'
  },
  {
    id: 'politology',
    title: 'Основы политологии',
    subtitle: 'Власть, государство, режимы, партии, элиты',
    icon: '🏛️',
    status: 'soon',
    stats: 'заглушка'
  },
  {
    id: 'history',
    title: 'История',
    subtitle: 'Россия, мир, XX век, хронология, даты',
    icon: '📜',
    status: 'soon',
    stats: 'заглушка'
  },
  {
    id: 'law_basics',
    title: 'Основы права',
    subtitle: 'Конституция, отрасли права, ответственность',
    icon: '📘',
    status: 'soon',
    stats: 'заглушка'
  },
  {
    id: 'economics_basic',
    title: 'Экономика',
    subtitle: 'Рынок, деньги, бюджет, государство в экономике',
    icon: '💼',
    status: 'soon',
    stats: 'заглушка'
  },
  {
    id: 'sociology',
    title: 'Социология',
    subtitle: 'Общество, группы, стратификация, мобильность',
    icon: '👥',
    status: 'soon',
    stats: 'заглушка'
  },
  {
    id: 'philosophy',
    title: 'Философия',
    subtitle: 'Человек, познание, истина, ценности',
    icon: '🧠',
    status: 'soon',
    stats: 'заглушка'
  },
  {
    id: 'logic',
    title: 'Логика и аргументация',
    subtitle: 'Понятия, суждения, доказательство, ошибки',
    icon: '🧩',
    status: 'soon',
    stats: 'заглушка'
  },
  {
    id: 'academic_skills',
    title: 'Учёба в институте',
    subtitle: 'Конспект, эссе, доклад, подготовка к зачёту',
    icon: '🎓',
    status: 'soon',
    stats: 'заглушка'
  }
];

const PASSING_SCORE = 9;
const QUESTION_COUNT = 10;
const STORAGE_KEY = 'obshchestvo_progress_v2';

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress(progress) { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
function progressFor(blockId) {
  const progress = loadProgress();
  if (!progress[blockId]) progress[blockId] = { unlocked_levels: ['level_1'], scores: {} };
  if (!progress[blockId].unlocked_levels.includes('level_1')) progress[blockId].unlocked_levels.push('level_1');
  saveProgress(progress);
  return progress[blockId];
}
function isUnlocked(blockId, levelId) { return progressFor(blockId).unlocked_levels.includes(levelId); }
function unlockLevel(blockId, levelId) {
  const progress = loadProgress();
  if (!progress[blockId]) progress[blockId] = { unlocked_levels: ['level_1'], scores: {} };
  if (!progress[blockId].unlocked_levels.includes(levelId)) progress[blockId].unlocked_levels.push(levelId);
  saveProgress(progress);
}
function setScore(blockId, levelId, score) {
  const progress = loadProgress();
  if (!progress[blockId]) progress[blockId] = { unlocked_levels: ['level_1'], scores: {} };
  progress[blockId].scores[levelId] = Math.max(progress[blockId].scores[levelId] || 0, score);
  saveProgress(progress);
}
function resetProgress() {
  if (confirm('Сбросить весь прогресс по обществознанию?')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHome();
  }
}
function escapeHtml(text) {
  return String(text || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function shuffle(array) { return [...array].sort(() => Math.random() - 0.5); }
async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Не удалось загрузить ' + path);
  return response.json();
}
function showLoader(title = 'Загружаем курс', text = 'Подготавливаем карточки и тесты для офлайн-работы…') {
  app.innerHTML = `
    <div class="loader-screen">
      <div class="loader-card">
        <div class="loader-logo">⚖️</div>
        <div class="spinner"></div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(text)}</p>
      </div>
    </div>`;
}
async function init() {
  try {
    showLoader();
    state.manifest = await loadJson('data/course_manifest.json');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    setTimeout(renderHome, 350);
  } catch (err) {
    app.innerHTML = `<div class="app-shell"><div class="card"><h2>Ошибка загрузки</h2><p>${escapeHtml(err.message)}</p></div></div>`;
  }
}
async function loadBlock(blockId) {
  if (state.blocks[blockId]) return state.blocks[blockId];
  const meta = state.manifest.blocks.find(b => b.id === blockId);
  const data = await loadJson(meta.file);
  state.blocks[blockId] = data;
  return data;
}
function getTotalProgress() {
  if (!state.manifest) return { opened: 0, total: 0, passed: 0 };
  const progress = loadProgress();
  let opened = 0;
  let total = 0;
  let passed = 0;
  for (const block of state.manifest.blocks) {
    const blockProgress = progress[block.id];
    if (blockProgress) {
      opened += blockProgress.unlocked_levels?.length || 1;
      passed += Object.values(blockProgress.scores || {}).filter(score => score >= PASSING_SCORE).length;
    } else {
      opened += 1;
    }
    total += 6;
  }
  return { opened, total, passed };
}
function shell(content, options = {}) {
  const showReset = options.showReset !== false;
  const title = options.title || 'Учебная база';
  const subtitle = options.subtitle || 'Офлайн-карточки, уровни и тесты';
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar glass">
        <div class="brand-wrap">
          <div class="brand-icon">⚖️</div>
          <div>
            <div class="logo">${escapeHtml(title)}</div>
            <div class="subtitle">${escapeHtml(subtitle)}</div>
          </div>
        </div>
        ${showReset ? '<button class="btn ghost" id="resetBtn">Сброс прогресса</button>' : ''}
      </div>
      ${content}
      <div class="footer-note">Работает локально после установки. Прогресс сохраняется только на этом устройстве.</div>
    </div>`;
  const reset = document.getElementById('resetBtn');
  if (reset) reset.addEventListener('click', resetProgress);
}
function renderHome() {
  state.screen = 'home'; state.courseId = null; state.blockId = null; state.levelId = null; state.quiz = null;
  const total = getTotalProgress();
  const subjectCards = SUBJECTS.map(subject => {
    const ready = subject.status === 'ready';
    return `
      <button class="subject-card ${ready ? 'ready' : 'soon'}" data-subject="${subject.id}" ${ready ? '' : 'disabled'}>
        <div class="subject-top">
          <div class="subject-icon">${subject.icon}</div>
          <span class="pill ${ready ? 'ok' : 'soon'}">${ready ? 'Готово' : 'Скоро'}</span>
        </div>
        <strong>${escapeHtml(subject.title)}</strong>
        <p>${escapeHtml(subject.subtitle)}</p>
        <div class="muted small">${escapeHtml(subject.stats)}</div>
      </button>`;
  }).join('');
  shell(`
    <section class="hero">
      <div>
        <span class="eyebrow">Локальный учебник-тренажёр</span>
        <h1>База знаний для восстановления учёбы</h1>
        <p>Сначала работает обществознание: определения, уровни, тесты и открытие следующего уровня только после результата 9 из 10.</p>
        <div class="hero-actions">
          <button class="btn big" id="openObsh">Начать обществознание</button>
          <button class="btn secondary" id="installHelp">Как поставить на iPhone</button>
        </div>
      </div>
      <div class="stat-panel">
        <div class="stat"><strong>${total.opened}/${total.total}</strong><span>уровней открыто</span></div>
        <div class="stat"><strong>${total.passed}</strong><span>тестов пройдено</span></div>
        <div class="stat"><strong>9/10</strong><span>проходной балл</span></div>
      </div>
    </section>

    <div class="card install-card" id="installBox" hidden>
      <h2>Установка на iPhone</h2>
      <ol>
        <li>Загрузить содержимое папки <strong>dist</strong> на хостинг.</li>
        <li>Открыть ссылку именно в <strong>Safari</strong>.</li>
        <li>Нажать <strong>Поделиться → На экран Домой</strong>.</li>
        <li>Открыть иконку один раз при интернете, потом проверить в авиарежиме.</li>
      </ol>
    </div>

    <div class="section-title">
      <h2>Предметы</h2>
      <p>Сейчас активен один курс. Остальные карточки — заготовки под расширение.</p>
    </div>
    <div class="subject-grid">${subjectCards}</div>
  `, { title: 'Учебная база', subtitle: 'Для телефона и компьютера · PWA · офлайн после установки' });

  document.getElementById('openObsh').addEventListener('click', renderObshBlocks);
  document.getElementById('installHelp').addEventListener('click', () => {
    const box = document.getElementById('installBox');
    box.hidden = !box.hidden;
  });
  document.querySelectorAll('[data-subject]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.subject === 'obshchestvo') renderObshBlocks();
  }));
}
function renderObshBlocks() {
  state.courseId = 'obshchestvo';
  const cards = state.manifest.blocks.map(block => {
    const p = progressFor(block.id);
    const bestScores = Object.values(p.scores || {});
    const passedCount = bestScores.filter(score => score >= PASSING_SCORE).length;
    return `
      <button class="block-btn course-block" data-block="${block.id}">
        <div class="block-head">
          <strong>${escapeHtml(block.title)}</strong>
          <span class="pill ok">${p.unlocked_levels.length} ур.</span>
        </div>
        <div class="muted small">Открыто уровней: ${p.unlocked_levels.length}. Пройдено тестов: ${passedCount}.</div>
        <div class="mini-progress"><div style="width:${Math.min(100, (p.unlocked_levels.length / 8) * 100)}%"></div></div>
      </button>`;
  }).join('');
  shell(`
    <div class="actions"><button class="btn secondary" id="backHome">← На главный экран</button></div>
    <div class="course-hero card">
      <span class="eyebrow">Активный курс</span>
      <h1>Обществознание</h1>
      <p class="muted">Шесть основных блоков: человек и общество, духовная культура, экономика, социальные отношения, политика, право.</p>
    </div>
    <div class="grid">${cards}</div>
  `, { title: 'Обществознание', subtitle: 'Выберите блок курса' });
  document.getElementById('backHome').addEventListener('click', renderHome);
  document.querySelectorAll('[data-block]').forEach(btn => btn.addEventListener('click', async () => {
    showLoader('Открываем блок', 'Загружаем уровни и карточки…');
    await renderLevels(btn.dataset.block);
  }));
}
async function renderLevels(blockId) {
  state.blockId = blockId; state.levelId = null; state.quiz = null;
  const block = await loadBlock(blockId);
  const progress = progressFor(blockId);
  const list = block.levels.map((level, index) => {
    const opened = progress.unlocked_levels.includes(level.id);
    const score = progress.scores[level.id];
    return `
      <button class="level-btn ${opened ? '' : 'locked'}" data-level="${level.id}" ${opened ? '' : 'disabled'}>
        <div class="level-number">${index + 1}</div>
        <div class="level-content">
          <strong>${escapeHtml(level.title)}</strong><br>
          ${opened ? '<span class="badge ok">Открыт</span>' : '<span class="badge locked">Закрыт</span>'}
          ${score ? `<span class="badge warn">Лучший тест: ${score}/10</span>` : ''}
        </div>
      </button>`;
  }).join('');
  shell(`
    <div class="actions">
      <button class="btn secondary" id="backCourse">← К блокам</button>
      <button class="btn ghost" id="backHome">Главный экран</button>
    </div>
    <div class="card">
      <span class="eyebrow">Блок курса</span>
      <h1>${escapeHtml(block.block)}</h1>
      <p class="muted">Читайте карточки уровня, затем проходите тест. Для перехода нужно минимум 9 из 10.</p>
    </div>
    <div class="term-list">${list}</div>
  `, { title: 'Обществознание', subtitle: 'Уровни блока' });
  document.getElementById('backCourse').addEventListener('click', renderObshBlocks);
  document.getElementById('backHome').addEventListener('click', renderHome);
  document.querySelectorAll('[data-level]').forEach(btn => btn.addEventListener('click', () => renderStudy(blockId, btn.dataset.level)));
}
async function renderStudy(blockId, levelId) {
  showLoader('Открываем уровень', 'Готовим карточки определений…');
  const block = await loadBlock(blockId);
  if (!isUnlocked(blockId, levelId)) return renderLevels(blockId);
  state.blockId = blockId; state.levelId = levelId;
  const level = block.levels.find(l => l.id === levelId);
  const terms = block.terms.filter(t => t.level_id === levelId);
  const cards = terms.map((t, i) => `
    <article class="study-card">
      <div class="card-index">${i + 1} / ${terms.length}</div>
      <h2>${escapeHtml(t.term)}</h2>
      <div class="definition">${escapeHtml(t.definition)}</div>
      <div class="note-box"><strong>Кратко:</strong> ${escapeHtml(t.short_definition)}</div>
      <p class="muted"><strong>Тезис:</strong> ${escapeHtml(t.thesis)}</p>
    </article>`).join('');
  shell(`
    <div class="sticky-actions">
      <button class="btn secondary" id="backLevels">← К уровням</button>
      <button class="btn" id="startQuiz">Тест 10 вопросов</button>
    </div>
    <div class="card">
      <span class="eyebrow">Учебный уровень</span>
      <h1>${escapeHtml(level.title)}</h1>
      <p class="muted">Сначала прочитайте определения. Чтобы открыть следующий уровень, нужно сдать тест минимум на 9 из 10.</p>
    </div>
    ${cards}`,
    { title: 'Карточки', subtitle: block.block });
  document.getElementById('backLevels').addEventListener('click', () => renderLevels(blockId));
  document.getElementById('startQuiz').addEventListener('click', () => startQuiz(blockId, levelId));
}
function buildQuestions(block, levelId) {
  const terms = block.terms.filter(t => t.level_id === levelId);
  const allTerms = block.terms;
  const questions = [];
  for (const term of terms) {
    if (Array.isArray(term.questions)) {
      for (const q of term.questions) {
        if (q.type === 'choice') questions.push({ question: q.question, answers: q.answers, correct: q.correct, term: term.term });
        if (q.type === 'true_false') questions.push({ question: q.question, answers: ['Верно', 'Неверно'], correct: q.correct ? 0 : 1, term: term.term });
      }
    }
    const wrong = shuffle(allTerms.filter(x => x.term !== term.term)).slice(0, 3).map(x => x.term);
    questions.push({ question: `Какой термин соответствует определению: «${term.short_definition || term.definition}»?`, answers: shuffle([term.term, ...wrong]), correctText: term.term, term: term.term });
  }
  const normalized = questions.map(q => q.correctText ? { ...q, correct: q.answers.indexOf(q.correctText) } : q);
  let result = shuffle(normalized);
  while (result.length < QUESTION_COUNT && normalized.length) result = result.concat(shuffle(normalized));
  return result.slice(0, QUESTION_COUNT);
}
async function startQuiz(blockId, levelId) {
  showLoader('Запускаем тест', 'Собираем 10 вопросов…');
  const block = await loadBlock(blockId);
  const questions = buildQuestions(block, levelId);
  state.quiz = { questions, current: 0, selected: null, answers: [] };
  renderQuiz();
}
function renderQuiz() {
  const qz = state.quiz;
  const q = qz.questions[qz.current];
  const progressPercent = ((qz.current) / qz.questions.length) * 100;
  const answers = q.answers.map((a, i) => `<button class="answer ${qz.selected === i ? 'selected' : ''}" data-answer="${i}">${escapeHtml(a)}</button>`).join('');
  shell(`
    <div class="actions"><button class="btn secondary" id="cancelQuiz">← Выйти из теста</button></div>
    <div class="quiz-card">
      <div class="quiz-top">
        <div class="muted small">Вопрос ${qz.current + 1} из ${qz.questions.length}</div>
        <div class="score-target">нужно 9/10</div>
      </div>
      <div class="progressbar"><div style="width:${progressPercent}%"></div></div>
      <h2>${escapeHtml(q.question)}</h2>
      <div>${answers}</div>
      <div class="actions"><button class="btn big" id="nextQuestion" ${qz.selected === null ? 'disabled' : ''}>${qz.current + 1 === qz.questions.length ? 'Завершить тест' : 'Следующий вопрос'}</button></div>
    </div>`,
    { title: 'Тест', subtitle: 'Проходной балл 9 из 10' });
  document.getElementById('cancelQuiz').addEventListener('click', () => renderStudy(state.blockId, state.levelId));
  document.querySelectorAll('[data-answer]').forEach(btn => btn.addEventListener('click', () => {
    qz.selected = Number(btn.dataset.answer);
    renderQuiz();
  }));
  document.getElementById('nextQuestion').addEventListener('click', () => {
    qz.answers.push(qz.selected);
    qz.selected = null;
    if (qz.current + 1 >= qz.questions.length) renderResult();
    else { qz.current += 1; renderQuiz(); }
  });
}
function renderResult() {
  const qz = state.quiz;
  let score = 0;
  qz.questions.forEach((q, i) => { if (qz.answers[i] === q.correct) score++; });
  const passed = score >= PASSING_SCORE;
  setScore(state.blockId, state.levelId, score);
  let nextLevel = null;
  const block = state.blocks[state.blockId];
  const idx = block.levels.findIndex(l => l.id === state.levelId);
  if (passed && idx >= 0 && idx + 1 < block.levels.length) {
    nextLevel = block.levels[idx + 1];
    unlockLevel(state.blockId, nextLevel.id);
  }
  const mistakes = qz.questions.map((q, i) => ({ q, selected: qz.answers[i] })).filter(x => x.selected !== x.q.correct);
  const mistakesHtml = mistakes.length ? mistakes.map((m, i) => `
    <div class="mistake-card">
      <strong>Ошибка ${i + 1}</strong>
      <p>${escapeHtml(m.q.question)}</p>
      <p><span class="muted">Ваш ответ:</span> ${escapeHtml(m.q.answers[m.selected])}</p>
      <p><span class="muted">Правильно:</span> ${escapeHtml(m.q.answers[m.q.correct])}</p>
    </div>`).join('') : '<div class="mistake-card"><strong>Ошибок нет. Отлично.</strong></div>';
  shell(`
    <div class="result-card ${passed ? 'passed' : 'failed'}">
      <div class="result-icon">${passed ? '✅' : '🔁'}</div>
      <h1>${passed ? 'Уровень пройден' : 'Пока не пройден'}</h1>
      <p class="result-score">${score} из 10</p>
      <p>${passed ? (nextLevel ? `Открыт следующий уровень: <strong>${escapeHtml(nextLevel.title)}</strong>.` : 'Это был последний уровень блока.') : 'Для перехода нужно минимум 9 из 10. Повторите определения и попробуйте снова.'}</p>
      <div class="actions">
        <button class="btn" id="retryQuiz">Повторить тест</button>
        <button class="btn secondary" id="backStudy">К карточкам</button>
        <button class="btn ghost" id="backLevels">К уровням</button>
      </div>
    </div>
    <div class="section-title"><h2>Разбор ошибок</h2></div>
    ${mistakesHtml}`,
    { title: 'Результат', subtitle: 'Проверка уровня' });
  document.getElementById('retryQuiz').addEventListener('click', () => startQuiz(state.blockId, state.levelId));
  document.getElementById('backStudy').addEventListener('click', () => renderStudy(state.blockId, state.levelId));
  document.getElementById('backLevels').addEventListener('click', () => renderLevels(state.blockId));
}

init();
