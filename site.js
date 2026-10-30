// Shared motion and interaction for the redesigned pages. Each block skips itself when its elements are absent.

// Always open at the top, even on reload (a #hash in the URL is handled by the page itself)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Split text into masked words and chars so each piece can rise in
$$('.split').forEach(el => {
    let i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => [...node.childNodes].forEach(n => {
        if (n.nodeType === 1) return walk(n);
        if (n.nodeType !== 3) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (!part.trim()) return frag.append(' ');
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            [...part].forEach(ch => {
                const c = document.createElement('span');
                c.className = 'c';
                c.textContent = ch;
                c.style.setProperty('--i', i++);
                w.append(c);
            });
            frag.append(w);
        });
        n.replaceWith(frag);
    });
    walk(el);
});

// Words of the about lead light up as you scroll through it
const scrub = $('.scrub');
let scrubWords = [];
if (scrub) {
    scrub.innerHTML = scrub.textContent.trim().split(/\s+/).map(w => `<span class="sw">${w}</span>`).join(' ');
    scrubWords = $$('.sw', scrub);
}

// Smooth scrolling (also for in-page anchors)
const lenis = window.Lenis && !reduce ? new Lenis({ duration: 1.2, anchors: { offset: -100 } }) : null;

// Reveal on scroll
const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
$$('.reveal, .split:not(.hero-title), .section-head, [data-observe]').forEach(el => io.observe(el));
$$('.stagger, .role ul').forEach(list => [...list.children].forEach((li, i) => li.style.setProperty('--i', i)));

// Highlight the nav link of the section in view
const links = $$('.nav-links a[href^="#"], .toc a');
const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.hash === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
$$('section[id]').forEach(s => spy.observe(s));

// Count stats up from zero
function countUp() {
    $$('[data-count]').forEach(el => {
        const target = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now();
        (function tick(now) {
            const p = clamp((now - t0) / 1800, 0, 1);
            el.textContent = Math.round(target * (1 - Math.pow(2, -10 * p))) + (p === 1 ? suffix : '');
            if (p < 1) requestAnimationFrame(tick);
        })(t0);
    });
}

// Page start: the homepage plays its intro loader, other pages lift the curtain
const loader = $('.loader');
const curtain = $('.curtain');
function start() {
    document.body.classList.add('ready');
    $$('.hero-title').forEach(el => el.classList.add('in'));
    countUp();
    document.dispatchEvent(new Event('site:ready'));
}
if (loader) {
    let seen = false;
    try { seen = sessionStorage.getItem('intro'); sessionStorage.setItem('intro', '1'); } catch (e) {}
    if (reduce) { loader.remove(); start(); }
    else {
        const dur = seen ? 300 : 1700, t0 = performance.now(), count = $('#count');
        (function tick(now) {
            const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
            count.textContent = Math.round(e * 100);
            loader.style.setProperty('--p', e);
            if (p < 1) return requestAnimationFrame(tick);
            loader.classList.add('done');
            setTimeout(start, 250);
            setTimeout(() => loader.remove(), 1300);
        })(t0);
    }
} else {
    if (curtain && curtain.classList.contains('enter')) requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.add('lift')));
    setTimeout(start, reduce ? 0 : 200);
}
const heroVideo = $('.hero-media video');
if (reduce && heroVideo) heroVideo.pause();

// Curtain transition when leaving for another page
document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || a.target || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = url.href; }, reduce ? 0 : 700);
});
addEventListener('pageshow', () => document.body.classList.remove('leaving'));

// Floating preview over the homepage work list
const preview = $('.preview');
if (preview) $$('.work-item a').forEach(a => {
    const img = new Image();
    img.src = a.querySelector('.work-thumb').src;
    img.alt = '';
    preview.append(img);
    a.addEventListener('mouseenter', () => {
        [...preview.children].forEach(im => im.classList.toggle('active', im === img));
        preview.classList.add('on');
    });
    a.addEventListener('mouseleave', () => preview.classList.remove('on'));
});

