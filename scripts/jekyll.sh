#!/usr/bin/env bash
# Kjør Jekyll med Homebrew Ruby (unngår RVM uten OpenSSL).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if brew --prefix ruby@3.3 &>/dev/null; then
  RUBY_PREFIX="$(brew --prefix ruby@3.3)"
elif brew --prefix ruby@3.4 &>/dev/null; then
  RUBY_PREFIX="$(brew --prefix ruby@3.4)"
else
  RUBY_PREFIX="$(brew --prefix ruby 2>/dev/null || echo /usr/local/opt/ruby)"
fi

export PATH="${RUBY_PREFIX}/bin:${PATH}"
unset GEM_HOME GEM_PATH BUNDLE_BIN_PATH RBENV_VERSION RUBYOPT

cd "$ROOT"
exec bundle "$@"
