"""List registered FastAPI routes."""
from app.main import app

print("ROUTES:")
for r in app.routes:
    methods = getattr(r, "methods", None)
    path = getattr(r, "path", None)
    if methods and path:
        m = ",".join(sorted(methods))
        print(f"  {m:20s} {path}")