// Cursor: "View" over anything marked data-cursor="view"
const dot = $('.cursor'), ring = $('.cursor-ring');
let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, px = mx, py = my, squash = 1;
addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
document.addEventListener('mouseover', e => {
    if (!ring) return;
    const t = e.target, label = t.closest('[data-cursor]'), view = !!(label || t.closest('.work-item a'));
    ring.textContent = label && label.dataset.cursor === 'read' ? 'Read' : 'View';
    ring.classList.toggle('view', view);
    ring.classList.toggle('hover', !view && !!t.closest('a, button, summary, .caps li'));
});

// Soft gold glow that follows the pointer
$$('.glow').forEach(el => el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px');
    el.style.setProperty('--my', e.clientY - r.top + 'px');
}));

// Cards marked data-tilt lean toward the pointer in 3D, with a moving glare
if (!reduce) $$('[data-tilt]').forEach(el => {
    el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', (x - 0.5) * 12 + 'deg');
        el.style.setProperty('--rx', (0.5 - y) * 10 + 'deg');
        el.style.setProperty('--gx', x * 100 + '%');
        el.style.setProperty('--gy', y * 100 + '%');
    });
    el.addEventListener('mouseleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
});

// Magnetic buttons
$$('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.4}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
});

// Button labels roll over on hover: wrap the first text label in a .roll span
$$('.btn, .link-arrow, .chip').forEach(el => {
    const t = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (!t) return;
    const roll = document.createElement('span'), inner = document.createElement('span');
    roll.className = 'roll';
    inner.textContent = t.textContent.trim();
    roll.append(inner);
    t.replaceWith(roll);
});

// Every click gets feedback: a shockwave ring and a spark burst at the pointer, and the cursor squashes.
// Buttons get a bigger burst plus a ripple inside the button.
const JUICE = '.btn, .link-arrow, .nav-portfolio, .nav-resume, .chip, .case-close, .lightbox button';
function burst(x, y, count, reach) {
    const wave = document.createElement('i');
    wave.className = 'click-wave';
    wave.style.left = x + 'px';
    wave.style.top = y + 'px';
    document.body.append(wave);
    wave.animate([
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 }
    ], { duration: 600, easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)' }).onfinish = () => wave.remove();
    for (let i = 0; i < count; i++) {
        const p = document.createElement('i'), a = (i / count) * Math.PI * 2 + Math.random() * 0.6, d = reach * (0.6 + Math.random() * 0.6);
        p.className = 'spark' + (i % 3 ? '' : ' light');
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        document.body.append(p);
        p.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 }
        ], { duration: 420 + Math.random() * 320, easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)' }).onfinish = () => p.remove();
    }
}
if (!reduce) {
    document.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        if (ring) ring.classList.add('press');
        const b = e.target.closest(JUICE);
        if (b) {
            const r = b.getBoundingClientRect(), s = document.createElement('span');
            s.className = 'ripple';
            s.style.left = e.clientX - r.left + 'px';
            s.style.top = e.clientY - r.top + 'px';
            b.append(s);
            s.addEventListener('animationend', () => s.remove());
        }
        burst(e.clientX, e.clientY, b ? 10 : 7, b ? 55 : 34);
    });
    ['pointerup', 'pointercancel', 'blur'].forEach(t => addEventListener(t, () => ring && ring.classList.remove('press')));
}

// One frame loop for everything scroll- and pointer-driven
const nav = $('#nav'), progress = $('.progress');
const heroInner = $('.hero-inner'), heroMedia = $('.hero-media');
const parallax = $$('[data-parallax]');
let lastY = scrollY, dir = 1;

