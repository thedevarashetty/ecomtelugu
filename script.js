
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Mobile menu
  const hamburger = $('.hamburger');
  const mobilePanel = $('.mobile-panel');
  if (hamburger && mobilePanel) {
    hamburger.addEventListener('click', () => {
      const open = mobilePanel.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(open));
    });
    $$('.mobile-panel a, .mobile-panel .btn').forEach(el => {
      el.addEventListener('click', () => mobilePanel.classList.remove('open'));
    });
  }

  // Reveal on scroll
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in-view'));
  }

  // Counters
  const counters = $$('.counter strong[data-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    const animateCounter = (el) => {
      const target = el.dataset.target || '0';
      const isPlus = target.includes('+');
      const isText = /lifetime|private|access/i.test(target);
      if (isText) {
        el.textContent = target;
        return;
      }
      const numeric = parseInt(String(target).replace(/[^\d]/g, ''), 10) || 0;
      const suffix = String(target).replace(/[\d,]/g, '');
      const duration = 1400;
      const start = performance.now();
      const startValue = 0;
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(startValue + (numeric - startValue) * eased);
        el.textContent = value.toLocaleString('en-IN') + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const counterIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterIO.observe(c));
  }

  // Countdown to midnight local time
  const countdown = $('.countdown');
  if (countdown) {
    const h = $('.countdown [data-unit="h"]');
    const m = $('.countdown [data-unit="m"]');
    const s = $('.countdown [data-unit="s"]');

    const pad = (n) => String(n).padStart(2, '0');
    const update = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const diff = Math.max(0, next - now);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (h) h.textContent = pad(hours);
      if (m) m.textContent = pad(minutes);
      if (s) s.textContent = pad(seconds);
    };
    update();
    setInterval(update, 1000);
  }

  // Accordions
  $$('.acc-item').forEach(item => {
    const btn = $('.acc-btn', item);
    const panel = $('.acc-panel', item);
    if (!btn || !panel) return;
    const setOpen = (open) => {
      item.classList.toggle('open', open);
      panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', () => setOpen(!item.classList.contains('open')));
    setOpen(item.classList.contains('open'));
  });

  // Smooth anchor enhancement
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Sticky CTA pulse on scroll
  const stickyBtn = $('.sticky-cta');
  if (stickyBtn) {
    const onScroll = () => {
      stickyBtn.classList.toggle('float', window.scrollY > 200);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Fake form feedback for demo
  $$('.js-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.dataset.note || 'Thanks — your message has been prepared.';
      alert(note);
      form.reset();
    });
  });

  // Payment hook placeholders
  $$('.js-enroll').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.getAttribute('data-plan') || 'ecom-telugu-masterclass';
      const amount = btn.getAttribute('data-amount') || '19900';
      console.log('[Razorpay Hook]', { plan, amount, keyId: window.RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID' });
      alert('Razorpay checkout hook is ready. Connect your key ID and order creation endpoint.');
    });
  });
})();
