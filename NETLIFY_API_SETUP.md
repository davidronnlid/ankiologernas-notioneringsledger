# Netlify API Setup Guide

För att automatisk Notion-konfiguration ska fungera behöver vi konfigurera Netlify API access.

## 🔧 Steg 1: Skaffa Netlify API Token

### 1. Gå till Netlify Dashboard
- Öppna [https://app.netlify.com/](https://app.netlify.com/)
- Logga in på ditt konto

### 2. Skapa Personal Access Token
- Klicka på din profil (övre högra hörnet)
- Välj **"User settings"**
- Gå till **"Applications"** i sidomenyn
- Scrolla ner till **"Personal access tokens"**
- Klicka **"New access token"**

### 3. Konfigurera Token
- **Description**: `Ankiologernas Notioneringsledger Auto-Config`
- **Expiration**: Välj "No expiration" eller långt datum
- Klicka **"Generate token"**

### 4. Kopiera Token
- **VIKTIGT**: Kopiera token OMEDELBART (visas bara en gång)
- Token börjar med `nfp_` 
- Spara säkert tills vidare

## 🏗️ Steg 2: Hitta Site ID

### 1. Gå till din Site
- I Netlify dashboard, klicka på **"ankiologernas-notioneringsledger"** site
- Alternativt gå till [https://app.netlify.com/sites/ankiologernasnl/](https://app.netlify.com/sites/ankiologernasnl/)

### 2. Hitta Site ID
- Gå till **"Site configuration"** → **"General"**
- Under **"Site details"** ser du **"Site ID"**
- Site ID ser ut som: `abc123def-456g-789h-012i-345jklmnopqr`
- Kopiera hela Site ID

## ⚙️ Steg 3: Sätt Environment Variables

### 1. Gå till Environment Variables
- I din site, gå till **"Site configuration"** → **"Environment variables"**
- Klicka **"Add a variable"**

### 2. Lägg till NETLIFY_API_TOKEN
- **Key**: `NETLIFY_API_TOKEN`
- **Values**: Klistra in din API token (börjar med `nfp_`)
- **Scopes**: Lämna "All scopes" 
- Klicka **"Create variable"**

### 3. Lägg till NETLIFY_SITE_ID  
- Klicka **"Add a variable"** igen
- **Key**: `NETLIFY_SITE_ID`
- **Values**: Klistra in ditt Site ID
- **Scopes**: Lämna "All scopes"
- Klicka **"Create variable"**

## 🚀 Steg 4: Deploy & Test

### 1. Trigger Deploy
- Gå till **"Deploys"** tab
- Klicka **"Trigger deploy"** → **"Deploy site"**
- Vänta tills deploy är klar

### 2. Testa Setup
- Öppna appen och testa Notion setup igen
- Nu borde "SPARA KONFIGURATION" fungera!

## 🔒 Säkerhet

### API Token Permissions
Netlify API token kan:
- ✅ Läsa och uppdatera environment variables
- ✅ Trigga site rebuilds
- ❌ INTE komma åt kod eller andra sites

### Begränsningar
- Token är scopad till din account
- Kan bara ändra environment variables
- Inget access till känslig data

## 🆘 Troubleshooting

### "401 Unauthorized"
- API token är fel eller har förfallit
- Skapa ny token och uppdatera

### "404 Not Found"  
- Site ID är fel
- Dubbelkolla Site ID i Netlify dashboard

### "403 Forbidden"
- Token saknar permissions
- Kontrollera att token har "Sites" scope

---

Efter detta ska automatisk Notion-konfiguration fungera perfekt! 🎉