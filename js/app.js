const BASE_PATH = window.location.hostname.includes('github.io') ? '/beta-uat' : '';

const ROUTES = {
  '/': {
    content: 'home.md',
    label: 'Overview'
  },
  '/bookmarklet': {
    content: 'bookmarklet.md',
    label: 'Bookmarklet'
  },
  '/campaign-counter': {
    content: 'campaign-counter.md',
    label: 'Campaign Counter'
  },
  '/config-edm': {
    content: 'config-edm.md',
    label: 'Config eDM'
  },
  '/database-checker': {
    content: 'database-checker.md',
    label: 'Database Checker'
  },
  '/database-generator': {
    content: 'database-generator.md',
    label: 'Database Generator'
  },
  '/layout-checker': {
    content: 'layout-checker.md',
    label: 'Layout Checker'
  },
  '/wfh-tracker': {
    content: 'wfh-tracker.md',
    label: 'WFH Tracker'
  }
};

const LEGACY_PATHS = {
  '/index.html': '/',
  '/bookmarklet.html': '/bookmarklet',
  '/campaign-counter.html': '/campaign-counter',
  '/config.html': '/config-edm',
  '/database-checker.html': '/database-checker',
  '/database-generator.html': '/database-generator',
  '/layout-checker.html': '/layout-checker',
  '/wfh-tracker.html': '/wfh-tracker'
};

const viewport = document.getElementById('content-viewport');
const sidebar = document.getElementById('app-sidebar');
const backdrop = document.getElementById('sidebar-backdrop');
const menuToggle = document.getElementById('menu-toggle');

const TOOL_META = {
  '/bookmarklet': {
    icon: 'fa-solid fa-bookmark',
    label: 'Bookmarklet'
  },
  '/campaign-counter': {
    icon: 'fa-solid fa-chart-line',
    label: 'Campaign Counter'
  },
  '/config-edm': {
    icon: 'fa-solid fa-sliders',
    label: 'Config eDM'
  },
  '/database-checker': {
    icon: 'fa-solid fa-circle-check',
    label: 'Database Checker'
  },
  '/database-generator': {
    icon: 'fa-solid fa-database',
    label: 'Database Generator'
  },
  '/layout-checker': {
    icon: 'fa-solid fa-ruler-combined',
    label: 'Layout Checker'
  },
  '/wfh-tracker': {
    icon: 'fa-solid fa-calendar-days',
    label: 'WFH Tracker'
  }
};

function getVersion() {
  return typeof VERSION_CONFIG !== 'undefined' ? VERSION_CONFIG.version : '6.0.1';
}

