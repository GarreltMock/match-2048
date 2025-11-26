#!/usr/bin/env bash
set -euo pipefail

CSS_DIR="${1:-.}"        # Ordner mit CSS-Dateien (Standard: aktuelles Verzeichnis)
PROJECT_DIR="${2:-.}"    # Projektordner (Standard: aktuelles Verzeichnis)

echo "CSS-Verzeichnis:    $CSS_DIR"
echo "Projektverzeichnis: $PROJECT_DIR"

CSS_CLASSES=$(
  rg --no-filename -o '\.([a-zA-Z_][a-zA-Z0-9_-]*)' "$CSS_DIR" --glob '*.css' \
    | sed 's/^\.//' \
    | sort -u
)

echo "Gefundene CSS-Klassen:"
echo "$CSS_CLASSES"
echo "Vermutlich ungenutzte Klassen:"
echo "------------------------------"

while IFS= read -r cls; do
  if ! rg -q -F "$cls" "$PROJECT_DIR" --glob '*.html' --glob 'src/*.js'; then
    echo "$cls"
  fi
done <<< "$CSS_CLASSES"