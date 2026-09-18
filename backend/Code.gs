/**
 * SHIPON STORE - OFFLINE-FIRST CLOUD BACKEND
 * Phase 2: Apps Script REST API + legacy-compatible Sheets
 *
 * Deploy as Web App:
 * Execute as: Me
 * Who has access: Anyone with the deployment URL
 *
 * IMPORTANT:
 * - Put secrets/configuration in Script Properties.
 * - Android must communicate through doPost/doGet, not google.script.run.
 */

function doGet(e) {
  return apiResponse_({
    success: true,
    data: {
      service: "Shipon Store API",
      version: API_VERSION,
      status: "online",
      timestamp: new Date().toISOString()
    }
  });
}

function doPost(e) {
  try {
    var body = parseRequestBody_(e);
    return routeApi_(body);
  } catch (err) {
    return apiResponse_({
      success: false,
      data: null,
      message: "Server error",
      error: {
        code: "SERVER_ERROR",
        details: String(err && err.message ? err.message : err)
      }
    });
  }
}

/** Optional compatibility helper for browser testing. */
function doGetAction_(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  return routeApi_({
    action: action || "health",
    payload: e && e.parameter ? e.parameter : {}
  });
}
