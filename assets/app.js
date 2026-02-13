function track(event) {
  console.log(event);
}

function getClickIdFromTokens() {
  var tokens = window.tokens || {};
  if (typeof tokens.clickid === 'string' && tokens.clickid) {
    return tokens.clickid;
  }
  if (typeof tokens.bcid === 'string' && tokens.bcid) {
    return tokens.bcid;
  }

  return null;
}

function getClickIdFromQuery() {
  var params = new URLSearchParams(window.location.search);
  return params.get('clickid') || params.get('bcid');
}

function getClickId() {
  return getClickIdFromTokens() || getClickIdFromQuery();
}

function addClickIdToUrl(url, clickId) {
  if (!clickId || !url) {
    return url;
  }

  if (/^(mailto:|tel:|javascript:|#)/i.test(url)) {
    return url;
  }

  var resolvedUrl;
  try {
    resolvedUrl = new URL(url, window.location.href);
  } catch (error) {
    return url;
  }

  resolvedUrl.searchParams.set('clickid', clickId);
  return resolvedUrl.toString();
}

function propagateClickIdToLinks() {
  var clickId = getClickId();
  if (!clickId) {
    return;
  }

  var links = document.querySelectorAll('a[href]');
  links.forEach(function (link) {
    var href = link.getAttribute('href');
    var urlWithClickId = addClickIdToUrl(href, clickId);

    if (urlWithClickId && urlWithClickId !== href) {
      link.setAttribute('href', urlWithClickId);
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  propagateClickIdToLinks();

  if (window.BPixelJS && typeof window.BPixelJS.useTokens === 'function') {
    window.BPixelJS.useTokens(function () {
      propagateClickIdToLinks();
    });
  }

  initSiteFooter();
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
  initBlock7();
});

function initSiteFooter() {
  var body = document.body;

  if (!body || document.querySelector('[data-site-footer]')) {
    return;
  }

  var inBlocksFolder = window.location.pathname.indexOf('/blocks/') !== -1;
  var prefix = inBlocksFolder ? '../' : '';
  var footer = document.createElement('footer');

  footer.className = 'site-footer';
  footer.setAttribute('data-site-footer', '');
  footer.innerHTML =
    '<a href="' + prefix + 'terms.html">Пользовательское соглашение</a>' +
    '<span aria-hidden="true">•</span>' +
    '<a href="' + prefix + 'refund-policy.html">Политика возврата</a>' +
    '<span aria-hidden="true">•</span>' +
    '<a href="' + prefix + 'privacy-policy.html">Политика конфиденциальности</a>';

  body.appendChild(footer);
}

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
  var isTransitioning = false;
  var quizUx = window.QuizUX && typeof window.QuizUX.create === 'function'
    ? window.QuizUX.create({ quiz: quiz, questions: questions })
    : null;

  function setQuestionButtonsState(question, disabled) {
    if (!question) {
      return;
    }

    var questionButtons = question.querySelectorAll('[data-answer]');
    questionButtons.forEach(function (questionButton) {
      questionButton.disabled = disabled;
    });
  }

  questions.forEach(function (question, index) {
    var buttons = question.querySelectorAll('[data-answer]');

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        if (isTransitioning) {
          return;
        }

        isTransitioning = true;
        setQuestionButtonsState(question, true);

        buttons.forEach(function (item) {
          item.classList.remove('is-selected');
        });

        button.classList.add('is-selected');
        answers[index] = button.dataset.answer;

        if (introCopy) {
          introCopy.classList.add('hidden');
        }

        var runTransition = quizUx && typeof quizUx.transitionToQuestion === 'function'
          ? quizUx.transitionToQuestion(question, questions[index + 1])
          : Promise.resolve();

        var showMicroFeedback = quizUx && typeof quizUx.showMicroFeedback === 'function'
          ? quizUx.showMicroFeedback()
          : Promise.resolve();

        showMicroFeedback.then(function () {
          if (index < questions.length - 1) {
            runTransition.then(function () {
              isTransitioning = false;
            });
            return;
          }

          if (Object.keys(answers).length === questions.length) {
            if (completeMicrocopy) {
              completeMicrocopy.classList.remove('hidden');
            }
            continueLink.classList.remove('hidden');
          }

          if (quizUx && typeof quizUx.markCurrentBlockCompleted === 'function') {
            quizUx.markCurrentBlockCompleted();
          }

          isTransitioning = false;
        });
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
      var clickId = getClickId();
      window.location.href = addClickIdToUrl(BLOCK_7_URL, clickId);
    });
  }
}

function initBlock7() {
  var block = document.querySelector('[data-block7]');
  if (!block) {
    return;
  }

  var PAYWALL_URL = '../generate.php';
  var screens = Array.prototype.slice.call(block.querySelectorAll('[data-block7-screen]'));
  var screenButtons = block.querySelectorAll('[data-block7-next]');
  var payButton = block.querySelector('[data-block7-pay]');
  var container = block.querySelector('[data-block7-screens]');
  var casesTrack = block.querySelector('[data-block7-cases]');
  var casesDots = block.querySelector('[data-block7-cases-dots]');
  var currentScreen = 1;

  function initCasesSlider() {
    if (!casesTrack) {
      return;
    }

    var caseItems = Array.prototype.slice.call(casesTrack.querySelectorAll('.block7-case'));
    if (!caseItems.length) {
      return;
    }

    var sliderState = {
      activeIndex: 0,
      pages: 1,
      visibleCards: 1,
    };

    function setActiveDot(index) {
      if (!casesDots) {
        return;
      }

      var dots = casesDots.querySelectorAll('.block7-cases-dot');
      dots.forEach(function (dot, dotIndex) {
        var isActive = dotIndex === index;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    function getSliderMetrics() {
      var trackStyle = window.getComputedStyle(casesTrack);
      var gap = parseFloat(trackStyle.columnGap || trackStyle.gap || '0') || 0;
      var containerWidth = casesTrack.clientWidth;
      var cardWidth = caseItems[0] ? caseItems[0].clientWidth : containerWidth;
      var visibleCards = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)));
      var pages = Math.max(1, caseItems.length - visibleCards + 1);

      return { gap: gap, cardWidth: cardWidth, visibleCards: visibleCards, pages: pages };
    }

    function getClosestIndex() {
      var metrics = getSliderMetrics();
      var step = metrics.cardWidth + metrics.gap;
      if (!step) {
        return 0;
      }

      return Math.max(0, Math.min(metrics.pages - 1, Math.round(casesTrack.scrollLeft / step)));
    }

    function scrollToIndex(index) {
      var metrics = getSliderMetrics();
      var nextIndex = Math.max(0, Math.min(metrics.pages - 1, index));
      var step = metrics.cardWidth + metrics.gap;

      casesTrack.scrollTo({ left: step * nextIndex, behavior: 'smooth' });
      sliderState.activeIndex = nextIndex;
      setActiveDot(nextIndex);
    }

    function buildDots() {
      if (!casesDots) {
        return;
      }

      var metrics = getSliderMetrics();
      sliderState.pages = metrics.pages;
      sliderState.visibleCards = metrics.visibleCards;
      sliderState.activeIndex = Math.min(sliderState.activeIndex, metrics.pages - 1);

      casesDots.innerHTML = '';

      for (var index = 0; index < metrics.pages; index += 1) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'block7-cases-dot';
        dot.setAttribute('aria-label', 'Показать кейс ' + (index + 1));
        dot.setAttribute('aria-current', index === sliderState.activeIndex ? 'true' : 'false');
        dot.addEventListener('click', (function (dotIndex) {
          return function () {
            scrollToIndex(dotIndex);
          };
        })(index));
        casesDots.appendChild(dot);
      }

      setActiveDot(sliderState.activeIndex);
    }

    function syncCasesLayout() {
      var isDesktop = window.matchMedia('(min-width: 720px)').matches;
      casesTrack.style.gridAutoColumns = isDesktop ? 'minmax(0, calc((100% - 20px) / 3))' : '100%';

      buildDots();
      scrollToIndex(sliderState.activeIndex);
    }

    function onTrackScroll() {
      var closestIndex = getClosestIndex();
      if (closestIndex === sliderState.activeIndex) {
        return;
      }

      sliderState.activeIndex = closestIndex;
      setActiveDot(closestIndex);
    }

    syncCasesLayout();
    casesTrack.addEventListener('scroll', onTrackScroll, { passive: true });
    window.addEventListener('resize', syncCasesLayout, { passive: true });
  }

  function setScreen(screenNumber) {
    currentScreen = screenNumber;

    screens.forEach(function (screen) {
      var isActive = Number(screen.dataset.block7Screen) === screenNumber;
      screen.classList.toggle('hidden', !isActive);
      screen.classList.toggle('is-active', isActive);
    });

    var activeScreen = block.querySelector('[data-block7-screen="' + screenNumber + '"]');
    var activeHeading = activeScreen && activeScreen.querySelector('.block7__title');

    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (activeHeading) {
      activeHeading.focus({ preventScroll: true });
    }
  }

  setScreen(currentScreen);

  screenButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var nextScreen = Number(button.dataset.block7Next);
      if (nextScreen) {
        setScreen(nextScreen);
      }
    });
  });

  if (payButton) {
    payButton.addEventListener('click', function () {
      var clickId = getClickId();
      window.location.href = addClickIdToUrl(PAYWALL_URL, clickId);
    });
  }

  initCasesSlider();
}
