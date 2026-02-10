(function () {
  var STORAGE_KEY = 'dating_quiz_answers';
  var BLOCK_KEY = 'block1';
  var QUESTIONS = [
    {
      id: 'q1',
      title: 'Где ты сейчас чаще всего знакомишься с девушками?',
      answers: [
        { id: 'apps', label: 'В приложениях для знакомств' },
        { id: 'social', label: 'В соцсетях / мессенджерах' },
        { id: 'offline', label: 'Вживую (друзья, мероприятия)' },
        { id: 'mixed', label: 'Смешанно, в разных местах' }
      ]
    },
    {
      id: 'q2',
      title: 'На каком этапе чаще всего всё ломается?',
      answers: [
        { id: 'no_reply', label: 'Не отвечают на первое сообщение' },
        { id: 'dialog_dies', label: 'Диалог быстро гаснет' },
        { id: 'no_meeting', label: 'Не получается перевести общение в встречу' },
        { id: 'after_first_date', label: 'После первой встречи всё остывает' }
      ]
    },
    {
      id: 'q3',
      title: 'Что тебе сейчас важнее всего получить от знакомств?',
      answers: [
        { id: 'real_meetings', label: 'Реальные встречи, а не бесконечную переписку' },
        { id: 'to_intimacy', label: 'Чтобы общение доходило до близости, а не сливалось' },
        { id: 'feel_interesting', label: 'Чувствовать, что я реально интересен девушке' },
        { id: 'stable_relation', label: 'Найти стабильный формат / отношения' }
      ]
    },
    {
      id: 'q4',
      title: 'Сколько новых диалогов ты обычно начинаешь за неделю?',
      answers: [
        { id: '0', label: '0' },
        { id: '1_2', label: '1–2' },
        { id: '3_5', label: '3–5' },
        { id: '6_plus', label: '6+' }
      ]
    }
  ];

  var currentQuestionIndex = 0;
  var answers = loadStoredAnswers();

  var introNode = document.querySelector('[data-intro]');
  var titleNode = document.querySelector('[data-question-title]');
  var answerListNode = document.querySelector('[data-answer-list]');
  var completeNode = document.querySelector('[data-complete]');

  if (!titleNode || !answerListNode || !completeNode) {
    return;
  }

  trackEvent('quiz_block_view', { block: 1 });
  renderQuestion(currentQuestionIndex);

  function loadStoredAnswers() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }

      var parsed = JSON.parse(raw);
      return parsed[BLOCK_KEY] || {};
    } catch (error) {
      return {};
    }
  }

  function saveAnswer(questionId, answerId) {
    answers[questionId] = answerId;

    var payload = { block1: answers };

    try {
      var existingRaw = localStorage.getItem(STORAGE_KEY);
      if (existingRaw) {
        var parsedExisting = JSON.parse(existingRaw);
        payload = Object.assign({}, parsedExisting, { block1: answers });
      }
    } catch (error) {
      payload = { block1: answers };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function renderQuestion(index) {
    var question = QUESTIONS[index];

    if (!question) {
      showCompleteScreen();
      return;
    }

    completeNode.hidden = true;
    titleNode.hidden = false;
    answerListNode.hidden = false;

    if (introNode) {
      introNode.hidden = index !== 0;
    }

    titleNode.textContent = question.title;

    answerListNode.classList.add('is-changing');

    setTimeout(function () {
      answerListNode.innerHTML = '';

      question.answers.forEach(function (answer) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'quiz-answer';
        button.textContent = answer.label;
        button.dataset.answerId = answer.id;

        if (answers[question.id] === answer.id) {
          button.classList.add('is-active');
        }

        button.addEventListener('click', function () {
          selectAnswer(question, answer, button);
        });

        answerListNode.appendChild(button);
      });

      requestAnimationFrame(function () {
        answerListNode.classList.remove('is-changing');
      });
    }, 120);

    trackEvent('quiz_question_view', {
      block: 1,
      question_number: index + 1,
      question_id: question.id
    });
  }

  function selectAnswer(question, answer, button) {
    Array.prototype.forEach.call(answerListNode.children, function (node) {
      node.classList.remove('is-active');
    });
    button.classList.add('is-active');

    saveAnswer(question.id, answer.id);

    trackEvent('quiz_answer_select', {
      block: 1,
      question_id: question.id,
      answer_id: answer.id
    });

    trackEvent('quiz_next_click', {
      block: 1,
      from_question: currentQuestionIndex + 1,
      trigger: 'answer_select'
    });

    currentQuestionIndex += 1;
    window.setTimeout(function () {
      renderQuestion(currentQuestionIndex);
    }, 180);
  }

  function showCompleteScreen() {
    titleNode.hidden = true;
    answerListNode.hidden = true;
    completeNode.hidden = false;

    if (introNode) {
      introNode.hidden = true;
    }

    trackEvent('quiz_block_complete', {
      block: 1,
      answered_questions: Object.keys(answers).length
    });
  }

  function trackEvent(eventName, params) {
    console.log('[analytics]', eventName, params || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      params: params || {}
    });
  }
})();
