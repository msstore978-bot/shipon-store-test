# Final Backend Setup

1. Create/open the Google Spreadsheet that will be the database.
2. Create/open the Apps Script project attached to that spreadsheet (or a standalone Apps Script project with access to it).
3. Copy ALL `.gs` files from `backend/` into the SAME Apps Script project.
4. In the Apps Script editor, set the Script Properties required by `setBackendProperties(spreadsheetId, driveFolderId, appName)`.
5. Run `setupOfflineBackend()` once and authorize the requested permissions.
6. Create an initial admin using the Auth helper documented in the source/Phase 2 notes; use a SHA256 password hash as required by Auth.gs.
7. Deploy as Web app: execute as the owner and choose the access setting appropriate for your account/use case.
8. Copy the `/exec` deployment URL into the Android app Settings/API URL field.
9. Test `health`, login, bootstrap and sync before entering real data.

IMPORTANT: The previously used Apps Script URL is NOT automatically guaranteed to be compatible. Reuse it only after replacing/updating its code with this final backend and redeploying the same project. A deployment of the old code will not provide the final API.
