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

  var isBlockOne = document.body && document.body.dataset.page === 'block-1';
  if (isBlockOne) {
    initBlockOneQuiz();
  }
});

function initBlockOneQuiz() {
  var quiz = document.querySelector('[data-quiz]');
  var continueLink = document.querySelector('[data-block-complete]');

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
        }

        if (Object.keys(answers).length === questions.length) {
          continueLink.classList.remove('hidden');
        }
      });
    });
  });
}
