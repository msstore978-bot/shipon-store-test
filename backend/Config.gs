var API_VERSION = "2.0.0";

function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: p.getProperty("SPREADSHEET_ID") || SpreadsheetApp.getActiveSpreadsheet().getId(),
    driveFolderId: p.getProperty("DRIVE_FOLDER_ID") || "",
    tokenSecret: p.getProperty("API_TOKEN_SECRET") || "",
    appName: p.getProperty("APP_NAME") || "Shipon Store",
    timezone: p.getProperty("TIMEZONE") || "Asia/Dhaka"
  };
}

function requireConfig_() {
  var c = getConfig_();
  if (!c.spreadsheetId) throw new Error("SPREADSHEET_ID is not configured.");
  return c;
}

function getDb_() {
  return SpreadsheetApp.openById(requireConfig_().spreadsheetId);
}
