# 📝 Notion API Integration Setup

Den här applikationen kan automatiskt uppdatera alla tre användarnas Notion-databaser när en föreläsning väljs. När David väljer en föreläsning läggs "D" till i "Vems"-kolumnen i alla tre användarnas Notion-databaser för den föreläsningen.

## 🔧 Setup Instructions

### 1. Skapa Notion Integrations

För varje användare (David, Albin, Mattias):

1. Gå till [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Klicka på **"New integration"**
3. Namn: `Ankiologernas Notioneringsledger - [Användarnamn]`
4. Workspace: Välj den workspace där föreläsningsdatabasen finns
5. Capabilities: **Read content**, **Update content**, **Insert content**
6. Kopiera **Internal Integration Token** (börjar med `secret_`)

### 2. Ge Integration Access till Databas

För varje användares föreläsningsdatabas:

1. Öppna din föreläsningsdatabas i Notion
2. Klicka på **"..."** (tre prickar) i övre högra hörnet
3. Välj **"Connect to"** → **"Your integration name"**
4. Bekräfta att integrationen har access

### 3. Hitta Database ID

För varje databas:

1. Öppna databasen i Notion
2. Kopiera URL:en (t.ex. `https://www.notion.so/yourworkspace/DATABASE_ID?v=VIEW_ID`)
3. Database ID är den långa strängen mellan sista `/` och `?v=`
4. Exempel: `https://notion.so/myworkspace/a1b2c3d4e5f6...` → Database ID är `a1b2c3d4e5f6...`

### 4. Databasstruktur

Kontrollera att varje användares databas har dessa kolumner:

- **Name** (Title) - Föreläsningens titel (t.ex. "1. Introduktion till kardiologi")
- **Föreläsningsnamn** (Text) - Föreläsningens namn utan nummer
- **Vems** (Multi-select) - För att lagra användarval (D, A, M)
- **Anki** (Multi-select) - För Anki-cards (kan vara tom)
- **Last Updated** (Date) - Automatiskt uppdaterad av integrationen

### 5. Environment Variables

Lägg till dessa environment variables i Netlify:

**I Netlify Dashboard:**
1. Gå till Site settings → Environment variables
2. Lägg till följande variabler:

```bash
# David's Notion Integration
NOTION_TOKEN_DAVID=secret_XXXXXXXXXX
NOTION_DATABASE_DAVID=a1b2c3d4e5f6...

# Albin's Notion Integration  
NOTION_TOKEN_ALBIN=secret_YYYYYYYYYY
NOTION_DATABASE_ALBIN=g7h8i9j0k1l2...

# Mattias's Notion Integration
NOTION_TOKEN_MATTIAS=secret_ZZZZZZZZZZ
NOTION_DATABASE_MATTIAS=m3n4o5p6q7r8...
```

### 6. Lokala Environment Variables (för development)

Skapa en `.env.local` fil i projektets root:

```bash
# .env.local (lägg INTE till i git!)
NOTION_TOKEN_DAVID=secret_XXXXXXXXXX
NOTION_DATABASE_DAVID=a1b2c3d4e5f6...
NOTION_TOKEN_ALBIN=secret_YYYYYYYYYY
NOTION_DATABASE_ALBIN=g7h8i9j0k1l2...
NOTION_TOKEN_MATTIAS=secret_ZZZZZZZZZZ
NOTION_DATABASE_MATTIAS=m3n4o5p6q7r8...
```

## 🚀 Testa Integrationen

1. Installera Notion SDK: `npm install @notionhq/client`
2. Starta dev server: `npm run dev`
3. Välj en föreläsning i appen
4. Kontrollera browser console för Notion-loggar
5. Verifiera att "D", "A", eller "M" läggs till i "Vems"-kolumnen i alla tre Notion-databaser

## 📋 Funktionalitet

### Användarval i Vems-kolumnen
När en användare väljer/avväljer en föreläsning:

- ✅ **David väljer**: "D" läggs till i Vems-kolumnen
- ✅ **Albin väljer**: "A" läggs till i Vems-kolumnen  
- ✅ **Mattias väljer**: "M" läggs till i Vems-kolumnen
- ❌ **Avväljer**: Motsvarande bokstav tas bort från Vems-kolumnen
- 🔄 **Alla databaser uppdateras**: Synkroniserat över alla tre användares databaser

### Auto-skapning av föreläsningar
- 📝 **Saknade föreläsningar skapas automatiskt**: Om en föreläsning finns i appen men inte i Notion skapas den automatiskt
- 🏗️ **Komplett struktur**: Nya sidor skapas med alla nödvändiga kolumner
- 🕐 **Tidsstämpel**: "Last Updated" sätts automatiskt
- 🔍 **Intelligent sökning**: Matchar på titel, nummer eller föreläsningsnamn

### Sökmekanismer
Integrationen söker efter föreläsningar på tre sätt:
1. **Name-kolumnen**: Söker efter föreläsningens titel
2. **Name-kolumnen**: Söker efter föreläsningsnummer (t.ex. "1.")
3. **Föreläsningsnamn-kolumnen**: Söker efter föreläsningens namn

## ⚠️ Troubleshooting

### Integration fungerar inte
- Kontrollera att alla environment variables är korrekt satta
- Verifiera att integration har access till databasen
- Kontrollera att Database ID är korrekt
- Se browser console och Netlify function logs för felmeddelanden

### Föreläsning hittas inte / Skapas inte
- Kontrollera att databasen har rätt kolumnstruktur (Name, Föreläsningsnamn, Vems)
- Verifiera att integrationen har **Insert content** capabilities för att skapa nya sidor
- Kontrollera console logs för detaljerad information

### Permission errors
- Kontrollera att integrationen har **Update content** och **Insert content** capabilities
- Verifiera att integration är kopplad till rätt databas
- Kontrollera att API token är giltig

### Vems-kolumnen uppdateras inte
- Kontrollera att "Vems" är en Multi-select kolumn i Notion
- Verifiera att bokstäverna D, A, M är tillgängliga som options (eller läggs till automatiskt)

## 🔐 Säkerhet

- API tokens förvaras säkert i environment variables
- Tokens exponeras ALDRIG i frontend-kod
- Alla API-anrop går via Netlify Functions (backend)
- Tokens har begränsade permissions (endast specifika databaser)

## 📊 Logs och Monitoring

- Kontrollera browser console för detaljerade logs
- Netlify function logs visar backend-aktivitet
- Notion API rate limits: 3 requests per second
- Logs visar när nya sidor skapas automatiskt

## 🆕 Nya funktioner

- **Enkelhetsbokstäver**: D, A, M istället för "David vald", "Albin vald", "Mattias vald"
- **Auto-skapning**: Föreläsningar som finns i appen men saknas i Notion skapas automatiskt
- **Förbättrad sökning**: Söker i både Name och Föreläsningsnamn kolumner
- **Detaljerad logging**: Visar när sidor skapas och uppdateras 