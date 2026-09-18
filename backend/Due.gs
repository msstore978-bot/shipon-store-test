var Due = {
  create: function(user,payload) {
    requireRole_(user,["ADMIN","STAFF"]);
    var sh=SheetStore.ensureSheet_("Due_Add",[
      "Due_ID","Date","Customer_ID","Amount","Note","Created_By"
    ]);
    var id=clean_(payload.dueId)||Utilities.getUuid();
    if(SheetStore.findBy_(sh,"Due_ID",id)) return ok_({dueId:id,duplicate:true},"Due already exists.");

    var csh=SheetStore.ensureSheet_("Customers",[
      "Cust_ID","Name","Shop_Name","Phone","WhatsApp","Address","NID",
      "Opening_Due","Date","Current_Due","Profile_Pic","Note"
    ]);
    var customer=SheetStore.findBy_(csh,"Cust_ID",payload.customerId);
    if(!customer) return fail_("CUSTOMER_NOT_FOUND","Customer not found.");

    var amount=Number(payload.amount||0);
    var current=Number(customer.Current_Due||0);
    var next=current+amount;

    SheetStore.append_(sh,{
      Due_ID:id,Date:payload.date||new Date().toISOString(),
      Customer_ID:clean_(payload.customerId),Amount:amount,
      Note:clean_(payload.note),Created_By:user.username
    });
    SheetStore.updateBy_(csh,"Cust_ID",payload.customerId,{Current_Due:next});
    Audit.write_(user,"DUE_CREATE","Due_Add",id,payload);
    return ok_({dueId:id,newDue:next},"Due added.");
  }
};
