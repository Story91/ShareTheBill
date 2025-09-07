# Google Vision API Setup Guide

## Krok 1: Założenie projektu w Google Cloud

1. Idź na [Google Cloud Console](https://console.cloud.google.com/)
2. Załóż nowy projekt lub wybierz istniejący
3. Włącz Vision API:
   - Idź do "APIs & Services" > "Library"
   - Wyszukaj "Vision API"
   - Kliknij "Enable"

## Krok 2: Utworzenie Service Account

1. Idź do "IAM & Admin" > "Service Accounts"
2. Kliknij "Create Service Account"
3. Nazwij go np. "ocr-service"
4. Przypisz rolę "Cloud Vision API Service Agent"
5. Pobierz klucz JSON:
   - Kliknij na service account
   - Idź do "Keys"
   - "Add Key" > "Create new key" > "JSON"
   - Pobierz plik

## Krok 3: Konfiguracja w aplikacji

Utwórz plik `.env.local` w katalogu głównym projektu:

```bash
# Google Vision API Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Opcja 1: Ścieżka do pliku klucza
GOOGLE_APPLICATION_CREDENTIALS=./google-vision-key.json

# Opcja 2: Zawartość JSON bezpośrednio (dla Vercel/produkcji)
# GOOGLE_CLOUD_KEY_JSON={"type":"service_account","project_id":"your-project",...}
```

## Krok 4: Umieść klucz w projekcie

1. Skopiuj pobrany plik JSON do katalogu projektu jako `google-vision-key.json`
2. Dodaj go do `.gitignore` (żeby nie wrzucić do repo):

```gitignore
google-vision-key.json
.env.local
```

## Krok 5: Test

Uruchom aplikację i spróbuj użyć funkcji "🚀 Smart Scan" - powinna teraz używać Google Vision API.

## Ceny

- 1000 requestów miesięcznie za darmo
- Potem $1.50 za 1000 requestów
- Szczegóły: https://cloud.google.com/vision/pricing

## Rozwiązywanie problemów

Jeśli nie działa, sprawdź w konsoli przeglądarki:
- Network tab - czy request do `/api/ocr-advanced` się udaje
- Console tab - czy są błędy związane z Google Vision

W konsoli serwera (`npm run dev`) sprawdź czy są błędy typu:
- "Google Vision client not available"
- "Authentication error"
