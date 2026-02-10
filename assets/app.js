function track(event) {
  console.log(event);
}

document.addEventListener('DOMContentLoaded', function () {
  track('hero_view');

  var cta = document.querySelector('[data-hero-cta]');
  var video = document.querySelector('.hero__video');
  var media = document.querySelector('.hero__media');

  if (cta) {
    cta.addEventListener('click', function () {
      track('hero_cta_click');
    });
  }

  if (video && media) {
    video.addEventListener('error', function () {
      media.classList.add('is-fallback');
    });
  }

  initQuizBlock();
  initBlock6();
});

function initQuizBlock() {
  var quiz = document.querySelector('[data-quiz]');
  var continueLink = document.querySelector('[data-block-complete]');
  var completeMicrocopy = document.querySelector('[data-block-microcopy], [data-block1-microcopy]');
  var introCopy = document.querySelector('[data-block-intro], [data-block1-intro]');

  if (!quiz || !continueLink) {
    return;
  }

  var questions = Array.prototype.slice.call(quiz.querySelectorAll('.question-item'));
  var answers = {};

  questions.forEach(function (question, index) {
    var buttons = question.querySelectorAll('[data-answer]');

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        buttons.forEach(function (item) {
          item.classList.remove('is-selected');
        });

        button.classList.add('is-selected');
        answers[index] = button.dataset.answer;

        if (index < questions.length - 1) {
          question.classList.add('hidden');
          questions[index + 1].classList.remove('hidden');

          if (introCopy) {
            introCopy.classList.add('hidden');
          }
        }

        if (Object.keys(answers).length === questions.length) {
          if (completeMicrocopy) {
            completeMicrocopy.classList.remove('hidden');
          }
          continueLink.classList.remove('hidden');
        }
      });
    });
  });
}


function initBlock6() {
  var block = document.querySelector('[data-block6]');
  if (!block) {
    return;
  }

  var screens = Array.prototype.slice.call(block.querySelectorAll('[data-block6-screen]'));
  var nextButton = block.querySelector('[data-block6-next]');
  var finishButton = block.querySelector('[data-block6-finish]');
  var currentScreen = 0;
  var BLOCK_7_URL = 'block-7.html';

  function renderBlock6Screen(screenIndex) {
    currentScreen = screenIndex;

    screens.forEach(function (screen, index) {
      var isActive = index === screenIndex;
      screen.classList.toggle('hidden', !isActive);
      screen.classList.toggle('is-active', isActive);
    });

    var activeHeading = screens[screenIndex] && screens[screenIndex].querySelector('.block6__title');
    if (activeHeading) {
      activeHeading.focus({ preventScroll: true });
    }
  }

  if (nextButton) {
    nextButton.addEventListener('click', function () {
      if (currentScreen === 0) {
        renderBlock6Screen(1);
      }
    });
  }

  if (finishButton) {
    finishButton.addEventListener('click', function () {
      window.location.href = BLOCK_7_URL;
    });
  }
}
