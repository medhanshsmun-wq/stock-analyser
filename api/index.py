import os
import sys

# Add the project root to sys.path so we can import from 'backend'
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.main import app
