# Bergtatt (nettsted)

Statisk nettside for podcasten **Bergtatt**, bygget med [Jekyll](https://jekyllrb.com/) og ment for [GitHub Pages](https://pages.github.com/) med domenet [bergtattpodcast.no](https://bergtattpodcast.no).

## Publisere episoder (Decap CMS)

Episoder redigeres **manuelt** i [Decap CMS](https://decapcms.org/) — ikke automatisk fra RSS.

| Miljø | URL |
|--------|-----|
| Produksjon | https://bergtattpodcast.no/admin/ |
| Lokalt | http://localhost:4000/admin/ (med `jekyll serve` + `decap-server`) |

### Lokalt redigeringsoppsett

Terminal 1 — nettsiden:

```bash
./scripts/jekyll.sh exec jekyll serve
```

Terminal 2 — Decap (kobler til lokal Jekyll, ingen GitHub-login):

```bash
npx decap-server
```

Åpne http://localhost:8080/admin/ (Decap-server) eller http://localhost:4000/admin/ avhengig av oppsett — Decap viser vanligvis proxy på port 8081/8080. Standard: start `decap-server`, gå til **http://localhost:4000/admin/** med `local_backend: true` i `admin/config.yml`.

### Produksjon (GitHub)

For å logge inn på https://bergtattpodcast.no/admin/ må du sette opp **GitHub OAuth** (GitHub Pages har ikke innebygd innlogging). Oversikt:

1. Opprett [GitHub OAuth App](https://github.com/settings/applications/new) for repoet `hanserino/bergtatt`.
2. Deploy en liten [OAuth-proxy](https://decapcms.org/docs/github-backend/) (f.eks. på Vercel/Cloudflare).
3. Fyll inn `base_url` og `auth_endpoint` i `admin/config.yml` (kommentert ut nå).
4. Commit og push — deretter kan du redigere episoder i nettleseren; Decap lager commit på `main`, og GitHub Actions publiserer siden.

Nye episoder får `source: decap` og overskrives ikke av import-skriptet.

### Valgfritt: masseimport fra RSS

Kun hvis du vil hente mange episoder fra Acast på en gang:

```bash
python3 scripts/sync_episodes_from_rss.py
```

Dette **sletter kun** filer merket `source: acast-rss`. Eksisterende episoder er markert `source: manual` og røres ikke.

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
| `admin/` | Decap CMS (`config.yml`, `index.html`) |
| `_posts/` | Én Jekyll-post per episode (manuell via Decap) |
| `_layouts/` | `default` (ramme), `episode` (episode-side) |
| `assets/css/site.css` | Enkel CSS — kan byttes ut i design-runden |
| `CNAME` | Peeker GitHub Pages mot `bergtattpodcast.no` |
| `assets/uploads/` | Bilder lastet opp via Decap |
| `scripts/sync_episodes_from_rss.py` | Valgfri RSS-masseimport |
| `scripts/jekyll.sh` | Kjør `bundle` med Homebrew Ruby |

Offentlig URL for episoder: `/episodes/<acast-episode-slug>/`.