function withBasePath(path) {
  const absolutePath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${absolutePath}` || '/';
}

function stripBasePath(pathname) {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || '/';
  }

  return pathname || '/';
}

function normalizePath(pathname) {
  if (LEGACY_PATHS[pathname]) {
    return LEGACY_PATHS[pathname];
  }

  if (pathname.length > 1) {
    return pathname.replace(/\/+$/, '');
  }

  return pathname;
}

function getCurrentPath() {
  let path = window.location.pathname;
  if (path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length);
  if (!path || path === '/') return '/';
  return normalizePath(path);
}

function configureRouteLinks() {
  document.querySelectorAll('a[data-route]').forEach((link) => {
    const currentHref = link.getAttribute('href') || '/';
    const routePath = currentHref === './'
      ? '/'
      : normalizePath(stripBasePath(new URL(currentHref, window.location.href).pathname));

    link.dataset.routePath = routePath;
    link.setAttribute('href', withBasePath(routePath));
  });
}

function parseFrontmatter(source) {
  const result = { attributes: {}, body: source.trim() };

  if (!source.startsWith('---')) {
    return result;
  }

  const closingMarker = source.indexOf('\n---', 3);
  if (closingMarker === -1) {
    return result;
  }

  const frontmatter = source.slice(3, closingMarker).trim();
  result.body = source.slice(closingMarker + 4).trim();

  frontmatter.split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(':');
    if (separator === -1) return;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    result.attributes[key] = value;
  });

  return result;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function slugifyHeading(value) {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderMarkdown(source) {
  if (!source) return '';

  const lines = source.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;
  let sectionOpen = false;
  let subsectionOpen = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  lines.forEach((line) => {
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);

    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const headingHtml = inlineMarkdown(heading[2]);
      const headingId = slugifyHeading(heading[2]);

      if (level === 2) {
        if (subsectionOpen) {
          html.push('</div>');
          subsectionOpen = false;
        }
        if (sectionOpen) html.push('</section>');
        html.push(`<section class="markdown-section" data-section="${headingId}">`);
        sectionOpen = true;
      } else if (level === 3) {
        if (subsectionOpen) html.push('</div>');
        html.push('<div class="markdown-subsection">');
        subsectionOpen = true;
      }

      html.push(`<h${level} id="${headingId}">${headingHtml}</h${level}>`);
      return;
    }

    if (unordered || ordered) {
      flushParagraph();
      const nextListType = unordered ? 'ul' : 'ol';
      if (listType !== nextListType) {
        closeList();
        listType = nextListType;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      return;
    }

    paragraph.push(line.trim());
  });

  flushParagraph();
  closeList();
  if (subsectionOpen) html.push('</div>');
  if (sectionOpen) html.push('</section>');
  return html.join('');
}

function configureMarkdownLinks(container) {
  container.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      link.target = '_blank';
      link.rel = 'noreferrer';
      return;
    }

    const routePath = normalizePath(stripBasePath(url.pathname));
    if (!ROUTES[routePath]) return;

    link.dataset.route = '';
    link.dataset.routePath = routePath;
    link.setAttribute('href', withBasePath(routePath));
  });
}

function enhanceHomeDashboard(container) {
  const quickAccess = container.querySelector('[data-section="quick-access"]');
  quickAccess?.querySelectorAll('li').forEach((item) => {
    const link = item.querySelector('a[data-route-path]');
    const meta = link ? TOOL_META[link.dataset.routePath] : null;
    if (!link || !meta) return;

    const description = Array.from(item.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' ')
      .trim()
      .replace(/^-\s*/, '');

    Array.from(item.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .forEach((node) => node.remove());

    item.classList.add('quick-access-item');
    link.insertAdjacentHTML(
      'afterbegin',
      `<span class="quick-access-icon"><i class="${meta.icon}" aria-hidden="true"></i></span>`
    );
    link.insertAdjacentHTML(
      'beforeend',
      '<i class="fa-solid fa-arrow-right quick-access-arrow" aria-hidden="true"></i>'
    );
    if (description) {
      item.insertAdjacentHTML(
        'beforeend',
        `<span class="quick-access-description">${escapeHtml(description)}</span>`
      );
    }
  });

  const sitemap = container.querySelector('[data-section="tool-sitemap"]');
  sitemap?.querySelectorAll('.markdown-subsection').forEach((section) => {
    const heading = section.querySelector('h3');
    const count = section.querySelectorAll('li').length;
    if (!heading) return;
    heading.insertAdjacentHTML('beforeend', `<span class="section-count">${count}</span>`);
  });

  const updates = container.querySelector('[data-section="recent-updates"]');
  if (updates) {
    const updateItems = Array.from(updates.querySelectorAll('li'));
    updateItems.slice(10).forEach((item) => item.remove());
    updateItems[0]?.classList.add('latest-update');
  }

  const usefulLinks = container.querySelector('[data-section="useful-links"]');
  usefulLinks?.querySelectorAll('li').forEach((item) => {
    const link = item.querySelector('a');
    if (!link) return;

    let icon = 'fa-solid fa-sitemap';
    if (link.href.includes('/issues')) icon = 'fa-solid fa-circle-exclamation';
    if (link.href.includes('github.com') && !link.href.includes('/issues')) icon = 'fa-brands fa-github';
    link.insertAdjacentHTML('afterbegin', `<i class="${icon}" aria-hidden="true"></i>`);
  });

  const systemInfo = container.querySelector('[data-section="system-info"]');
  if (systemInfo) {
    const list = systemInfo.querySelector('ul');
    list?.insertAdjacentHTML(
      'afterbegin',
      `<li><strong>Version:</strong> <code>${escapeHtml(getVersion())}</code></li>`
    );
  }
}

function setActiveLink(path) {
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    const active = link.dataset.routePath === path;
    link.classList.toggle('active', active);
    if (active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function closeSidebar() {
  sidebar.classList.remove('open');
  backdrop.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
}

function styleEmbeddedTool(frame) {
  try {
    const frameDocument = frame.contentDocument;
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) return;

    const style = frameDocument.createElement('style');
    style.textContent = `
      html, body {
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        overflow-x: hidden !important;
      }
      body { padding-top: 0 !important; min-height: 100% !important; }
      body > .header, body > .footer { display: none !important; }
      main#main-content {
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
      }
      main#main-content > .sidebar,
      main#main-content > .main-content,
      .content-area,
      .panel,
      .panel-body {
        min-height: 0 !important;
      }
    `;
    frameDocument.head.appendChild(style);
    frameWindow.history.scrollRestoration = 'manual';
    frameWindow.scrollTo(0, 0);
    frameWindow.requestAnimationFrame(() => frameWindow.scrollTo(0, 0));

    frameDocument.querySelectorAll('a[href="index.html"], a[href="/"], a.nav-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (href === 'index.html' || href === '/') {
          event.preventDefault();
          navigate('/');
        }
      });
    });
  } catch (error) {
    console.warn('Unable to apply embedded tool layout styles.', error);
  }
}

function renderPage(route, markdown) {
  const { attributes, body } = parseFrontmatter(markdown);
  const title = attributes.title || route.label;
  const description = attributes.description || '';
  const icon = attributes.icon || 'fa-solid fa-wand-magic-sparkles';
  const category = attributes.category || 'eDM Helper';
  const tool = attributes.tool ? withBasePath(attributes.tool) : '';
  const isHome = route.content === 'home.md';

  document.title = `${title} | eDM Helper`;

  const intro = `
    <header class="content-intro">
      <div class="content-intro-topline">
        <p class="content-eyebrow">${escapeHtml(category)}</p>
        ${isHome ? `
          <div class="home-meta" aria-label="Application information">
            <span class="version-badge">v${escapeHtml(getVersion())}</span>
            <span class="status-badge"><span class="status-dot"></span>All systems operational</span>
            <span class="tool-count-badge">${Object.keys(TOOL_META).length} tools</span>
          </div>
        ` : ''}
      </div>
      <h1 class="content-title">
        <i class="${escapeHtml(icon)}" aria-hidden="true"></i>
        <span>${escapeHtml(title)}</span>
      </h1>
      ${description ? `<p class="content-description">${escapeHtml(description)}</p>` : ''}
    </header>
  `;

  const markdownContent = body
    ? `<article class="markdown-content">${renderMarkdown(body)}</article>`
    : '';

  const toolFrame = tool
    ? `
      <div class="tool-frame-wrap">
        <iframe
          class="tool-frame"
          src="${escapeHtml(tool)}"
          title="${escapeHtml(title)} tool"
          loading="eager"
        ></iframe>
      </div>
    `
    : '';

  const pageClass = tool ? 'content-page content-page--tool' : 'content-page';
  viewport.innerHTML = `<div class="${pageClass}">${intro}${markdownContent}${toolFrame}</div>`;

  const markdownContainer = viewport.querySelector('.markdown-content');
  if (markdownContainer) {
    configureMarkdownLinks(markdownContainer);
    if (isHome) {
      markdownContainer.classList.add('home-dashboard');
      enhanceHomeDashboard(markdownContainer);
    }
  }

  const frame = viewport.querySelector('.tool-frame');
  if (frame) {
    frame.addEventListener('load', () => styleEmbeddedTool(frame));
  }
}

function renderNotFound() {
  document.title = 'Page Not Found | eDM Helper';
  viewport.innerHTML = `
    <section class="content-error">
      <p class="content-eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The requested eDM Helper tool does not exist.</p>
      <a href="${withBasePath('/')}" data-route data-route-path="/">Back to overview</a>
    </section>
  `;
}

function renderLocalServerWarning() {
  document.title = 'Local Server Required | eDM Helper';
  viewport.innerHTML = `
    <section class="content-error">
      <p class="content-eyebrow">Local file</p>
      <h1>Unable to load this tool</h1>
      <p>Please run eDM Helper through its local server instead of opening the HTML file directly.</p>
    </section>
  `;
}

function renderContentError(error) {
  document.title = 'Content Error | eDM Helper';
  viewport.innerHTML = `
    <section class="content-error">
      <p class="content-eyebrow">Content error</p>
      <h1>Unable to load this tool</h1>
      <p>The tool content could not be loaded. Please refresh the page and try again.</p>
    </section>
  `;
  console.error(error);
}

async function loadRoute(path) {
  const route = ROUTES[path];
  setActiveLink(path);
  closeSidebar();

  if (window.location.protocol === 'file:') {
    renderLocalServerWarning();
    return;
  }

  if (!route) {
    renderNotFound();
    return;
  }

  viewport.innerHTML = `
    <div class="content-loading" role="status">
      <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
      <span>Loading ${escapeHtml(route.label)}...</span>
    </div>
  `;

  try {
    const contentUrl = `${BASE_PATH}/content/${route.content}`;
    const response = await fetch(contentUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load ${contentUrl}: ${response.status}`);
    }
    renderPage(route, await response.text());
    viewport.scrollTop = 0;
    viewport.focus({ preventScroll: true });
  } catch (error) {
    renderContentError(error);
  }
}

function navigate(path, options = {}) {
  const normalized = normalizePath(path);
  const browserPath = withBasePath(normalized);
  if (!options.replace && browserPath !== window.location.pathname) {
    window.history.pushState({}, '', browserPath);
  } else if (options.replace || browserPath !== window.location.pathname) {
    window.history.replaceState({}, '', browserPath);
  }
  loadRoute(normalized);
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-route]');
  if (!link || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  event.preventDefault();
  navigate(normalizePath(stripBasePath(url.pathname)));
});

window.addEventListener('popstate', () => {
  loadRoute(getCurrentPath());
});

menuToggle.addEventListener('click', () => {
  const open = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  backdrop.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
});

backdrop.addEventListener('click', closeSidebar);

document.getElementById('footer-year').textContent = new Date().getFullYear();

configureRouteLinks();

const initialPath = getCurrentPath();
const initialBrowserPath = withBasePath(initialPath);
if (initialBrowserPath !== window.location.pathname) {
  window.history.replaceState({}, '', initialBrowserPath);
}
loadRoute(initialPath);
