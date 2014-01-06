var buttonappend = "<a class='wikia-button addtoqueue' onclick='addtoqueue(oldName, newName, " + 'multi' + ")'>Add to queue</a>"
//                                                                                            Fix multi
if (document.getElementsByClassName("oldName") || document.getElementsByClassName("newName") == null) {
    fuauModal();
}

function fuauModal() {
    $.showCustomModal("Queue addition", '<form class="WikiaForm" method="" name=""><fieldset><strong>Old file name: </strong><br /><input type="text" id="oldName" placeholder="File:TSAtBarnS3 E5.png" style="width: 500px"></input><br /><strong>New file name: </strong><br /><input type="text" id="newName" placeholder="File:Twilight Sparkle at the barn S3E5.png" style="width: 500px;"></input></feildset></form>', {
        id: "fuau",
        width: 650,
        buttons: [{
            id: "cancel",
            message: "Cancel",
            handler: $('#fuau').closeModal();
        }, {
            id: "submit",
            defaultButton: true,
            message: "Add to queue",
            handler: addtoqueue;
        }]
    }
}

// NEED TO CHECK IF FILE NAME EXISTS ETC!!!

function addtoqueue() {
    var oldImageName = document.getElementsByClassName("oldName").val(),
        newImageName = document.getElementsByClassName("newName").val(),
        reason = text("Using the queue button").val(); //Make a specific reason for this
    LIR.pageKey = [];
processQueue()
}
