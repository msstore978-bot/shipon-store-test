var Audit = {
  write_: function(user,action,module,recordId,details) {
    var sh=SheetStore.ensureSheet_("AuditLog",[
      "Audit_ID","Date","User_ID","Username","Role","Action","Module","Record_ID","Details"
    ]);
    SheetStore.append_(sh,{
      Audit_ID:Utilities.getUuid(),
      Date:new Date().toISOString(),
      User_ID:user.userId,Username:user.username,Role:user.role,
      Action:action,Module:module,Record_ID:recordId,
      Details:JSON.stringify(details||{})
    });
  },

  list: function(user,payload) {
    requireRole_(user,["ADMIN"]);
    var sh=SheetStore.ensureSheet_("AuditLog",[
      "Audit_ID","Date","User_ID","Username","Role","Action","Module","Record_ID","Details"
    ]);
    return ok_(SheetStore.records_(sh));
  }
};
