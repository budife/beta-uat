const ROUTES = {
  '/': {
    content: '/content/home.md',
    label: 'Overview'
  },
  '/bookmarklet': {
    content: '/content/bookmarklet.md',
    label: 'Bookmarklet'
  },
  '/campaign-counter': {
    content: '/content/campaign-counter.md',
    label: 'Campaign Counter'
  },
  '/config-edm': {
    content: '/content/config-edm.md',
    label: 'Config eDM'
  },
  '/database-checker': {
    content: '/content/database-checker.md',
    label: 'Database Checker'
  },
  '/database-generator': {
    content: '/content/database-generator.md',
    label: 'Database Generator'
  },
  '/layout-checker': {
    content: '/content/layout-checker.md',
    label: 'Layout Checker'
  },
  '/wfh-tracker': {
    content: '/content/wfh-tracker.md',
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

function normalizePath(pathname) {
  if (LEGACY_PATHS[pathname]) {
    return LEGACY_PATHS[pathname];
  }

  if (pathname.length > 1) {
    return pathname.replace(/\/+$/, '');
  }

  return pathname;
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

function renderMarkdown(source) {
  if (!source) return '';

  const lines = source.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;

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
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
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
  return html.join('');
}

function setActiveLink(path) {
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    const active = link.getAttribute('href') === path;
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
    if (!frameDocument) return;

    const style = frameDocument.createElement('style');
    style.textContent = `
      body { padding-top: 0 !important; min-height: 100vh !important; }
      body > .header, body > .footer { display: none !important; }
      main#main-content { min-height: 100vh !important; }
    `;
    frameDocument.head.appendChild(style);

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
  const tool = attributes.tool;

  document.title = `${title} | eDM Helper`;

  const intro = `
    <header class="content-intro">
      <p class="content-eyebrow">${escapeHtml(category)}</p>
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

  viewport.innerHTML = `<div class="content-page">${intro}${markdownContent}${toolFrame}</div>`;

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
      <a href="/" data-route>Back to overview</a>
    </section>
  `;
}

async function loadRoute(path) {
  const route = ROUTES[path];
  setActiveLink(path);
  closeSidebar();

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
    const response = await fetch(route.content, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load ${route.content}: ${response.status}`);
    }
    renderPage(route, await response.text());
    viewport.scrollTop = 0;
    viewport.focus({ preventScroll: true });
  } catch (error) {
    console.error(error);
    viewport.innerHTML = `
      <section class="content-error">
        <p class="content-eyebrow">Content error</p>
        <h1>Unable to load this tool</h1>
        <p>Please run eDM Helper through its local server instead of opening the HTML file directly.</p>
      </section>
    `;
  }
}

function navigate(path, options = {}) {
  const normalized = normalizePath(path);
  if (!options.replace && normalized !== window.location.pathname) {
    window.history.pushState({}, '', normalized);
  } else if (options.replace || normalized !== window.location.pathname) {
    window.history.replaceState({}, '', normalized);
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
  navigate(url.pathname);
});

window.addEventListener('popstate', () => {
  loadRoute(normalizePath(window.location.pathname));
});

menuToggle.addEventListener('click', () => {
  const open = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  backdrop.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
});

backdrop.addEventListener('click', closeSidebar);

document.getElementById('footer-year').textContent = new Date().getFullYear();

const initialPath = normalizePath(window.location.pathname);
if (initialPath !== window.location.pathname) {
  window.history.replaceState({}, '', initialPath);
}
loadRoute(initialPath);
