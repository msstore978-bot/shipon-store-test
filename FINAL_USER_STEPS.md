# Final User Steps

## A. Keep the ZIP
Save this Final Master ZIP. Do not install Phase 2–9 separately.

## B. Google Sheets/Apps Script
Follow BACKEND_SETUP_FINAL.md. The backend is one Apps Script project with multiple `.gs` files.

## C. GitHub
1. Create a GitHub repository.
2. Upload the entire contents of this project (including `.github/workflows/android.yml`).
3. Push to `main`.
4. Open Actions and wait for `Build Shipon Store APK`.
5. Download the `shipon-store-debug-apk` artifact.

## D. First app configuration
Open the APK. Enter the final Apps Script `/exec` API URL in Settings. Login with the admin account. Run Sync.

## E. Required tests before real use
- Admin login
- Staff login
- Staff cannot change selling price
- Staff cannot create unauthorized expenses/stock adjustments
- Product create + barcode
- Purchase increases stock exactly once
- Sale decreases stock exactly once
- Sale cannot exceed server stock
- Customer due and payment remain correct after sync
- Supplier due/payment remains correct after sync
- Duplicate sync does not duplicate stock/due
- Offline sale/purchase/customer entry and reconnect sync
- Product/customer images work locally and upload/sync
- Native barcode scan and manual fallback
- Daily/monthly/yearly profit and expense totals
