# Shipon Store — Final Master Project

This is the consolidated development project combining Phases 2–9 into one Android + Apps Script offline-first system.

## Architecture
Android Capacitor app -> IndexedDB/offline queue -> Apps Script API -> Google Sheets/Drive.

## Main features
- Admin/Staff login and role foundation
- Dashboard
- Customer profiles and images
- Customer due / payment / transaction ledger
- Product master
- Product images
- Product barcode generation/lookup
- Purchase and supplier due
- Inventory and stock ledger
- Sales cart with barcode lookup
- Expense
- Daily/monthly/yearly sales, expense and profit reporting foundation
- Offline-first local database and sync queue
- Duplicate-safe server sync foundation
- Native barcode scanner foundation with browser fallback
- Google Drive image backend
- Audit log and reminders foundation

## IMPORTANT
The project is a development master, not a claim of production certification. Before real business use, perform the test checklist in FINAL_USER_STEPS.md, especially stock, due, duplicate-sync and permission tests.

## Backend
Upload every `.gs` file inside `backend/` into the SAME Google Apps Script project. Do not create a separate Apps Script project for each file.

Run the setup function described in BACKEND_SETUP_FINAL.md after configuring the spreadsheet ID and Drive folder.

## Android
Push this entire project to GitHub. GitHub Actions builds a debug APK and exposes it as an Actions artifact named `shipon-store-debug-apk`.
