/* ============================================================
   CoolBreeze Heating & Air — Landing Page Interactions
============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     1. NAV — scroll state
  ------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------
     2. NAV — mobile menu
  ------------------------------------------------------------ */
  const toggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileMenu.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  }

  toggle.addEventListener('click', () => {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });

  /* ------------------------------------------------------------
     3. REVEAL ON SCROLL
  ------------------------------------------------------------ */
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.08 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------
     4. SERVICE CARD → PRESELECT SERVICE IN FORM
  ------------------------------------------------------------ */
  const serviceSelect = document.getElementById('service');

  document.querySelectorAll('[data-service]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-service');
      if (!serviceSelect || !value) return;

      // Match the option text exactly
      const option = Array.from(serviceSelect.options).find(
        (o) => o.value === value
      );
      if (option) {
        serviceSelect.value = option.value;
        serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      document
        .getElementById('request-service')
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ------------------------------------------------------------
     5. "CHECK MY ZIP CODE" → focus the ZIP input
  ------------------------------------------------------------ */
  const zipCta = document.getElementById('zip-cta');
  const zipInput = document.getElementById('zip_code');

  if (zipCta && zipInput) {
    zipCta.addEventListener('click', () => {
      // Let the anchor's smooth scroll start, then focus
      window.setTimeout(() => zipInput.focus({ preventScroll: true }), 650);
    });
  }

  /* ------------------------------------------------------------
     6. FORM — input formatting
  ------------------------------------------------------------ */
  const phoneInput = document.getElementById('phone');

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      let formatted = digits;

      if (digits.length >= 7) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length >= 4) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length >= 1) {
        formatted = `(${digits}`;
      }

      e.target.value = formatted;
    });
  }

  if (zipInput) {
    zipInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
    });
  }

  /* ------------------------------------------------------------
     7. FORM — validation + submission
  ------------------------------------------------------------ */
  const form = document.getElementById('lead-form');
  const formError = document.getElementById('form-error');
  const successPanel = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  const US_PHONE = /^(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const validators = {
    full_name: (v) =>
      v.trim().length < 2
        ? 'Please enter your full name (at least 2 characters).'
        : '',
    phone: (v) =>
      US_PHONE.test(v.trim())
        ? ''
        : 'Enter a valid US phone number, e.g. (214) 555-0199.',
    email: (v) =>
      EMAIL.test(v.trim()) ? '' : 'Enter a valid email address.',
    service: (v) => (v ? '' : 'Please select the service you need.'),
    description: (v) =>
      v.trim().length < 10
        ? 'Please describe the issue in at least 10 characters.'
        : '',
    zip_code: (v) =>
      /^\d{5}$/.test(v.trim()) ? '' : 'Enter a valid 5-digit ZIP code.',
  };

  function getFieldEl(name) {
    return form.querySelector(`[name="${name}"]`);
  }

  function setFieldError(name, message) {
    const el = getFieldEl(name);
    const errorEl = form.querySelector(`[data-error-for="${name}"]`);
    const wrapper = el ? el.closest('.field') : null;

    if (errorEl) errorEl.textContent = message || '';
    if (wrapper) wrapper.classList.toggle('has-error', Boolean(message));
    if (el) {
      if (message) {
        el.setAttribute('aria-invalid', 'true');
      } else {
        el.removeAttribute('aria-invalid');
      }
    }
  }

  function validateField(name) {
    const el = getFieldEl(name);
    if (!el) return true;

    const value = el.value;
    const message = validators[name] ? validators[name](value) : '';
    setFieldError(name, message);
    return !message;
  }

  function validateAll() {
    let firstInvalid = null;
    let valid = true;

    Object.keys(validators).forEach((name) => {
      const ok = validateField(name);
      if (!ok) {
        valid = false;
        if (!firstInvalid) firstInvalid = getFieldEl(name);
      }
    });

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
  }

  // Live validation on blur
  Object.keys(validators).forEach((name) => {
    const el = getFieldEl(name);
    if (!el) return;

    el.addEventListener('blur', () => {
      // Only show an error if the user has typed something (or the field is empty on submit)
      if (el.value.trim() !== '') validateField(name);
    });

    el.addEventListener('input', () => {
      // Clear the error as soon as the field becomes valid
      if (el.closest('.field')?.classList.contains('has-error')) {
        validateField(name);
      }
    });

    if (el.tagName === 'SELECT') {
      el.addEventListener('change', () => validateField(name));
    }
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (submitBtn.classList.contains('is-loading')) return;

    formError.hidden = true;
    formError.textContent = '';

    if (!validateAll()) {
      formError.textContent =
        'Please review the highlighted fields and try again.';
      formError.hidden = false;
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    try {
      const formData = Object.fromEntries(new FormData(form));
      formData.sms_consent = Boolean(form.querySelector('#sms_consent')?.checked);

      const response = await fetch('http://127.0.0.1:8000/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        // Response wasn't JSON
      }

      // Check if response failed or returned an error payload
      if (!response.ok || (data && (data.error || (data.detail && response.status >= 400)))) {
        let errorMsg = 'An error occurred while saving your request.';

        if (data) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (Array.isArray(data.detail)) {
            // FastAPI / Pydantic validation error array
            errorMsg = data.detail
              .map((item) => `${item.loc?.slice(-1)[0] || 'Field'}: ${item.msg}`)
              .join('; ');
          } else if (typeof data.error === 'string') {
            errorMsg = data.error;
          } else if (data.message && !response.ok) {
            errorMsg = data.message;
          }
        } else {
          errorMsg = `Server error (${response.status} ${response.statusText || 'Failed to submit'})`;
        }

        throw new Error(errorMsg);
      }

      // Successful lead capture
      form.hidden = true;
      successPanel.hidden = false;
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.error('Lead submission error:', err);
      formError.textContent = err.message || "We couldn't submit your request right now. Please try again.";
      formError.hidden = false;
      formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });

  /* ------------------------------------------------------------
     8. "BACK TO HOME" — reset the form
  ------------------------------------------------------------ */
  const backHome = document.getElementById('back-home');

  if (backHome) {
    backHome.addEventListener('click', () => {
      form.reset();
      Object.keys(validators).forEach((name) => setFieldError(name, ''));
      successPanel.hidden = true;
      form.hidden = false;
    });
  }

  /* ------------------------------------------------------------
     9. FOOTER — current year
  ------------------------------------------------------------ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();