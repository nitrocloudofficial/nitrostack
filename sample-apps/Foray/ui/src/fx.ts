/**
 * FORAY — scroll choreography. GSAP + ScrollTrigger (free since 3.13).
 *
 * The gsap.com/scroll vocabulary, applied to a working dashboard:
 *
 *   · scrubbed progress bar pinned to the top edge
 *   · navbar shrinks past 40px of scroll
 *   · panels/cards reveal on entry and REVERSE when scrolled back out —
 *     the ScrollTrigger replay feel (toggleActions: play … reverse)
 *   · heatmap cells stagger in as a grid
 *   · hero copy and constellation drift on scrub (parallax)
 *   · topic bars grow, the 23→4 number pops
 *
 * Deliberately NOT used: pinning and ScrollSmoother. Pinning inserts
 * spacer elements and hijacks layout — great on a marketing page, hostile
 * in a dashboard someone is operating live. Smoothing wraps the scroller
 * and fights the chat panel's internal overflow scrolling.
 *
 * SPA reality: panels mount late (async data) and views swap on
 * login/subject change. A MutationObserver watches for the *count* of
 * animatable elements changing and rebuilds — counting, rather than
 * rebuilding on any mutation, means chat messages streaming in do NOT
 * retrigger every reveal on screen.
 *
 * Elements already revealed and still in view are skipped on rebuild, so
 * opening a cluster detail never re-blurs the whole page mid-demo.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REVEAL =
  'section.panel, .card, .compass-item, .topic-group, .cluster, .panel.inner';

export function initFx(): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }
  document.documentElement.classList.add('fx');

  let ctx: gsap.Context | null = null;

  const build = () => {
    ctx?.revert();
    ctx = gsap.context(() => {
      // ── scrubbed progress bar ──────────────────────────────────────
      const bar = document.querySelector('.scroll-progress');
      if (bar) {
        gsap.fromTo(bar, { scaleX: 0 }, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 0.35 },
        });
      }

      // ── navbar shrinks once you're moving ──────────────────────────
      const nav = document.querySelector('nav');
      if (nav) {
        ScrollTrigger.create({
          start: 40, end: 'max',
          toggleClass: { targets: nav, className: 'shrunk' },
        });
      }

      // ── reveal + reverse on the way back out ───────────────────────
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>(REVEAL).forEach((el) => {
        const r = el.getBoundingClientRect();
        const inView = r.top < vh * 0.88 && r.bottom > 0;
        // Already shown and on screen: leave it alone. This is what stops
        // a mid-demo DOM change from re-blurring the visible page.
        if (el.dataset.fx === '1' && inView) return;
        el.dataset.fx = '1';
        gsap.fromTo(el,
          { y: 36, opacity: 0, filter: 'blur(7px)' },
          {
            y: 0, opacity: 1, filter: 'blur(0px)',
            duration: 0.75, ease: 'power3.out',
            scrollTrigger: {
              trigger: el, start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          });
      });

      // ── heatmap: the grid assembles ────────────────────────────────
      const heat = document.querySelector('.heat');
      if (heat && !(heat as HTMLElement).dataset.fx) {
        (heat as HTMLElement).dataset.fx = '1';
        gsap.fromTo(heat.querySelectorAll('.hcell'),
          { opacity: 0, scale: 0.55 },
          {
            opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out',
            stagger: { each: 0.008, from: 'start' },
            scrollTrigger: { trigger: heat, start: 'top 86%' },
          });
      }

      // ── parallax: hero copy drifts slower than the page ────────────
      const heroWrap = document.querySelector('.login-hero');
      if (heroWrap) {
        gsap.to('.hero-copy', {
          y: -70, ease: 'none',
          scrollTrigger: {
            trigger: heroWrap, start: 'top top', end: 'bottom top',
            scrub: true,
          },
        });
        gsap.to('.hero-stats', {
          y: -30, ease: 'none',
          scrollTrigger: {
            trigger: heroWrap, start: 'top top', end: 'bottom top',
            scrub: true,
          },
        });
      }

      // ── parallax: constellation floats through its scroll window ───
      const cons = document.querySelector('.constellation');
      if (cons) {
        gsap.fromTo(cons, { y: 46 }, {
          y: -26, ease: 'none',
          scrollTrigger: {
            trigger: cons, start: 'top bottom', end: 'bottom top',
            scrub: 0.5,
          },
        });
      }

      // ── topic bars grow when they arrive ───────────────────────────
      document.querySelectorAll<HTMLElement>('.tbar').forEach((el) => {
        if (el.dataset.fx === '1') return;
        el.dataset.fx = '1';
        gsap.fromTo(el, { scaleX: 0 }, {
          scaleX: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 94%' },
        });
      });

      // ── the number. 23 → 4 deserves an entrance ────────────────────
      document.querySelectorAll<HTMLElement>('.efficacy').forEach((el) => {
        if (el.dataset.fx === '1') return;
        el.dataset.fx = '1';
        gsap.fromTo(el, { scale: 0.88, opacity: 0 }, {
          scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)',
          scrollTrigger: { trigger: el, start: 'top 96%' },
        });
      });
    });
    ScrollTrigger.refresh();
  };

  // Rebuild only when the SET of animatable elements changes — not on
  // every mutation, or chat traffic would retrigger the whole page.
  const fingerprint = () =>
    document.querySelectorAll(REVEAL).length * 1000 +
    document.querySelectorAll('.tbar').length * 10 +
    document.querySelectorAll('.efficacy, .heat').length;

  let last = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const maybeRebuild = () => {
    const now = fingerprint();
    if (now !== last) { last = now; build(); }
  };
  const mo = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(maybeRebuild, 180);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  maybeRebuild();

  return () => {
    mo.disconnect();
    clearTimeout(timer);
    ctx?.revert();
    ScrollTrigger.getAll().forEach((t) => t.kill());
    document.documentElement.classList.remove('fx');
  };
}
