(() => {
  const PROCESSED_ATTR = 'data-joblens-processed';
  let scoringInProgress = false;

  function extractJobCards() {
    const cards = [];
    const jobCards = document.querySelectorAll(
      `.job_seen_beacon:not([${PROCESSED_ATTR}]),
       .jobsearch-ResultsList .result:not([${PROCESSED_ATTR}]),
       .tapItem:not([${PROCESSED_ATTR}]),
       [data-jk]:not([${PROCESSED_ATTR}])`
    );

    jobCards.forEach(card => {
      try {
        const titleEl = card.querySelector('.jobTitle a, .jcs-JobTitle a, h2.jobTitle span');
        const companyEl = card.querySelector('.companyName, [data-testid="company-name"], .company');
        const locationEl = card.querySelector('.companyLocation, [data-testid="text-location"], .location');
        const salaryEl = card.querySelector('.salary-snippet-container, .metadata.salary-snippet-container, .estimated-salary');
        const snippetEl = card.querySelector('.job-snippet, .underShelfFooter, td.snip');
        const linkEl = card.querySelector('a[href*="/viewjob"], a[data-jk], .jobTitle a');

        const title = titleEl?.textContent?.trim();
        const company = companyEl?.textContent?.trim();
        const location = locationEl?.textContent?.trim();
        const salary = salaryEl?.textContent?.trim();
        const snippet = snippetEl?.textContent?.trim();
        const url = linkEl?.href;

        if (title) {
          cards.push({
            element: card,
            job: { title, company, location, salary, snippet, url, source: 'indeed' }
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
      console.error('JobLens: Indeed scoring failed', err);
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

    // Insert near title
    const titleEl = cardElement.querySelector('.jobTitle, .jcs-JobTitle, h2.jobTitle');
    if (titleEl) {
      titleEl.style.display = 'flex';
      titleEl.style.alignItems = 'center';
      titleEl.style.flexWrap = 'wrap';
      titleEl.appendChild(badge);
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

  // Observer for dynamic page updates
  const observer = new MutationObserver(() => {
    scoreAndOverlay();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial run with delay for page load
  setTimeout(scoreAndOverlay, 1500);

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
