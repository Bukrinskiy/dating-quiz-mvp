function track(event, data) {
  console.log(event, data || {});
}

function setStepView(step) {
  track('quiz_view_' + step);
}

function setupAnswerButtons(step, nextPage) {
  var buttons = document.querySelectorAll('[data-answer]');
  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      track('quiz_answer_' + step, { answer: button.dataset.answer });
      location.href = nextPage;
    });
  });
}

function setupHero() {
  track('hero_view');
  var cta = document.getElementById('hero-cta');
  var video = document.querySelector('.hero-video video');
  var fallback = document.querySelector('.fallback');

  if (cta) {
    cta.addEventListener('click', function () {
      track('hero_cta_click');
      location.href = 'step-1.html';
    });
  }

  if (video && fallback) {
    video.addEventListener('error', function () {
      fallback.style.display = 'flex';
    });
  }
}

function setupPaywall() {
  track('paywall_view');
  var cta = document.getElementById('paywall-cta');
  if (cta) {
    cta.addEventListener('click', function () {
      track('paywall_cta_click');
    });
  }
}
