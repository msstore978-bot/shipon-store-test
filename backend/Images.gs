var Images = {
  upload: function(user,payload) {
    requireRole_(user,["ADMIN","STAFF"]);
    var folderId=getConfig_().driveFolderId;
    if(!folderId) return fail_("DRIVE_NOT_CONFIGURED","DRIVE_FOLDER_ID is not configured.");

    var bytes=Utilities.base64Decode(String(payload.base64||""));
    var mime=clean_(payload.mimeType)||"image/jpeg";
    var name=clean_(payload.fileName)||("image-"+Utilities.getUuid()+".jpg");
    var blob=Utilities.newBlob(bytes,mime,name);
    var file=DriveApp.getFolderById(folderId).createFile(blob);

    return ok_({
      fileId:file.getId(),
      name:file.getName(),
      url:"https://drive.google.com/uc?export=view&id="+file.getId()
    },"Image uploaded.");
  }
};
