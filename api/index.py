import os
import sys

# Add the project root and backend folder to sys.path
root = os.path.join(os.path.dirname(__file__), '..')
sys.path.append(root)
sys.path.append(os.path.join(root, 'backend'))

from backend.main import app
