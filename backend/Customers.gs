var Customers = {
  list: function(user,payload) {
    var sh=SheetStore.ensureSheet_("Customers", [
      "Cust_ID","Name","Shop_Name","Phone","WhatsApp","Address","NID",
      "Opening_Due","Date","Current_Due","Profile_Pic","Note"
    ]);
    var rows=SheetStore.records_(sh);
    var q=clean_(payload.query).toLowerCase();
    if(q) rows=rows.filter(function(r){
      return [r.Name,r.Shop_Name,r.Phone,r.WhatsApp].some(function(v){
        return String(v||"").toLowerCase().indexOf(q)>=0;
      });
    });
    return ok_(rows.map(normalizeCustomer_));
  },

  get: function(user,payload) {
    var sh=SheetStore.ensureSheet_("Customers", [
      "Cust_ID","Name","Shop_Name","Phone","WhatsApp","Address","NID",
      "Opening_Due","Date","Current_Due","Profile_Pic","Note"
    ]);
    var r=SheetStore.findBy_(sh,"Cust_ID",payload.customerId);
    if(!r) return fail_("NOT_FOUND","Customer not found.");
    return ok_(normalizeCustomer_(r));
  },

  create: function(user,payload) {
    requireRole_(user,["ADMIN","STAFF"]);
    var sh=SheetStore.ensureSheet_("Customers", [
      "Cust_ID","Name","Shop_Name","Phone","WhatsApp","Address","NID",
      "Opening_Due","Date","Current_Due","Profile_Pic","Note"
    ]);
    var id=clean_(payload.customerId)||Utilities.getUuid();
    if(SheetStore.findBy_(sh,"Cust_ID",id)) return fail_("DUPLICATE","Customer ID already exists.");
    var opening=Number(payload.openingDue||0);
    var now=new Date().toISOString();
    SheetStore.append_(sh,{
      Cust_ID:id, Name:clean_(payload.name), Shop_Name:clean_(payload.shopName),
      Phone:clean_(payload.phone), WhatsApp:clean_(payload.whatsapp),
      Address:clean_(payload.address), NID:clean_(payload.nid),
      Opening_Due:opening, Date:payload.date||now, Current_Due:opening,
      Profile_Pic:clean_(payload.profilePic), Note:clean_(payload.note)
    });
    Audit.write_(user,"CUSTOMER_CREATE","Customers",id,{});
    return ok_({customerId:id},"Customer created.");
  },

  update: function(user,payload) {
    requireRole_(user,["ADMIN","STAFF"]);
    var sh=SheetStore.ensureSheet_("Customers", [
      "Cust_ID","Name","Shop_Name","Phone","WhatsApp","Address","NID",
      "Opening_Due","Date","Current_Due","Profile_Pic","Note"
    ]);
    var id=clean_(payload.customerId);
    var patch={};
    ["Name","Shop_Name","Phone","WhatsApp","Address","NID","Profile_Pic","Note"].forEach(function(k){
      var source=k.replace("_","").toLowerCase();
      if(Object.prototype.hasOwnProperty.call(payload,source)) patch[k]=payload[source];
    });
    if(Object.prototype.hasOwnProperty.call(payload,"name")) patch.Name=clean_(payload.name);
    if(Object.prototype.hasOwnProperty.call(payload,"shopName")) patch.Shop_Name=clean_(payload.shopName);
    if(Object.prototype.hasOwnProperty.call(payload,"phone")) patch.Phone=clean_(payload.phone);
    if(Object.prototype.hasOwnProperty.call(payload,"whatsapp")) patch.WhatsApp=clean_(payload.whatsapp);
    if(Object.prototype.hasOwnProperty.call(payload,"address")) patch.Address=clean_(payload.address);
    if(Object.prototype.hasOwnProperty.call(payload,"nid")) patch.NID=clean_(payload.nid);
    if(Object.prototype.hasOwnProperty.call(payload,"profilePic")) patch.Profile_Pic=clean_(payload.profilePic);
    if(Object.prototype.hasOwnProperty.call(payload,"note")) patch.Note=clean_(payload.note);
    SheetStore.updateBy_(sh,"Cust_ID",id,patch);
    Audit.write_(user,"CUSTOMER_UPDATE","Customers",id,patch);
    return ok_({customerId:id},"Customer updated.");
  },

  remove: function(user,payload) {
    requireRole_(user,["ADMIN"]);
    var sh=SheetStore.ensureSheet_("Customers", [
      "Cust_ID","Name","Shop_Name","Phone","WhatsApp","Address","NID",
      "Opening_Due","Date","Current_Due","Profile_Pic","Note"
    ]);
    var id=clean_(payload.customerId);
    SheetStore.deleteBy_(sh,"Cust_ID",id);
    Audit.write_(user,"CUSTOMER_DELETE","Customers",id,{});
    return ok_({customerId:id},"Customer deleted.");
  },

  transactions: function(user,payload) {
    var id=clean_(payload.customerId);
    var out=[];
    var defs=[
      ["Sales","Sale_ID","sale"],
      ["Due_Payments","Payment_ID","payment"],
      ["Due_Add","Due_ID","due"]
    ];
    defs.forEach(function(d){
      var sh=getDb_().getSheetByName(d[0]);
      if(!sh) return;
      SheetStore.records_(sh).forEach(function(r){
        if(String(r.Customer_ID)===id) out.push({type:d[2],record:r});
      });
    });
    out.sort(function(a,b){return new Date(a.record.Date||0)-new Date(b.record.Date||0);});
    return ok_(out);
  }
};

function normalizeCustomer_(r) {
  return {
    id:String(r.Cust_ID||""),
    customerId:String(r.Cust_ID||""),
    name:String(r.Name||""),
    shop:String(r.Shop_Name||""),
    shopName:String(r.Shop_Name||""),
    mobile:String(r.Phone||""),
    phone:String(r.Phone||""),
    whatsapp:String(r.WhatsApp||""),
    address:String(r.Address||""),
    nid:String(r.NID||""),
    openingDue:Number(r.Opening_Due||0),
    date:r.Date instanceof Date ? r.Date.toISOString() : String(r.Date||""),
    currentDue:Number(r.Current_Due||0),
    profilePic:String(r.Profile_Pic||""),
    imageData:"",
    note:String(r.Note||"")
  };
}
