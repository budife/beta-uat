import http.server
import socketserver
import os
from urllib.parse import urlsplit

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    project_prefix = "/beta-uat"

    app_routes = {
        "/",
        "/bookmarklet",
        "/campaign-counter",
        "/config-edm",
        "/database-checker",
        "/database-generator",
        "/layout-checker",
        "/wfh-tracker",
    }

    legacy_routes = {
        "/index.html": "/",
        "/bookmarklet.html": "/bookmarklet",
        "/campaign-counter.html": "/campaign-counter",
        "/config.html": "/config-edm",
        "/database-checker.html": "/database-checker",
        "/database-generator.html": "/database-generator",
        "/layout-checker.html": "/layout-checker",
        "/wfh-tracker.html": "/wfh-tracker",
    }

    def do_GET(self):
        request = urlsplit(self.path)
        is_project_path = (
            request.path == self.project_prefix
            or request.path.startswith(f"{self.project_prefix}/")
        )
        app_path = request.path[len(self.project_prefix):] if is_project_path else request.path
        app_path = app_path or "/"

        if app_path in self.legacy_routes and request.query != "embed=1":
            self.send_response(301)
            prefix = self.project_prefix if is_project_path else ""
            self.send_header("Location", f"{prefix}{self.legacy_routes[app_path]}")
            self.end_headers()
            return

        if app_path in self.app_routes:
            self.path = "/index.html"
        elif is_project_path:
            self.path = app_path
            if request.query:
                self.path += f"?{request.query}"

        super().do_GET()

    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Add MIME types for proper file serving
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.css'):
            self.send_header('Content-Type', 'text/css')
        elif self.path.endswith('.md'):
            self.send_header('Content-Type', 'text/markdown; charset=utf-8')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
