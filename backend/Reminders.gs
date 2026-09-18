var Reminders = {
  get: function(user,payload) {
    var sh=SheetStore.ensureSheet_("Reminders",[
      "Reminder_ID","Customer_ID","Date","Time","Enabled","Status",
      "Message","CreatedAt","UpdatedAt"
    ]);
    var rows=SheetStore.records_(sh);
    if(payload.customerId) rows=rows.filter(function(r){return String(r.Customer_ID)===String(payload.customerId);});
    return ok_(rows);
  },

  save: function(user,payload) {
    requireRole_(user,["ADMIN","STAFF"]);
    var sh=SheetStore.ensureSheet_("Reminders",[
      "Reminder_ID","Customer_ID","Date","Time","Enabled","Status",
      "Message","CreatedAt","UpdatedAt"
    ]);
    var id=clean_(payload.reminderId)||Utilities.getUuid();
    var now=new Date().toISOString();
    var existing=SheetStore.findBy_(sh,"Reminder_ID",id);
    var obj={
      Reminder_ID:id,Customer_ID:clean_(payload.customerId),Date:clean_(payload.date),
      Time:clean_(payload.time),Enabled:payload.enabled!==false,Status:clean_(payload.status)||"PENDING",
      Message:clean_(payload.message),CreatedAt:existing ? existing.CreatedAt : now,UpdatedAt:now
    };
    if(existing) SheetStore.updateBy_(sh,"Reminder_ID",id,obj); else SheetStore.append_(sh,obj);
    return ok_({reminderId:id},"Reminder saved.");
  },

  disable: function(user,payload) {
    requireRole_(user,["ADMIN","STAFF"]);
    var sh=SheetStore.ensureSheet_("Reminders",[
      "Reminder_ID","Customer_ID","Date","Time","Enabled","Status",
      "Message","CreatedAt","UpdatedAt"
    ]);
    SheetStore.updateBy_(sh,"Reminder_ID",payload.reminderId,{Enabled:false,Status:"CANCELLED",UpdatedAt:new Date().toISOString()});
    return ok_({reminderId:payload.reminderId},"Reminder disabled.");
  }
};
