import http.server, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
DIR  = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)
    def log_message(self, fmt, *args):
        pass

with http.server.HTTPServer(("", PORT), Handler) as s:
    s.serve_forever()
