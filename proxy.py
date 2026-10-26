#!/usr/bin/env python3
# Run:  python3 proxy.py
# Then in index.html set:
#   const CORS_PROXY = "http://localhost:8000/?";
import http.server
import urllib.parse
import urllib.request


class Proxy(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        target = urllib.parse.urlparse(self.path).query
        target = urllib.parse.unquote(target)
        if not target.startswith("https://site.api.espn.com/"):
            self.send_error(400, "Only ESPN URLs allowed")
            return
        try:
            with urllib.request.urlopen(target, timeout=15) as r:
                body = r.read()
        except Exception as e:
            self.send_error(502, str(e))
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    http.server.HTTPServer(("", 8000), Proxy).serve_forever()
    print("Proxy listening on http://localhost:8000")