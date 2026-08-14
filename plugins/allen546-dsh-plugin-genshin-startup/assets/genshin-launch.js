/**
 * Genshin Impact Startup Animation Plugin for DeepSeek Harness (dsh)
 * Centered video with white letterbox/pillarbox filling and direct seamless autoplay.
 */
(function () {
  if (typeof window === 'undefined') return;

  if (window.__DSH_GENSHIN_INITIALIZED__) return;
  window.__DSH_GENSHIN_INITIALIZED__ = true;

  const DEFAULT_CONFIG = {
    videoSrc: '/assets/genshin-launch.mp4',
    videoFallbackSrc: '/assets/genshin-launch.mov',
    fillColor: '#ffffff',
  };

  const config = Object.assign({}, DEFAULT_CONFIG, window.__DSH_GENSHIN_CONFIG__ || {});

  function initGenshinStartup() {
    const overlay = document.createElement('div');
    overlay.id = 'dsh-genshin-overlay';
    overlay.setAttribute('aria-label', 'DeepSeek Harness Genshin Startup');

    const wrapper = document.createElement('div');
    wrapper.className = 'dsh-genshin-video-wrapper';

    const video = document.createElement('video');
    video.className = 'dsh-genshin-video';
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'auto';

    const sources = [
      { src: config.videoSrc, type: 'video/mp4' },
      { src: '/assets/genshin-launch.mp4', type: 'video/mp4' },
      { src: '/dsh-genshin-assets/genshin-launch.mp4', type: 'video/mp4' },
      { src: config.videoFallbackSrc, type: 'video/quicktime' },
      { src: '/assets/genshin-launch.mov', type: 'video/quicktime' },
      { src: './assets/genshin-launch.mp4', type: 'video/mp4' },
    ];

    const seen = new Set();
    sources.forEach(({ src, type }) => {
      if (src && !seen.has(src)) {
        seen.add(src);
        const sourceEl = document.createElement('source');
        sourceEl.src = src;
        sourceEl.type = type;
        video.appendChild(sourceEl);
      }
    });

    wrapper.appendChild(video);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    let dismissed = false;

    function dismissOverlay() {
      if (dismissed) return;
      dismissed = true;

      overlay.classList.add('dsh-fade-out');

      try {
        video.pause();
      } catch (e) {}

      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 850);

      window.removeEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        dismissOverlay();
      }
    }

    video.addEventListener('ended', dismissOverlay);
    overlay.addEventListener('click', dismissOverlay);
    window.addEventListener('keydown', handleKeydown);

    // Direct autoplay
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGenshinStartup);
  } else {
    initGenshinStartup();
  }
})();
