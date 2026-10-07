/**
 * Renders every piece of page content from the profile data.
 *
 * Keeping this in one module means the HTML is a skeleton and the copy has a
 * single home — editing the profile updates the page, the 3D scene labels and
 * the metadata together.
 */

import { countUp } from './reveal.js';

/** Populate hero, contact and footer text. */
export function renderStatic(profile, { animate }) {
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const link = (id, href, text) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.href = href;
    if (text) element.textContent = text;
  };

  set('hero-name', profile.name);
  set('hero-role', profile.role);
  set('hero-tagline', profile.tagline);
  set('hero-intro', profile.intro);
  set('hero-location', profile.location);
  set('year', String(new Date().getFullYear()));
  set('contact-edu',
    `${profile.education.degree} · ${profile.education.institution} · ${profile.education.period}`);

  link('hero-github', profile.links.github);
  link('hero-linkedin', profile.links.linkedin);
  link('contact-github', profile.links.github);
  link('contact-linkedin', profile.links.linkedin);
  link('contact-resume', profile.links.resume);
  link('resume-link', profile.links.resume);
  link('contact-email', `mailto:${profile.email}`, profile.email);

  renderMetrics(profile.metrics, animate);
}

function renderMetrics(metrics, animate) {
  const grid = document.getElementById('metrics-grid');
  if (!grid) return;

  metrics.forEach((metric) => {
    const item = document.createElement('li');
    item.className = 'metric';
    item.innerHTML = `
      <span class="metric__value"></span>
      <span class="metric__label"></span>
      <span class="metric__detail"></span>`;
    item.querySelector('.metric__label').textContent = metric.label;
    item.querySelector('.metric__detail').textContent = metric.detail;
    grid.append(item);

    countUp(item.querySelector('.metric__value'), metric.value, {
      suffix: metric.suffix,
      decimals: metric.decimals ?? 0,
      animate,
    });
  });
}

/**
 * Render the career timeline as an accordion.
 *
 * The first role opens by default so the section is never an empty list of
 * closed headers, which reads as a dead end.
 */
export function renderTimeline(timeline) {
  const container = document.getElementById('timeline');
  if (!container) return;

  timeline.forEach((role, index) => {
    const article = document.createElement('article');
    article.className = 'role';
    article.style.setProperty('--role-accent', role.accent);
    article.dataset.reveal = '';
    article.dataset.revealDelay = String(index * 90);
    if (index === 0) article.classList.add('is-open');

    const panelId = `role-panel-${role.id}`;
    article.innerHTML = `
      <button class="role__head" type="button"
              aria-expanded="${index === 0}" aria-controls="${panelId}">
        <span>
          <span class="role__company">
            <span class="role__node" aria-hidden="true"></span>
            <span class="js-company"></span>
          </span>
          <span class="role__role js-role"></span>
        </span>
        <span class="role__meta">
          <span class="js-period"></span><br><span class="js-location"></span>
          <span class="role__chev" aria-hidden="true">▾</span>
        </span>
      </button>
      <div class="role__body" id="${panelId}">
        <div class="role__bodyInner">
          <div class="role__content">
            <p class="role__summary js-summary"></p>
            <ul class="role__list js-highlights"></ul>
            <div class="chips js-stack"></div>
          </div>
        </div>
      </div>`;

    article.querySelector('.js-company').textContent = role.company;
    article.querySelector('.js-role').textContent = role.role;
    article.querySelector('.js-period').textContent = role.period;
    article.querySelector('.js-location').textContent = role.location;
    article.querySelector('.js-summary').textContent = role.summary;

    const list = article.querySelector('.js-highlights');
    role.highlights.forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    });

    const stack = article.querySelector('.js-stack');
    role.stack.forEach((tech) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = tech;
      stack.append(chip);
    });

    const head = article.querySelector('.role__head');
    head.addEventListener('click', () => {
      const open = article.classList.toggle('is-open');
      head.setAttribute('aria-expanded', String(open));
    });

    container.append(article);
  });
}

/** Render the capability groups. */
export function renderSkills(skills) {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;

  skills.forEach((group, index) => {
    const card = document.createElement('div');
    card.className = 'skillgroup';
    card.dataset.reveal = '';
    card.dataset.revealDelay = String(index * 70);

    const heading = document.createElement('h3');
    heading.textContent = group.group;

    const list = document.createElement('ul');
    group.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    });

    card.append(heading, list);
    grid.append(card);
  });
}
