LIR = {}
LIR.addToQueueButton = function(buttonId) {
	LIR.start("multi", $("#" + buttonId).attr("data-fuau-from"), $("#" + buttonId).attr("data-fuau-to"), "Test Reason");
    console.log( decodeURIComponent( $("#" + buttonId).attr("data-fuau-from") ) );
    console.log( decodeURIComponent( $("#" + buttonId).attr("data-fuau-to") ) );
    console.log("Using the queue button"); //Not sure if this is right
}

var buttonIndex = 0;
$(".fuau").each(function(){
	$(this).html("<a class='wikia-button' id='fuau-button-" + buttonIndex + "' data-fuau-from='" + $(this).attr('data-fuau-from') + "' data-fuau-to='" + $(this).attr('data-fuau-to') + "' onclick='LIR.addToQueueButton(\"fuau-button-" + buttonIndex++ + "\")'>Add to queue</a>");
});
	
if (document.getElementsByClassName("oldName") || document.getElementsByClassName("newName") == null) {
    fuauModal();
}

function fuauModal() {
    $.showCustomModal(
		"Queue addition",
		'<fieldset><strong>Old file name: </strong><br /><input type="text" id="oldName" placeholder="File:TSAtBarnS3 E5.png" style="width: 500px"></input><br /><strong>New file name: </strong><br /><input type="text" id="newName" placeholder="File:Twilight Sparkle at the barn S3E5.png" style="width: 500px;"></input></feildset>',
		{
			id: "fuauModal",
			width: 650,
			buttons: [
				{
					id: "cancel",
					message: "Cancel",
					handler: function(){
						$(".close").click();
					}
				},
				{
					id: "submit",
					defaultButton: true,
					message: "Add to queue"
					//handler: addtoqueue
				}
			],
			callback: function(){
				$(".blackout, .close").off("click").click(function(){
						$("#fuauModal").remove();
						$(".blackout").fadeOut(function(){
							$(this).remove();
						});
				});
			}
		}
	);
}

// NEED TO CHECK IF FILE NAME EXISTS ETC!!!

