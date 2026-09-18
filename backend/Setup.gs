function setupOfflineBackend(){var sheets={
 'Users':['User_ID','Username','Password_Hash','Role','Name','Active','CreatedAt','UpdatedAt'],
 'Customers':['Cust_ID','Name','Shop_Name','Phone','WhatsApp','Address','NID','Opening_Due','Date','Current_Due','Profile_Pic','Note'],
 'Customer_Transactions':['Transaction_ID','Customer_ID','Type','Date','Bill','Payment','Remaining_Due','Reference','Method','Note','CreatedAt','UpdatedAt'],
 'Sales':['Sale_ID','Date','Customer_ID','Invoice_No','Subtotal','Discount','Commission','Total_Bill','Previous_Due','Total_Payable','Paid_Amount','Payment_Method','New_Due','Invoice_Img','Cost_Of_Goods','CreatedAt','UpdatedAt','User_ID','Version'],
 'Sale_Items':['Sale_Item_ID','Sale_ID','Product_ID','Quantity','Unit_Price','Unit_Cost','Line_Total','CreatedAt'],
 'Products':['Product_ID','Product_Code','Name','SKU','Category','Unit','Purchase_Price','Selling_Price','Opening_Stock','Current_Stock','Low_Stock_Level','Barcode','Barcode_Format','Image_ID','Active','CreatedAt','UpdatedAt','Version'],
 'Purchases':['Purchase_ID','Date','Supplier_ID','Invoice_No','Subtotal','Discount','Total','Paid_Amount','Due_Amount','Payment_Method','Note','CreatedAt','UpdatedAt','User_ID','Version'],
 'Purchase_Items':['Purchase_Item_ID','Purchase_ID','Product_ID','Quantity','Unit_Cost','Line_Total','CreatedAt'],
 'Suppliers':['Supplier_ID','Name','Shop_Name','Phone','WhatsApp','Address','Opening_Due','Current_Due','Note','Active','CreatedAt','UpdatedAt','Version'],
 'Supplier_Transactions':['Transaction_ID','Supplier_ID','Type','Date','Reference','Bill','Previous_Due','Payment','Discount','Remaining_Due','Method','Note','CreatedAt','UpdatedAt','User_ID'],
 'Expenses':['Expense_ID','Date','Category','Description','Amount','Payment_Method','Note','CreatedAt','UpdatedAt','User_ID','Version'],
 'Stock_Ledger':['Ledger_ID','Product_ID','Type','Quantity','Stock_Before','Stock_After','Reference','Unit_Cost','Date','CreatedAt','UpdatedAt','User_ID'],
 'Due_Add':['Due_ID','Date','Customer_ID','Amount','Note','Created_By'],
 'Due_Payments':['Payment_ID','Date','Customer_ID','Previous_Due','Discount','Final_Payable','Paid_Amount','Payment_Method','Remaining_Due'],
 'Reminders':['Reminder_ID','Customer_ID','Date','Time','Enabled','Status','Message','CreatedAt','UpdatedAt'],
 'AuditLog':['Audit_ID','Date','User_ID','Username','Role','Action','Module','Record_ID','Details'],
 'SyncLog':['Sync_ID','Date','Device_ID','Action','Entity','Record_ID','Status','Error'],
 'Sync_Mutations':['Mutation_ID','Entity','Operation','User_ID','CreatedAt','Result_JSON']
};Object.keys(sheets).forEach(function(n){SheetStore.ensureSheet_(n,sheets[n]);});return 'Phase 8 backend setup complete.';}
function setBackendProperties(spreadsheetId,driveFolderId,appName){PropertiesService.getScriptProperties().setProperties({SPREADSHEET_ID:spreadsheetId,DRIVE_FOLDER_ID:driveFolderId||'',APP_NAME:appName||'Shipon Store',TIMEZONE:'Asia/Dhaka'},true);}
