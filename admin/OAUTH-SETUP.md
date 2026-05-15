# Decap CMS + GitHub Pages — innlogging

Decaps **GitHub**-backend trenger en kort **OAuth-utveksling**. Git tillater ikke `client_secret` i nettleseren, så en liten **proxy** (Cloudflare Worker) logger deg inn.

Admin-UI: **https://bergtattpodcast.no/admin/**

Dette repoet følger **[sterlingwes/decap-proxy](https://github.com/sterlingwes/decap-proxy)**. Wrangler-mal: **`admin/cloudflare-decap-wrangler.toml`** (kopieres inn i klonen som `wrangler.toml`).

---

## 1. Forutsetninger

- **Node.js 20+** (Wrangler 4). Sjekk: `node -v`
- **Cloudflare-konto** (gratis tier holder)

---

## 2. Deploy workeren (engangsjobb)

Fra **prosjektmappen** bergtatt (ikke inne i et spor som skal committes):

```bash
git clone --depth 1 https://github.com/sterlingwes/decap-proxy.git tools/decap-proxy
cp admin/cloudflare-decap-wrangler.toml tools/decap-proxy/wrangler.toml
cd tools/decap-proxy
npm install
npx wrangler login
npx wrangler deploy
```

`wrangler deploy` skriver ut worker-URL, f.eks.:

`https://bergtatt-decap-oauth.<din-subdomain>.workers.dev`

Åpne URL-en i nettleseren — du skal se **Hello 👋**.

**Lagre den URL-en** — den er **PROXY-URL** i neste steg.

---

## 3. GitHub OAuth App

[Opprett OAuth App](https://github.com/settings/applications/new) (Developer settings → OAuth Apps).

Bruk **proxy-hosten** (ikke bergtattpodcast.no) i begge feltene, jf. [decap-proxy README](https://github.com/sterlingwes/decap-proxy):

| Felt | Verdi |
|------|--------|
| **Homepage URL** | `https://DIN-PROXY-HOST` (samme origin som workeren, uten path) |
| **Authorization callback URL** | **`https://DIN-PROXY-HOST/callback?provider=github`** |

**Callback må inkludere query-strengen.** decap-proxy sender `redirect_uri` som `.../callback?provider=github`. GitHub krever **eksakt match**. Kun `.../callback` uten `?provider=github` gir ofte 404 etter innlogging.

Eksempel når workeren heter `bergtatt-decap-oauth`:

`https://bergtatt-decap-oauth.<subdomain>.workers.dev/callback?provider=github`

Lagre **Client ID** og generer **Client secret**.

---

## 4. Secrets på Worker

Fortsatt i `tools/decap-proxy/`:

```bash
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
```

Lim inn GitHub **Client ID** og **Client secret**. Redeploy er vanligvis ikke nødvendig for secrets.

---

## 5. Oppdater Decap i dette repoet

I **`admin/config.yml`**, under `backend:`, fjern kommentar og sett **din** worker-URL:

```yaml
  base_url: https://bergtatt-decap-oauth.<subdomain>.workers.dev
  auth_endpoint: /auth
```

`repo:` og `branch:` skal allerede være `hanserino/bergtatt` og `main`.

**Ikke** ha `local_backend: true` i config som committes til produksjon.

Commit og push. GitHub Actions bygger siden; innlogging på `/admin/` går via proxyen, ikke Netlify.

Kun GitHub-brukere med **skrivetilgang** til **`hanserino/bergtatt`** kan publisere fra CMS.

---

## 6. Lokalt (uten OAuth)

Terminal 1:

```bash
./scripts/jekyll.sh exec jekyll serve
```

Terminal 2:

```bash
npx decap-server
```

For lokal redigering: legg midlertidig `local_backend: true` i `admin/config.yml` (ikke push til `main`), eller bruk decap-server som dokumentert i README.

---

## Feilsøking

- **`client_id=undefined` i GitHub-URL** — Worker mangler secrets. Kjør `wrangler secret put` for `GITHUB_OAUTH_ID` og `GITHUB_OAUTH_SECRET` (eksakte navn). `npx wrangler whoami` for å bekrefte riktig Cloudflare-konto.

- **404 etter GitHub-login / redirect_uri** — Callback i OAuth-appen må være **nøyaktig** `https://DIN-PROXY-HOST/callback?provider=github`.

- **Netlify-URL (`api.netlify.com`) i nettleseren** — `base_url` og `auth_endpoint` mangler eller er fortsatt kommentert ut i `admin/config.yml`.

- **`npx decap-server` funker, produksjon ikke** — Produksjon trenger worker + `base_url` / `auth_endpoint`; se [Decap GitHub backend](https://decapcms.org/docs/github-backend/).

## Alternativ: Netlify

Hvis du senere hoster repoet på **Netlify**, kan du bruke Netlifys innebygde auth i stedet for denne workeren. Se [Decap + Netlify](https://decapcms.org/docs/authentication-backends/).
