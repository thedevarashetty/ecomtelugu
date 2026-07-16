
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

  // Contact form: no backend inbox exists for general messages, so this
  // opens the visitor's email client addressed to support, prefilled with
  // their message — a real action, not a fake "message sent" claim.
  const SUPPORT_EMAIL = 'ecomtelugu@gmail.com';
  $$('.js-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const get = (name) => (form.querySelector(`[name="${name}"]`)?.value || '').trim();
      const subject = get('subject') || 'Website enquiry';
      const body = `Name: ${get('name')}\nEmail: ${get('email')}\n\n${get('message')}`;
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });

  // ================================================================
  // Enrollment + Razorpay payment flow
  // ================================================================
  const API_BASE_URL = 'https://ecomtelugu-backend.thedevarashetty.workers.dev/api/v1';
  const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

  // Mirrors the backend's Zod rules (src/utils/validation.ts) so the user
  // gets instant feedback; the backend remains the sole source of truth.
  const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

  let razorpaySdkPromise = null;
  function loadRazorpaySdk() {
    if (razorpaySdkPromise) return razorpaySdkPromise;
    razorpaySdkPromise = new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const s = document.createElement('script');
      s.src = RAZORPAY_CHECKOUT_SRC;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load the Razorpay checkout script. Check your connection and try again.'));
      document.head.appendChild(s);
    }).catch((err) => {
      razorpaySdkPromise = null; // allow a retry instead of failing forever for the rest of the page session
      throw err;
    });
    return razorpaySdkPromise;
  }

  function buildEnrollModal() {
    const overlay = document.createElement('div');
    overlay.className = 'enroll-overlay';
    overlay.innerHTML = `
      <div class="enroll-modal card" role="dialog" aria-modal="true" aria-labelledby="enrollTitle">
        <button type="button" class="enroll-close" aria-label="Close">&times;</button>
        <h3 id="enrollTitle">Enroll in E-Com Telugu Masterclass</h3>
        <p class="lead">Enter your details to continue to secure payment via Razorpay.</p>

        <div class="enroll-banner" data-role="banner"></div>

        <form class="form" data-role="form" novalidate>
          <div class="field">
            <label for="enrollName">Full Name</label>
            <input id="enrollName" name="fullName" placeholder="Your full name" autocomplete="name" required>
            <div class="enroll-field-error" data-error-for="fullName"></div>
          </div>
          <div class="field">
            <label for="enrollEmail">Email</label>
            <input id="enrollEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
            <div class="enroll-field-error" data-error-for="email"></div>
          </div>
          <div class="field">
            <label for="enrollPhone">Phone</label>
            <input id="enrollPhone" name="phone" type="tel" placeholder="10-digit mobile number" autocomplete="tel" required>
            <div class="enroll-field-error" data-error-for="phone"></div>
          </div>
          <button type="submit" class="btn btn-primary enroll-submit" data-role="submit">
            <span class="enroll-spinner"></span>
            <span data-role="submit-label">Continue to Payment</span>
          </button>
        </form>

        <div class="enroll-retry-actions" data-role="retry" style="display:none;">
          <button type="button" class="btn btn-primary enroll-submit" data-role="retry-pay">Retry Payment</button>
          <button type="button" class="enroll-link-btn" data-role="start-over">Start over with different details</button>
        </div>

        <p class="enroll-secure-note">🔒 Secure checkout powered by Razorpay</p>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  const enrollBtns = $$('.js-enroll');
  if (enrollBtns.length) {
    const overlay = buildEnrollModal();
    const form = $('[data-role="form"]', overlay);
    const banner = $('[data-role="banner"]', overlay);
    const submitBtn = $('[data-role="submit"]', overlay);
    const submitLabel = $('[data-role="submit-label"]', overlay);
    const retryWrap = $('[data-role="retry"]', overlay);
    const retryPayBtn = $('[data-role="retry-pay"]', overlay);
    const startOverBtn = $('[data-role="start-over"]', overlay);
    const closeBtn = $('.enroll-close', overlay);

    let cachedOrder = null; // { orderId, amount, currency, keyId }
    let cachedContact = null; // { fullName, email, phone }
    // Bumped whenever the modal opens/closes so an in-flight request from a
    // session the user has since abandoned (closed the modal mid-request)
    // can detect it's stale and avoid popping up a Checkout the user no
    // longer asked for.
    let requestGen = 0;

    const fieldError = (name) => $(`[data-error-for="${name}"]`, overlay);

    function clearErrors() {
      ['fullName', 'email', 'phone'].forEach(name => {
        const el = fieldError(name);
        if (el) el.textContent = '';
      });
      banner.className = 'enroll-banner';
      banner.textContent = '';
    }

    function showBanner(message, type) {
      banner.textContent = message;
      banner.className = `enroll-banner show ${type}`;
    }

    function setLoading(isLoading, label) {
      submitBtn.disabled = isLoading;
      submitBtn.classList.toggle('loading', isLoading);
      submitLabel.textContent = isLoading ? (label || 'Please wait…') : 'Continue to Payment';
    }

    function resetToForm() {
      cachedOrder = null;
      cachedContact = null;
      form.reset();
      form.style.display = '';
      retryWrap.style.display = 'none';
      clearErrors();
      setLoading(false);
    }

    function showRetryState(message) {
      form.style.display = 'none';
      retryWrap.style.display = 'grid';
      showBanner(message, 'error');
    }

    function openModal() {
      requestGen++;
      resetToForm();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      requestGen++;
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    enrollBtns.forEach(btn => btn.addEventListener('click', openModal));
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });
    startOverBtn.addEventListener('click', resetToForm);

    function validate(fullName, email, phone) {
      const errors = {};
      if (!fullName || fullName.trim().length < 2) {
        errors.fullName = 'Please enter your full name (min 2 characters).';
      } else if (fullName.trim().length > 100) {
        errors.fullName = 'Full name must be at most 100 characters.';
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }
      if (!phone || !PHONE_REGEX.test(phone.trim())) {
        errors.phone = 'Please enter a valid 10-digit Indian phone number.';
      }
      return errors;
    }

    async function createOrder(fullName, email, phone) {
      const res = await fetch(`${API_BASE_URL}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone }),
      });
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error('Unexpected response from the server. Please try again.');
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Could not start checkout. Please try again.');
      }
      return json.data; // { orderId, amount, currency, keyId }
    }

    async function verifyPayment(razorpayResponse) {
      const res = await fetch(`${API_BASE_URL}/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
        }),
      });
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error('Payment may have succeeded, but we could not confirm it automatically. Please contact support with your payment ID.');
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Payment verification failed.');
      }
      return json.data; // { orderId, status, inviteLink }
    }

    function launchCheckout() {
      const options = {
        key: cachedOrder.keyId,
        amount: cachedOrder.amount,
        currency: cachedOrder.currency,
        order_id: cachedOrder.orderId,
        name: 'E-Com Telugu',
        description: 'E-Com Telugu Masterclass',
        prefill: {
          name: cachedContact.fullName,
          email: cachedContact.email,
          contact: cachedContact.phone,
        },
        theme: { color: '#16A34A' },
        handler: async function (response) {
          setLoading(true, 'Verifying payment…');
          try {
            sessionStorage.setItem('ecomtelugu_order_id', cachedOrder.orderId);
            await verifyPayment(response);
            closeModal();
            window.location.href = 'success.html';
          } catch (err) {
            showRetryState(err.message);
          }
        },
        modal: {
          ondismiss: function () {
            showRetryState('Checkout was closed before payment completed. No amount was charged.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        showRetryState(
          'Payment failed' + (resp?.error?.description ? `: ${resp.error.description}` : '.') + ' You have not been charged.'
        );
      });
      rzp.open();
    }

    retryPayBtn.addEventListener('click', async () => {
      if (!cachedOrder) return resetToForm();
      const myGen = requestGen;
      retryPayBtn.disabled = true;
      retryPayBtn.classList.add('loading');
      try {
        await loadRazorpaySdk();
        if (myGen !== requestGen) return; // modal was closed/reopened while loading
        launchCheckout();
      } catch (err) {
        if (myGen !== requestGen) return;
        showRetryState(err.message);
      } finally {
        retryPayBtn.disabled = false;
        retryPayBtn.classList.remove('loading');
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const fullName = $('#enrollName', overlay).value;
      const email = $('#enrollEmail', overlay).value;
      const phone = $('#enrollPhone', overlay).value;

      const errors = validate(fullName, email, phone);
      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([name, msg]) => {
          const el = fieldError(name);
          if (el) el.textContent = msg;
        });
        return;
      }

      const myGen = requestGen;
      setLoading(true, 'Starting checkout…');
      try {
        await loadRazorpaySdk();
        const order = await createOrder(fullName.trim(), email.trim().toLowerCase(), phone.trim());
        if (myGen !== requestGen) return; // user closed/reopened the modal while this was in flight
        cachedOrder = order;
        cachedContact = { fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() };
        setLoading(false);
        launchCheckout();
      } catch (err) {
        if (myGen !== requestGen) return;
        setLoading(false);
        showBanner(err.message, 'error');
      }
    });
  }
})();


window.addEventListener("scroll", () => {

    const nav = document.querySelector(".nav-wrap");

    if(window.scrollY > 50){

        nav.classList.add("scrolled");

    }else{

        nav.classList.remove("scrolled");

    }

});
