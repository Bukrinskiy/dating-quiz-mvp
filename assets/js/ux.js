(function () {
  var UX_CONFIG = {
    blocks: [
      { id: 'block-1', questionIds: [1, 2, 3, 4] },
      { id: 'block-2', questionIds: [1, 2, 3, 4] },
      { id: 'block-3', questionIds: [1, 2, 3, 4] },
      { id: 'block-4', questionIds: [1, 2, 3] },
      { id: 'block-5', questionIds: [1, 2, 3] }
    ],
    microMessages: ['Поняли 👌', 'Записали', 'Окей, важно', 'Принято', 'Есть'],
    messageDurationMs: 520,
    fadeOutMs: 230,
    fadeInMs: 230
  };

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function findBlockIndex(pageName) {
    for (var i = 0; i < UX_CONFIG.blocks.length; i += 1) {
      if (UX_CONFIG.blocks[i].id === pageName) {
        return i;
      }
    }

    return 0;
  }

  function createProgressBar(totalBlocks) {
    var container = document.createElement('div');
    container.className = 'quiz-ux-progress';
    container.style.setProperty('--segments', String(totalBlocks));
    container.setAttribute('data-ux-progress', '');
    container.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < totalBlocks; i += 1) {
      var segment = document.createElement('span');
      segment.className = 'quiz-ux-progress__segment';
      segment.setAttribute('data-progress-segment', String(i));
      container.appendChild(segment);
    }

    return container;
  }

  function setProgressState(progressNode, currentBlockIndex) {
    var segments = progressNode.querySelectorAll('[data-progress-segment]');
    segments.forEach(function (segment, index) {
      segment.classList.toggle('is-completed', index < currentBlockIndex);
      segment.classList.toggle('is-active', index === currentBlockIndex);
    });
  }

  function buildMessageNode() {
    var message = document.createElement('div');
    message.className = 'quiz-ux-message';
    message.setAttribute('data-ux-message', '');
    message.setAttribute('aria-live', 'polite');
    return message;
  }

  function pickRandomMessage() {
    return UX_CONFIG.microMessages[Math.floor(Math.random() * UX_CONFIG.microMessages.length)];
  }

  window.QuizUX = {
    create: function (params) {
      var quiz = params.quiz;
      var questions = params.questions || [];
      var body = document.body;
      var pageName = body ? body.dataset.page : '';
      var currentBlockIndex = findBlockIndex(pageName);

      if (!quiz || !questions.length) {
        return null;
      }

      var progressNode = createProgressBar(UX_CONFIG.blocks.length);
      var messageNode = buildMessageNode();

      quiz.insertAdjacentElement('beforebegin', progressNode);
      quiz.insertAdjacentElement('afterend', messageNode);

      setProgressState(progressNode, currentBlockIndex);

      return {
        transitionToQuestion: function (currentQuestion, nextQuestion) {
          if (!currentQuestion || !nextQuestion) {
            return Promise.resolve();
          }

          currentQuestion.classList.add('quiz-ux-question-leave');

          return wait(UX_CONFIG.fadeOutMs)
            .then(function () {
              currentQuestion.classList.add('hidden');
              currentQuestion.classList.remove('quiz-ux-question-leave');

              nextQuestion.classList.remove('hidden');
              nextQuestion.classList.add('quiz-ux-question-enter');

              return wait(16);
            })
            .then(function () {
              nextQuestion.classList.add('is-visible');
              return wait(UX_CONFIG.fadeInMs);
            })
            .then(function () {
              nextQuestion.classList.remove('quiz-ux-question-enter');
              nextQuestion.classList.remove('is-visible');
            });
        },
        showMicroFeedback: function () {
          if (!messageNode) {
            return Promise.resolve();
          }

          messageNode.textContent = pickRandomMessage();
          messageNode.classList.add('is-visible');

          return wait(UX_CONFIG.messageDurationMs).then(function () {
            messageNode.classList.remove('is-visible');
          });
        },
        markCurrentBlockCompleted: function () {
          setProgressState(progressNode, Math.min(currentBlockIndex + 1, UX_CONFIG.blocks.length - 1));
        }
      };
    }
  };
})();
