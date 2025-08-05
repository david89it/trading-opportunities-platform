#!/usr/bin/env python3
"""Simple test server for API integration testing"""

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("Starting test server on port 8002...")
    uvicorn.run(app, host="127.0.0.1", port=8002, log_level="info")