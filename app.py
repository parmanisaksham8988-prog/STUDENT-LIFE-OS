import os
import sys

# Root launcher for Student Life OS
base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(base_dir, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from backend.app import app, init_db

if __name__ == '__main__':
    init_db()
    port = int(os.getenv('PORT', 5000))
    print("=" * 60)
    print("STUDENT LIFE OS - FULL STACK APPLICATION")
    print("=" * 60)
    print(f"👉 Open Website in Browser: http://127.0.0.1:{port}/")
    print(f"👉 Backend API Base URL:    http://127.0.0.1:{port}/api")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=True)
