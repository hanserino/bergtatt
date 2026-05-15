# Bergtatt (nettsted)

Statisk nettside for podcasten **Bergtatt**, bygget med [Jekyll](https://jekyllrb.com/) og ment for [GitHub Pages](https://pages.github.com/) med domenet [bergtattpodcast.no](https://bergtattpodcast.no).

## Episoder fra RSS

Episoder i `_posts/` genereres fra Acast-RSS (shownotes som HTML, permalenker, lyd-URL, bilde osv.):

```bash
python3 scripts/sync_episodes_from_rss.py
```

Valgfritt: `export BERGTATT_RSS_URL="https://..."` for annen feed-URL.

Filer som er synket merkes med `source: acast-rss` i front matter. Synk **sletter** slike filer og skriver dem på nytt — ikke rediger manuelt i disse filene hvis du vil beholde endringene.

## Lokal forhåndsvisning (anbefalt: Homebrew Ruby)

På macOS med RVM har kompilert Ruby ofte **ikke** OpenSSL (`ruby -ropenssl` feiler → `gem install bundler` feiler). Bruk **Homebrew Ruby** i stedet:

```bash
brew install ruby@3.3

# Én gang: legg Homebrew Ruby før RVM i ~/.zshrc (Intel Mac)
echo 'export PATH="/usr/local/opt/ruby@3.3/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

which ruby    # skal være .../ruby@3.3/bin/ruby
ruby -ropenssl -e 'puts OpenSSL::OPENSSL_VERSION'

cd bergtatt
gem install bundler
bundle install
bundle exec jekyll serve
```

Åpne `http://127.0.0.1:4000`.

**Alternativ** (uten å endre global PATH): bruk prosjektets wrapper:

```bash
chmod +x scripts/jekyll.sh
./scripts/jekyll.sh install
./scripts/jekyll.sh exec jekyll serve
```

Apple Silicon: bytt `/usr/local` med `$(brew --prefix)` (ofte `/opt/homebrew`).

### Feilsøking

| Symptom | Årsak | Løsning |
|--------|--------|--------|
| `OpenSSL is not available` / `cannot load such file -- openssl` | RVM-Ruby bygget uten `ext/openssl` | Bruk Homebrew Ruby (over), ikke `rvm use 3.4.8` |
| `which ruby` viser `~/.rvm/...` | RVM overstyrer PATH | Legg `/usr/local/opt/ruby/bin` **før** RVM i `~/.zshrc`, eller bruk `scripts/jekyll.sh` |
| `cannot load such file -- csv` / `base64` | Homebrew `ruby` 4.0 | Bruk `brew install ruby@3.4` i stedet |

GitHub Actions bygger fortsatt med Ruby 3.4.8 på Linux (uten dette macOS/RVM-problemet).

## GitHub Pages (teknisk oppsett)

1. Push repo til GitHub.
2. **Settings → Pages → Build and deployment**: velg **GitHub Actions**.
3. La workflowen `.github/workflows/jekyll-pages.yml` kjøre på `main`.
4. **Custom domain**: `bergtattpodcast.no` (CNAME-fil i repo-roten).
5. DNS **CNAME** mot GitHub Pages-hostnavnet GitHub viser. Slå på «Enforce HTTPS» når DNS er grønt.

## Struktur

| Sted | Formål |
|------|--------|
| `_posts/` | Én Jekyll-post per episode (generert) |
| `_layouts/` | `default` (ramme), `episode` (episode-side) |
| `assets/css/site.css` | Enkel CSS — kan byttes ut i design-runden |
| `CNAME` | Peeker GitHub Pages mot `bergtattpodcast.no` |
| `scripts/sync_episodes_from_rss.py` | RSS → Markdown |
| `scripts/jekyll.sh` | Kjør `bundle` med Homebrew Ruby |

Offentlig URL for episoder: `/episodes/<acast-episode-slug>/`.
