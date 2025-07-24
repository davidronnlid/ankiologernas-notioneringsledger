# Notifieringssystem för Notioneringsledger

## Översikt

Ett nytt notifieringssystem har lagts till i Notioneringsledger som låter användare notifiera varandra när de har notionerat färdigt föreläsningar. Systemet inkluderar både in-app notifieringar och möjlighet att dela via Facebook Messenger.

## Funktioner

### 1. Automatiska Notifieringar

- När en användare markerar en föreläsning som slutförd, skickas automatiskt notifieringar till alla andra användare
- Notifieringarna visas i realtid i notifieringspanelen

### 2. Manuella Notifieringar

- Användare kan klicka på "Notifiera andra" knappen på föreläsningskort som de har markerat som slutförda
- Välj specifikt vilka användare som ska notifieras
- Möjlighet att dela direkt på Facebook

### 3. Notifieringspanel

- Tillgänglig via notifieringsikonen i headern
- Visar alla notifieringar med olika typer (slutförd/notifierad)
- Möjlighet att markera som lästa eller ta bort notifieringar
- Räknare för olästa notifieringar

### 4. Mac-optimerade Notifieringar 🍎

- **Native notifieringar**: Integreras med macOS Notification Center
- **iMessage integration**: Direktlänkar till Messages-appen
- **Apple Mail integration**: Öppnar Mail-appen för e-post
- **System ljud**: Använder Mac-systemljud för notifieringar
- **Dock badge**: Uppdaterar appens badge-räknare
- **AirDrop stöd**: Möjlighet att dela via AirDrop

## Teknisk Implementation

### Redux Store

- Ny `notificationsReducer` för att hantera notifieringar
- Persistering av notifieringar i localStorage
- Automatisk uppdatering av olästa notifieringar

### Komponenter

- `NotificationsPanel.tsx` - Huvudpanelen för att visa notifieringar
- `NotifyButton.tsx` - Knapp för att skicka manuella notifieringar
- Uppdaterad `Header.tsx` med notifieringsikon

### Notifieringstyper

1. **lecture_completed** - Automatisk notifiering när någon slutför en föreläsning
2. **lecture_notified** - Manuell notifiering när någon väljer att notifiera andra

## Användning

### Som användare:

1. **Få notifieringar**: När andra användare slutför föreläsningar får du automatiskt notifieringar
2. **Skicka notifieringar**: Klicka på "Notifiera andra" på en slutförd föreläsning
3. **Hantera notifieringar**: Öppna notifieringspanelen via ikonen i headern

### Som utvecklare:

1. Notifieringar sparas lokalt i Redux store
2. Automatisk notifiering sker i `handleCardClick` funktionen
3. Manuella notifieringar hanteras av `NotifyButton` komponenten

## Framtida Förbättringar

- [ ] Push-notifieringar via webbläsaren
- [ ] E-post notifieringar
- [ ] Notifieringar via Discord/Slack
- [ ] Anpassningsbara notifieringsinställningar
- [ ] Notifieringshistorik på servern

## Filer som har ändrats

- `src/store/slices/notificationsReducer.ts` - Ny reducer för notifieringar
- `src/store/store.ts` - Lagt till notifications reducer
- `src/store/types.ts` - Uppdaterat RootState
- `src/components/NotificationsPanel.tsx` - Ny komponent
- `src/components/NotifyButton.tsx` - Ny komponent med Mac-integration
- `src/components/Header.tsx` - Lagt till notifieringsikon
- `src/pages/index.tsx` - Lagt till NotifyButton och automatiska notifieringar
- `src/utils/macNotifications.ts` - Mac-specifika notifieringsverktyg
- `package.json` - Lagt till date-fns dependency
