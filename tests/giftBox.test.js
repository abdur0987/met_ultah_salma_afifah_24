/**
 * Unit tests for the gift box interactions in index.html.
 *
 * The inline script is extracted from the HTML and evaluated inside each test's
 * jsdom context so that fresh state (isOpened = false, new event listeners) is
 * guaranteed per test without any code duplication.
 *
 * Timer-dependent behaviour is controlled with Jest fake timers.
 * External dependencies (confetti, AOS, IntersectionObserver, scrollIntoView,
 * HTMLMediaElement.play) are replaced with Jest mocks.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Extract the last inline <script> block from index.html (the app logic).
// We do this once at module load since the HTML doesn't change between tests.
// ---------------------------------------------------------------------------
const htmlContent = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

function extractLastInlineScript(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (!matches.length) throw new Error('No inline <script> found in index.html');
  return matches[matches.length - 1][1];
}

const appScript = extractLastInlineScript(htmlContent);

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Gift Box Interactions', () => {
  let mockConfetti;
  let mockPlay;
  let mockScrollIntoView;

  beforeEach(() => {
    // -----------------------------------------------------------------------
    // Recreate the minimal DOM required by the script.
    // -----------------------------------------------------------------------
    document.body.innerHTML = `
      <audio id="bgMusic">
        <source src="music.mp3" type="audio/mpeg">
      </audio>
      <div id="giftBox" class="gift-container">
        <div class="gift-ribbon"></div>
        <div class="gift-lid"></div>
        <div class="gift-box">
          <div class="sparkle"></div>
        </div>
      </div>
      <section id="section2"></section>
    `;

    // -----------------------------------------------------------------------
    // Mock external globals that are loaded via CDN (unavailable in jsdom).
    // -----------------------------------------------------------------------
    mockConfetti = jest.fn();
    global.confetti = mockConfetti;

    global.AOS = { init: jest.fn() };

    // IntersectionObserver is not implemented in jsdom.
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe:    jest.fn(),
      unobserve:  jest.fn(),
      disconnect: jest.fn(),
    }));

    // scrollIntoView is not implemented in jsdom.
    mockScrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;

    // HTMLMediaElement.play is not implemented in jsdom.
    mockPlay = jest.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = mockPlay;

    // Use fake timers so setTimeout delays can be controlled precisely.
    jest.useFakeTimers();

    // Evaluate the app script: this attaches the click listener and sets
    // isOpened = false in the eval's own scope.
    // eslint-disable-next-line no-eval
    eval(appScript);
  });

  afterEach(() => {
    // Discard any pending timers so they don't bleed into subsequent tests.
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Gift box animation plays correctly on click
  // -------------------------------------------------------------------------
  test('1. Adds "is-open" class to the gift box on first click', () => {
    const giftBox = document.getElementById('giftBox');

    expect(giftBox.classList.contains('is-open')).toBe(false);

    giftBox.click();

    expect(giftBox.classList.contains('is-open')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Background music starts playing on gift box click
  // -------------------------------------------------------------------------
  test('2. Plays background music at volume 0.4 on first click', () => {
    const giftBox = document.getElementById('giftBox');
    const bgMusic = document.getElementById('bgMusic');

    giftBox.click();

    expect(bgMusic.volume).toBe(0.4);
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 3. Confetti animation is triggered after gift box is opened and scrolled
  //
  // Timeline after click:
  //   T+800 ms  → scrollIntoView()  +  schedules fireConfetti at T+1300
  //   T+1300 ms → fireConfetti()    →  shoot() at T+1300 (0 ms offset)
  //   Each shoot() calls confetti() twice.
  // -------------------------------------------------------------------------
  test('3. Fires confetti after the scroll animation completes (800 ms + 500 ms)', () => {
    const giftBox = document.getElementById('giftBox');

    giftBox.click();

    // Nothing yet — timers haven't fired.
    expect(mockConfetti).not.toHaveBeenCalled();

    // Advance past scroll delay (800 ms) + confetti delay (500 ms) + first
    // shoot offset (0 ms) = 1 300 ms total. Add a small buffer to be safe.
    jest.advanceTimersByTime(1400);

    expect(mockConfetti).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Scrolling to section 2 works correctly after gift box is opened
  //
  // The scroll must NOT happen immediately; it is deferred by 800 ms.
  // -------------------------------------------------------------------------
  test('4. Scrolls to #section2 with smooth behaviour after exactly 800 ms', () => {
    const giftBox = document.getElementById('giftBox');

    giftBox.click();

    // 1 ms before the deadline → scroll must not have happened yet.
    jest.advanceTimersByTime(799);
    expect(mockScrollIntoView).not.toHaveBeenCalled();

    // The final millisecond crosses the 800 ms threshold.
    jest.advanceTimersByTime(1);
    expect(mockScrollIntoView).toHaveBeenCalledTimes(1);
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  // -------------------------------------------------------------------------
  // 5. Secondary clicks trigger a smaller confetti burst and scroll to section 2
  // -------------------------------------------------------------------------
  test('5. Secondary clicks trigger a mini confetti burst and scroll to #section2', () => {
    const giftBox = document.getElementById('giftBox');

    // Open the gift box with the first click and let all timers complete.
    giftBox.click();
    jest.runAllTimers();

    // Isolate the secondary click by resetting call history.
    mockScrollIntoView.mockClear();
    mockConfetti.mockClear();

    // Second click (isOpened === true path).
    giftBox.click();

    // Should scroll to section 2 immediately (no timeout).
    expect(mockScrollIntoView).toHaveBeenCalledTimes(1);
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    // Should fire a single, small confetti burst with the correct parameters.
    expect(mockConfetti).toHaveBeenCalledTimes(1);
    expect(mockConfetti).toHaveBeenCalledWith({
      particleCount: 30,
      spread:        70,
      origin:        { y: 0.6 },
      colors:        ['#ff69b4', '#ff1493'],
    });
  });
});
