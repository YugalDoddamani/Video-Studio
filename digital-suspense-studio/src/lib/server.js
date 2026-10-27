'use strict';

/**
 * server.js - the local asset server used during rendering.
 *
 * The stage page cannot open project files directly (browsers do not expose
 * the filesystem), so the renderer serves:
 *
 *   /stage/*                  the stage page, scripts, styles, fonts
 *   /api/config?project=slug  that project's scenes.json
 *   /api/projects             the project index
 *   /api/health               liveness probe
 *
 * It binds to 127.0.0.1 on an ephemeral port. Nothing is exposed off-host.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { STAGE_DIR, FONTS_DIR, PROJECTS_DIR, assertSlug, listProjects } = require('./paths.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
};

function send(response, status, body, type) {
  response.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function serveFile(response, file) {
  fs.readFile(file, (error, buffer) => {
    if (error) {
      send(response, 404, 'Not found');
      return;
    }
    send(response, 200, buffer, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
}

function safeJoin(root, relative) {
  const target = path.resolve(root, '.' + path.posix.normalize('/' + relative));
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

function start(options) {
  const opts = options || {};
  const projectIndex = opts.projects || null;
  // In-memory configs let tooling (the component gallery) render without
  // creating a project folder on disk.
  const overrides = opts.overrides || {};

  const server = http.createServer((request, response) => {
    let url;
    try {
      url = new URL(request.url, 'http://127.0.0.1');
    } catch (error) {
      send(response, 400, 'Bad request');
      return;
    }

    if (url.pathname === '/api/health') {
      send(response, 200, JSON.stringify({ ok: true }), MIME['.json']);
      return;
    }

    if (url.pathname === '/api/projects') {
      send(response, 200, JSON.stringify(projectIndex || listProjects()), MIME['.json']);
      return;
    }

    if (url.pathname === '/api/config') {
      const project = url.searchParams.get('project') || '';
      let slug;
      try {
        slug = assertSlug(project);
      } catch (error) {
        send(response, 400, error.message);
        return;
      }
      if (overrides[slug]) {
        send(response, 200, JSON.stringify(overrides[slug]), MIME['.json']);
        return;
      }
      const configFile = path.join(PROJECTS_DIR, slug, 'scenes.json');
      fs.readFile(configFile, 'utf8', (error, text) => {
        if (error) {
          send(response, 404, `No scenes.json for project "${slug}".`);
          return;
        }
        // Validate JSON so a malformed file reports a clear message in-browser.
        try {
          JSON.parse(text);
        } catch (parseError) {
          send(response, 422, `scenes.json for "${slug}" is not valid JSON: ${parseError.message}`);
          return;
        }
        send(response, 200, text, MIME['.json']);
      });
      return;
    }

    if (url.pathname === '/stage' || url.pathname === '/stage/') {
      serveFile(response, path.join(STAGE_DIR, 'index.html'));
      return;
    }

    if (url.pathname.startsWith('/stage/fonts/')) {
      const relative = url.pathname.slice('/stage/fonts/'.length);
      const file = safeJoin(FONTS_DIR, relative);
      if (!file) {
        send(response, 403, 'Forbidden');
        return;
      }
      serveFile(response, file);
      return;
    }

    if (url.pathname.startsWith('/stage/')) {
      const relative = url.pathname.slice('/stage/'.length);
      const file = safeJoin(STAGE_DIR, relative);
      if (!file) {
        send(response, 403, 'Forbidden');
        return;
      }
      serveFile(response, file);
      return;
    }

    send(response, 404, 'Not found');
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port || 0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        port,
        origin: `http://127.0.0.1:${port}`,
        stageUrl: (project) => `http://127.0.0.1:${port}/stage/?project=${encodeURIComponent(project)}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

module.exports = { start, MIME };
