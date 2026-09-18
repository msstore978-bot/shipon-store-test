# Shipon Store — Repaired Master Package

This package consolidates the current offline-first foundation and applies the critical repairs identified during repository audit.

## Repairs applied
- Frontend API now sends `{action,payload,auth:{token}}` to Apps Script and expects `success/data`.
- App startup calls `baseBoot()` instead of an undefined `boot()`.
- Customer local/cloud field aliases are aligned (`id/customerId`, `shop/shopName`, `mobile/phone`).
- Removed unsupported child sync mutations for sale stock/product and customer transaction; sale is server-authoritative.
- Removed duplicate customer update from payment sync; payment is authoritative on server.
- Real Code128 barcode generation added with JsBarcode.
- GitHub Actions switched from `npm ci` to `npm install` because the package does not ship a lockfile, and Java 21 setup was added.

## Important
This is a development repair package, not a claim of production certification. After installing the Apps Script backend, test login, offline sale/purchase, stock, due, duplicate retry, barcode scanning, image sync, and APK build before live business use.