function frame(t) {
    if (lenis) lenis.raf(t);
    const y = scrollY, vh = innerHeight;
    if (Math.abs(y - lastY) > 2) dir = y > lastY ? 1 : -1;
    // Scroll speed drives the image zoom and title skew in CSS
    const vel = lenis ? lenis.velocity : y - lastY;
    document.documentElement.style.setProperty('--v', reduce ? 0 : clamp(Math.abs(vel) / 40, 0, 1).toFixed(3));
    document.documentElement.style.setProperty('--sv', reduce ? 0 : clamp(vel / 40, -1, 1).toFixed(3));

    if (nav) {
        nav.classList.toggle('scrolled', y > 40);
        nav.classList.toggle('hidden', dir > 0 && y > vh * 0.6);
    }
    if (progress) progress.style.transform = `scaleX(${y / Math.max(1, document.documentElement.scrollHeight - vh)})`;

    if (!reduce) {
        // Hero drifts up and fades as you leave it
        if (heroInner && y < vh * 1.2) {
            heroInner.style.transform = `translateY(${y * 0.35}px)`;
            heroInner.style.opacity = 1 - clamp(y / (vh * 0.8), 0, 1);
            if (heroMedia) heroMedia.style.transform = `translateY(${y * 0.2}px) scale(${1 + y / vh * 0.15})`;
        }

        // Images inside a [data-parallax] frame drift against the scroll
        parallax.forEach(frameEl => {
            const r = frameEl.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) return;
            const p = (r.top + r.height / 2 - vh / 2) / vh;
            frameEl.firstElementChild.style.transform = `translateY(${-8 + p * 12}%)`;
        });

        // Cursor and the preview card trail the pointer
        if (dot) {
            dot.style.transform = `translate(${mx}px, ${my}px)`;
            const dx = mx - rx, dy = my - ry, speed = Math.min(Math.hypot(dx, dy), 80);
            rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
            // The ring stretches along the direction it is travelling (not while showing "View")
            // Squash while pressed lives in the same transform; a separate `scale` property would also scale the translate and drag the ring away
            squash = lerp(squash, ring.classList.contains('press') ? 0.65 : 1, 0.3);
            ring.style.transform = ring.classList.contains('view') || speed < 1
                ? `translate(${rx}px, ${ry}px) scale(${squash})`
                : `translate(${rx}px, ${ry}px) rotate(${Math.atan2(dy, dx)}rad) scale(${(1 + speed / 110) * squash}, ${(1 - speed / 260) * squash})`;
        }
        if (preview) {
            const tilt = clamp((mx - px) * 0.08, -10, 10);
            px = lerp(px, mx, 0.1); py = lerp(py, my, 0.1);
            const left = Math.min(px + 32, innerWidth - preview.offsetWidth - 16);
            preview.style.transform = `translate(${left}px, ${py - preview.offsetHeight / 2}px) rotate(${tilt}deg)`;
        }
    }

    // Lead paragraph lights up word by word
    if (scrub) {
        const sr = scrub.getBoundingClientRect();
        const sp = clamp((vh * 0.85 - sr.top) / (sr.height + vh * 0.35), 0, 1);
        const lit = Math.round(sp * scrubWords.length);
        scrubWords.forEach((w, i) => w.classList.toggle('on', reduce || i < lit));
    }

    lastY = y;
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Lightbox for images, YouTube videos and local .mp4 clips
const lb = $('.lightbox');
let lbItems = [], lbAt = 0;
function showShot(i) {
    lbAt = (i + lbItems.length) % lbItems.length;
    const it = lbItems[lbAt], stage = $('.lightbox-stage', lb);
    stage.innerHTML = it.yt
        ? `<iframe src="https://www.youtube.com/embed/${it.yt}?autoplay=1" title="Gameplay video" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`
        : /\.mp4$/i.test(it.src)
            ? `<video src="${it.src}" controls autoplay loop playsinline></video>`
            : `<img src="${it.src}" alt="${it.alt || ''}">`;
    $('.lb-count', lb).textContent = `${lbAt + 1} / ${lbItems.length}`;
    if (!reduce) stage.firstElementChild.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)' });
}
function openLightbox(items, i) {
    lbItems = items;
    lb.classList.toggle('single', items.length < 2);
    showShot(i);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
}
function closeLightbox() {
    if (!lb || !lb.classList.contains('open')) return;
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    $('.lightbox-stage', lb).innerHTML = '';
    if (lenis && !(caseEl && caseEl.classList.contains('open'))) lenis.start();
}
if (lb) {
    $('.lb-close', lb).addEventListener('click', closeLightbox);
    $('.lb-prev', lb).addEventListener('click', () => showShot(lbAt - 1));
    $('.lb-next', lb).addEventListener('click', () => showShot(lbAt + 1));
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
}

