#!/usr/bin/env python3
"""
Deprecated for Pantry Wars — use Node instead:

  npm install && npm start

Then open http://localhost:3000/

This file is kept only if you need the old Python static + proxy; it serves
basket.html from the repo root, which is no longer the main entry (use public/index.html via server.js).
"""
import os
import sys

def main():
    print("Pantry Wars now runs with:  npm install && npm start")
    print("Open http://localhost:3000/")
    sys.exit(0)

if __name__ == "__main__":
    main()
