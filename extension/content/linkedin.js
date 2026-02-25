(() => {
  const PROCESSED_ATTR = 'data-joblens-processed';
  let scoringInProgress = false;

  // --- Job Listing Detection & Scoring ---

  function extractJobCards() {
    const cards = [];
    // LinkedIn job search result cards
    const jobCards = document.querySelectorAll(
      `.jobs-search-results__list-item:not([${PROCESSED_ATTR}]),
       .job-card-container:not([${PROCESSED_ATTR}]),
       .jobs-search-results-list__list-item:not([${PROCESSED_ATTR}])`
    );

    jobCards.forEach(card => {
      try {
        const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link, a.job-card-list__title--link');
        const companyEl = card.querySelector('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle');
        const locationEl = card.querySelector('.job-card-container__metadata-item, .artdeco-entity-lockup__caption');
        const linkEl = card.querySelector('a[href*="/jobs/view/"]');

        const title = titleEl?.textContent?.trim();
        const company = companyEl?.textContent?.trim();
        const location = locationEl?.textContent?.trim();
        const url = linkEl?.href;

        if (title) {
          cards.push({
            element: card,
            job: { title, company, location, url, source: 'linkedin' }
          });
        }
      } catch (e) {
        // skip malformed cards
      }
    });

    return cards;
  }

  async function scoreAndOverlay() {
    if (scoringInProgress) return;

    const cards = extractJobCards();
    if (cards.length === 0) return;

    scoringInProgress = true;

    // Mark as processed
    cards.forEach(c => c.element.setAttribute(PROCESSED_ATTR, 'true'));

    try {
      const jobs = cards.map(c => c.job);
      const response = await chrome.runtime.sendMessage({ type: 'SCORE_JOBS', jobs });

      if (response?.scores) {
        response.scores.forEach((score, i) => {
          if (i < cards.length) {
            injectBadge(cards[i].element, score);
          }
        });
      }
    } catch (err) {
      console.error('JobLens: Scoring failed', err);
      // Remove processed attr so they can be retried
      cards.forEach(c => c.element.removeAttribute(PROCESSED_ATTR));
    }

    scoringInProgress = false;
  }

  function injectBadge(cardElement, scoreData) {
    const { score, explanation, factors } = scoreData;
    const level = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';

    const badge = document.createElement('div');
    badge.className = `joblens-badge joblens-badge--${level}`;
    badge.innerHTML = `
      <svg class="joblens-badge__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      ${score}%
      <div class="joblens-tooltip">
        <div class="joblens-tooltip__title">JobLens Match Analysis</div>
        <div>${escapeHtml(explanation || 'Analyzing match...')}</div>
        ${factors ? renderFactors(factors) : ''}
      </div>
    `;

    // Insert badge near the job title
    const titleEl = cardElement.querySelector('.job-card-list__title, .job-card-container__link, a.job-card-list__title--link');
    if (titleEl) {
      titleEl.parentElement.style.display = 'flex';
      titleEl.parentElement.style.alignItems = 'center';
      titleEl.parentElement.style.flexWrap = 'wrap';
      titleEl.after(badge);
    } else {
      cardElement.prepend(badge);
    }
  }

  function renderFactors(factors) {
    const labels = {
      skillMatch: 'Skills',
      experienceMatch: 'Experience',
      ambitionAlign: 'Ambition',
      preferenceMatch: 'Preferences',
      growthPotential: 'Growth',
    };

    let html = '<div class="joblens-factors">';
    for (const [key, label] of Object.entries(labels)) {
      const value = factors[key] || 0;
      html += `
        <div class="joblens-factor">
          <span class="joblens-factor__label">${label}</span>
          <div class="joblens-factor__bar">
            <div class="joblens-factor__fill" style="width: ${value}%"></div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  // --- LinkedIn Profile Import ---

  function isProfilePage() {
    return window.location.pathname.match(/^\/in\/[^/]+\/?$/);
  }

  function injectImportButton() {
    if (document.querySelector('.joblens-import-btn')) return;
    if (!isProfilePage()) return;

    const btn = document.createElement('button');
    btn.className = 'joblens-import-btn';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      Import to JobLens
    `;

    btn.addEventListener('click', async () => {
      btn.classList.add('joblens-import-btn--loading');
      btn.innerHTML = '<div class="joblens-spinner"></div> Importing...';

      try {
        const profileData = extractProfileData();
        const result = await chrome.runtime.sendMessage({ type: 'IMPORT_PROFILE', profileData });
        btn.innerHTML = '&#10003; Imported!';
        btn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        setTimeout(() => btn.remove(), 3000);
      } catch (err) {
        btn.classList.remove('joblens-import-btn--loading');
        btn.innerHTML = 'Import Failed — Retry';
        btn.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
      }
    });

    document.body.appendChild(btn);
  }

  function extractProfileData() {
    const name = document.querySelector('.text-heading-xlarge, h1.top-card-layout__title')?.textContent?.trim() || '';
    const headline = document.querySelector('.text-body-medium[data-generated-suggestion-target], .top-card-layout__headline')?.textContent?.trim() || '';

    // Experience
    const experience = [];
    document.querySelectorAll('#experience ~ .pvs-list__outer-container li.artdeco-list__item, section.experience-section li').forEach(item => {
      const title = item.querySelector('.t-bold span, .experience-item__title')?.textContent?.trim();
      const company = item.querySelector('.t-normal span, .experience-item__subtitle')?.textContent?.trim();
      const duration = item.querySelector('.t-black--light span, .experience-item__duration')?.textContent?.trim();
      const description = item.querySelector('.pvs-list__outer-container .t-normal, .experience-item__description')?.textContent?.trim();
      if (title) experience.push({ title, company, duration, description });
    });

    // Skills
    const skills = [];
    document.querySelectorAll('#skills ~ .pvs-list__outer-container span.t-bold span, .skill-card-list__skill-name').forEach(el => {
      const skill = el.textContent?.trim();
      if (skill) skills.push(skill);
    });

    // Education
    const education = [];
    document.querySelectorAll('#education ~ .pvs-list__outer-container li.artdeco-list__item').forEach(item => {
      const school = item.querySelector('.t-bold span')?.textContent?.trim();
      const degree = item.querySelector('.t-normal span')?.textContent?.trim();
      if (school) education.push({ school, degree });
    });

    return {
      name,
      headline,
      experience,
      skills,
      education,
      linkedin_url: window.location.href,
    };
  }

  // --- Observer for dynamic loading ---

  const observer = new MutationObserver(() => {
    if (window.location.pathname.includes('/jobs/')) {
      scoreAndOverlay();
    }
    if (isProfilePage()) {
      injectImportButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial run
  if (window.location.pathname.includes('/jobs/')) {
    setTimeout(scoreAndOverlay, 1500);
  }
  if (isProfilePage()) {
    setTimeout(injectImportButton, 1000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
