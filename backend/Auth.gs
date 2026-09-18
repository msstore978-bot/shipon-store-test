var Auth = {
  login: function(payload) {
    var username = clean_(payload.username);
    var password = String(payload.password || "");
    if (!username || !password) return fail_("INVALID_LOGIN","Username and password are required.");

    var sheet = SheetStore.ensureSheet_("Users", [
      "User_ID","Username","Password_Hash","Role","Name","Active","CreatedAt","UpdatedAt"
    ]);
    var rows = SheetStore.records_(sheet);
    for (var i=0;i<rows.length;i++) {
      var r=rows[i];
      if (String(r.Username).toLowerCase() === username.toLowerCase() &&
          String(r.Active).toLowerCase() !== "false") {
        if (verifyPassword_(password, String(r.Password_Hash))) {
          var token = createSession_(r);
          return ok_({
            token: token,
            user: {
              userId:r.User_ID, username:r.Username, role:String(r.Role).toUpperCase(), name:r.Name || r.Username
            }
          }, "Login successful");
        }
      }
    }
    return fail_("INVALID_LOGIN","Username or password is incorrect.");
  },

  requireSession: function(auth) {
    var token = String((auth && auth.token) || "");
    if (!token) throw new Error("Authentication required.");
    var cache = CacheService.getScriptCache();
    var raw = cache.get("session:"+token);
    if (!raw) throw new Error("Session expired or invalid.");
    var session = JSON.parse(raw);
    return session;
  }
};

function createSession_(userRow) {
  var token = Utilities.getUuid() + "." + Utilities.getUuid();
  var session = {
    user: {
      userId:userRow.User_ID,
      username:userRow.Username,
      role:String(userRow.Role || "").toUpperCase(),
      name:userRow.Name || userRow.Username
    },
    createdAt:new Date().toISOString()
  };
  CacheService.getScriptCache().put("session:"+token, JSON.stringify(session), 21600);
  return token;
}

function requireRole_(user, roles) {
  var role = String(user && user.role || "").toUpperCase();
  if (roles.indexOf(role) === -1) throw new Error("Permission denied.");
}

function clean_(v) {
  return String(v == null ? "" : v).trim();
}

function sha256_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(function(b){var x=(b<0?b+256:b).toString(16);return x.length===1?"0"+x:x;}).join("");
}

/**
 * Password format:
 * SHA256:<hex>
 * For initial setup, generate a hash externally or use createInitialAdmin().
 */
function verifyPassword_(plain, stored) {
  if (stored.indexOf("SHA256:") === 0) return sha256_(plain) === stored.substring(7);
  return false;
}

function createInitialAdmin(username, password, name) {
  var sheet = SheetStore.ensureSheet_("Users", [
    "User_ID","Username","Password_Hash","Role","Name","Active","CreatedAt","UpdatedAt"
  ]);
  var records = SheetStore.records_(sheet);
  if (records.length) throw new Error("Users already exist.");
  var now = new Date().toISOString();
  SheetStore.append_(sheet, {
    User_ID:Utilities.getUuid(),
    Username:username,
    Password_Hash:"SHA256:"+sha256_(password),
    Role:"ADMIN",
    Name:name || username,
    Active:true,
    CreatedAt:now,
    UpdatedAt:now
  });
}
