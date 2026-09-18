var Payments = {
  create: function(user,payload) {
    requireRole_(user,["ADMIN","STAFF"]);
    var sh=SheetStore.ensureSheet_("Due_Payments",[
      "Payment_ID","Date","Customer_ID","Previous_Due","Discount",
      "Final_Payable","Paid_Amount","Payment_Method","Remaining_Due"
    ]);
    var id=clean_(payload.paymentId)||Utilities.getUuid();
    if(SheetStore.findBy_(sh,"Payment_ID",id)) return ok_({paymentId:id,duplicate:true},"Payment already exists.");

    var csh=SheetStore.ensureSheet_("Customers",[
      "Cust_ID","Name","Shop_Name","Phone","WhatsApp","Address","NID",
      "Opening_Due","Date","Current_Due","Profile_Pic","Note"
    ]);
    var customer=SheetStore.findBy_(csh,"Cust_ID",payload.customerId);
    if(!customer) return fail_("CUSTOMER_NOT_FOUND","Customer not found.");

    var previous=Number(customer.Current_Due||0);
    var discount=Number(payload.discount||0);
    var finalPayable=Math.max(0,previous-discount);
    var paid=Math.max(0,Number(payload.paidAmount||0));
    var remaining=Math.max(0,finalPayable-paid);

    SheetStore.append_(sh,{
      Payment_ID:id, Date:payload.date||new Date().toISOString(),
      Customer_ID:clean_(payload.customerId), Previous_Due:previous,
      Discount:discount, Final_Payable:finalPayable, Paid_Amount:paid,
      Payment_Method:clean_(payload.paymentMethod), Remaining_Due:remaining
    });

    SheetStore.updateBy_(csh,"Cust_ID",payload.customerId,{Current_Due:remaining});
    Audit.write_(user,"PAYMENT_CREATE","Due_Payments",id,payload);
    return ok_({paymentId:id,remainingDue:remaining},"Payment recorded.");
  }
};
