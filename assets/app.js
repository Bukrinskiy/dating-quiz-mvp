function track(event, data) {
  console.log(event, data || {});
}

document.addEventListener('DOMContentLoaded', function () {
  var page = document.body.getAttribute('data-page');

  if (page === 'landing') {
    track('landing_view');

    var startBtn = document.querySelector('[data-start-quiz]');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        track('landing_start_click');
      });
    }
  }

  if (page && page.indexOf('block-') === 0) {
    var blockNum = Number(page.replace('block-', ''));
    track('block_view', { block: blockNum });
  }

  initFaq();
  initQuestionFlow();
  initScreens();
});

function initFaq() {
  var faqTriggers = document.querySelectorAll('.faq-trigger');
  faqTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var parent = trigger.closest('.faq-item');
      if (parent) {
        parent.classList.toggle('open');
      }
    });
  });
}

function initQuestionFlow() {
  var quiz = document.querySelector('[data-quiz]');
  if (!quiz) return;

  var items = quiz.querySelectorAll('.question-item');
  var activeIndex = 0;

  function showQuestion(index) {
    items.forEach(function (item, i) {
      item.classList.toggle('active', i === index);
    });

    if (items[index]) {
      var q = items[index].getAttribute('data-question') || index + 1;
      track('question_view', { question: Number(q) });
    }
  }

  showQuestion(activeIndex);

  quiz.querySelectorAll('[data-answer]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-answer');
      track('answer_click', { answer: value });
      if (activeIndex < items.length - 1) {
        activeIndex += 1;
        showQuestion(activeIndex);
      }
    });
  });

  var completeBtn = document.querySelector('[data-block-complete]');
  if (completeBtn) {
    completeBtn.addEventListener('click', function () {
      track('block_complete', { block: document.body.getAttribute('data-page') });
    });
  }
}

function initScreens() {
  var container = document.querySelector('[data-screens]');
  if (!container) return;

  var screens = container.querySelectorAll('.screen');
  var nextBtn = document.querySelector('[data-next-screen]');
  var finalCta = document.querySelector('[data-result-cta]');
  var finishLink = document.querySelector('[data-finish-link]');
  var current = 0;

  function showScreen(index) {
    screens.forEach(function (screen, i) {
      screen.classList.toggle('active', i === index);
    });

    if (document.body.getAttribute('data-page') === 'block-7') {
      track('result_view', { screen: index + 1 });
    }

    if (nextBtn) {
      nextBtn.style.display = index >= screens.length - 1 ? 'none' : 'inline-block';
    }

    if (finishLink) {
      finishLink.classList.toggle('hidden', index < screens.length - 1);
    }
  }

  showScreen(current);

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (current < screens.length - 1) {
        current += 1;
        showScreen(current);
      }
    });
  }

  if (finalCta) {
    finalCta.addEventListener('click', function () {
      track('result_cta_click');
    });
  }
}