// Case study overlay: opened from a card, by #hash on load, and kept in sync with Back/Forward
const caseEl = $('.case'), caseScroll = $('.case-scroll');
const caseOrder = $$('template[id^="case-"]').map(t => t.id.slice(5));
let lastFocus = null;

function openCase(slug, push) {
    const tpl = document.getElementById('case-' + slug);
    if (!tpl) return;
    const next = caseOrder[(caseOrder.indexOf(slug) + 1) % caseOrder.length];
    caseScroll.replaceChildren(tpl.content.cloneNode(true));
    caseScroll.insertAdjacentHTML('beforeend',
        `<button class="case-next" data-case="${next}"><span class="eyebrow">Next case study</span><span>${document.getElementById('case-' + next).dataset.title} →</span></button>`);
    caseScroll.scrollTop = 0;
    if (!caseEl.classList.contains('open')) lastFocus = document.activeElement;
    caseEl.classList.remove('open');
    void caseEl.offsetWidth; // restart the hero animation when jumping to the next case
    caseEl.classList.add('open');
    if (lenis) lenis.stop();
    document.documentElement.style.overflow = 'hidden';
    if (push) history.pushState({ case: slug }, '', '#' + slug);
    $('.case-close').focus({ preventScroll: true });
}

function closeCase(push) {
    if (!caseEl || !caseEl.classList.contains('open')) return;
    caseEl.classList.remove('open');
    if (lenis) lenis.start();
    document.documentElement.style.overflow = '';
    if (push) history.pushState(null, '', location.pathname);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
}

if (caseEl) {
    addEventListener('popstate', () => {
        const slug = location.hash.slice(1);
        caseOrder.includes(slug) ? openCase(slug, false) : closeCase(false);
    });
    document.addEventListener('site:ready', () => {
        const slug = location.hash.slice(1);
        if (caseOrder.includes(slug)) setTimeout(() => openCase(slug, false), 500);
    });
}

document.addEventListener('click', e => {
    const opener = e.target.closest('[data-case]');
    if (opener && caseEl) return openCase(opener.dataset.case, true);
    if (e.target.closest('[data-close]')) return closeCase(true);
    const shot = e.target.closest('.cs-gallery button');
    if (shot && lb) {
        const btns = [...shot.parentElement.children];
        return openLightbox(btns.map(b => ({ yt: b.dataset.video, src: b.querySelector('img').src, alt: b.querySelector('img').alt })), btns.indexOf(shot));
    }
    const set = e.target.closest('[data-shots]');
    if (set && lb) openLightbox(set.dataset.shots.split('|').map(src => ({ src, alt: set.dataset.title })), 0);
});

addEventListener('keydown', e => {
    if (lb && lb.classList.contains('open')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showShot(lbAt - 1);
        if (e.key === 'ArrowRight') showShot(lbAt + 1);
    } else if (e.key === 'Escape') closeCase(true);
});

// Personal grid: hovering a card cycles through its shots; chips filter by discipline
$$('.pc[data-shots]').forEach(card => {
    const media = $('.pc-media', card), shots = card.dataset.shots.split('|').filter(s => !/\.mp4$/i.test(s));
    if (shots.length < 2 || reduce) return;
    let timer = null, at = 0, imgs = null;
    card.addEventListener('mouseenter', () => {
        if (!imgs) imgs = [$('img', media), ...shots.slice(1).map(src => { const im = new Image(); im.src = src; im.alt = ''; media.append(im); return im; })];
        timer = setInterval(() => {
            imgs[at].classList.remove('active');
            at = (at + 1) % imgs.length;
            imgs[at].classList.add('active');
            card.style.setProperty('--shot', (at + 1) / imgs.length);
        }, 900);
    });
    card.addEventListener('mouseleave', () => clearInterval(timer));
});
$$('.chip[data-filter]').forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter, grid = $('.pgrid');
    const apply = () => {
        $$('.chip[data-filter]').forEach(c => c.classList.toggle('active', c === chip));
        grid.classList.toggle('filtered', f !== 'all');
        $$('.pc', grid).forEach(c => { c.hidden = f !== 'all' && c.dataset.kind !== f; });
    };
    document.startViewTransition && !reduce ? document.startViewTransition(apply) : apply();
}));
