/**
 * Client-side module for DeepSeek Harness (dsh)
 * Follows DSH lazy CJS ModuleLoader specification
 */
window.__ModuleLoader__.load({
  id: "dsh-plugin-genshin-startup",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const CSS_TEXT = `
      #dsh-genshin-overlay {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        background-color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        opacity: 1;
        visibility: visible;
        transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.8s ease;
        user-select: none;
      }
      #dsh-genshin-overlay.dsh-fade-out {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      .dsh-genshin-video-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffff;
      }
      .dsh-genshin-video {
        width: 100vw;
        height: 100vh;
        object-fit: contain;
        background-color: #ffffff;
        display: block;
      }
    `;

    function injectStyles() {
      const tagId = "dsh-plugin-genshin-startup/style";
      if (typeof document !== "undefined" && !document.querySelector(`style[data-plugin-css="${tagId}"]`)) {
        const tag = document.createElement("style");
        tag.dataset.plugin = "dsh-plugin-genshin-startup";
        tag.dataset.pluginCss = tagId;
        tag.textContent = CSS_TEXT;
        document.head.appendChild(tag);
      }
    }

    function launchStartupAnimation() {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      if (window.__DSH_GENSHIN_LAUNCHED__) return;
      window.__DSH_GENSHIN_LAUNCHED__ = true;

      injectStyles();

      const overlay = document.createElement("div");
      overlay.id = "dsh-genshin-overlay";
      overlay.setAttribute("aria-label", "Genshin Impact Launch");

      const wrapper = document.createElement("div");
      wrapper.className = "dsh-genshin-video-wrapper";

      const video = document.createElement("video");
      video.className = "dsh-genshin-video";
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("webkit-playsinline", "true");
      video.preload = "auto";

      // Video sources
      const sources = [
        { src: "/assets/genshin-launch.mp4", type: "video/mp4" },
        { src: "/dsh-genshin-assets/genshin-launch.mp4", type: "video/mp4" },
        { src: "/assets/genshin-launch.mov", type: "video/quicktime" },
      ];

      sources.forEach(({ src, type }) => {
        const s = document.createElement("source");
        s.src = src;
        s.type = type;
        video.appendChild(s);
      });

      wrapper.appendChild(video);
      overlay.appendChild(wrapper);
      document.body.appendChild(overlay);

      let dismissed = false;

      function dismiss() {
        if (dismissed) return;
        dismissed = true;

        overlay.classList.add("dsh-fade-out");
        try {
          video.pause();
        } catch (e) {}

        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 850);

        window.removeEventListener("keydown", handleKeydown);
      }

      function handleKeydown(e) {
        if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
          dismiss();
        }
      }

      video.addEventListener("ended", dismiss);
      overlay.addEventListener("click", dismiss);
      window.addEventListener("keydown", handleKeydown);

      // Directly autoplay
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If unmuted autoplay blocked by browser policy, fall back to muted autoplay seamlessly without dialogs
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    }

    function apply(ctx) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", launchStartupAnimation);
      } else {
        launchStartupAnimation();
      }
    }

    exports.apply = apply;
    return module.exports;
  }
});
