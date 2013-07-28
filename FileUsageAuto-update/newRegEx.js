//__NOWYSIWYG__ <source lang="javascript">
//<nowiki>
/**
*
* Description:
* 		Updates file links in use on the wiki when image is renamed.
*
* @Author Foodbandlt
*
**/

// Options processing

if (typeof LIR === "undefined"){

	if (typeof (LIRoptions) !== "undefined"){
		if (typeof (LIRoptions.bottomMessage) === "undefined"){
			LIRoptions.bottomMessage = "";
		}
		
		if (typeof (LIRoptions.editSummary) === "undefined"){
			LIRoptions.editSummary = "Updating file links (automatic)";
		}
		
		if (typeof (LIRoptions.singleButtonText) !== "undefined"){
			if (LIRoptions.singleButtonText == ""){
				LIRoptions.singleButtonText = "Rename and replace";
			}
		}else{
			LIRoptions.singleButtonText = "Rename and replace";
		}
		
		if (typeof (LIRoptions.queueButtonText) !== "undefined"){
			if (LIRoptions.queueButtonText == ""){
				LIRoptions.queueButtonText = "Rename and add to queue";
			}
		}else{
			LIRoptions.queueButtonText = "Rename and add to queue";
		}
	}else{		
		LIRoptions = {
			bottomMessage: "",
			editSummary: 'Updating file links (automatic)',
			singleButtonText: 'Rename and replace',
			queueButtonText: 'Add to queue'
		}
	}

	if (typeof localStorage.LIRQueuedUpdates === "undefined"){
		localStorage.LIRQueuedUpdates = 0;
		localStorage.LIRQueuedUpdatesPos = 1;
	}

	LIR = {
		started: false,
		
		updateStatus: function(gifDisplay, message){
			if (typeof gifDisplay === "string"){
				message = gifDisplay;
			}else if (typeof gifDisplay === "boolean"){
				if (gifDisplay == false){
					displayValue = "none";
				}else{
					displayValue = "inline-block";
				}
				document.getElementById("liveLoader").style.display = displayValue;
			}else{
				return false;
			}
			
			if (typeof message === "string"){
				$("#queueStatus").html(" " + message);
			}
			return true;
		},
		
		start: function(type){
			if (!Storage){
				return false;
			}
			
			/* Checks if function has already started */
			if (LIR.started == true && typeof LIR.queuePosition === "undefined"){
				return false;
			}
			
			/* Checks whether renaming single image or adding to queue */
			if (typeof(type) !== "undefined"){
				if (type == "single"){
					LIR.started = true;
					updateStatus(true, "Processing");
					LIR.type = "single";
				}else if (type == "multi"){
					LIR.started = true;
					
					if (typeof LIR.queuePosition === "undefined"){
						LIR.queuePosition = ++localStorage.LIRQueuedUpdates;
						updateStatus(true);
					}
					
					if (LIR.queuePosition != localStorage.LIRQueuedUpdatesPos){
						updateStatus("Number " + (LIR.queuePosition - localStorage.LIRQueuedUpdatesPos) + " in line to add to queue");
						setTimeout(function(){LIR.start(type);}, 500);
						return false;
					}
					
					updateStatus("Processing");
					LIR.type = "multi";
				}else{
					alert("Incorrect type specified");
					return false;
				}
			}else{
				LIR.started = true;
				updateStatus(true, "Processing");
				LIR.type = "single";
			}
			
			/* Retrieves queue, or resets variables if doesn't exist */
			if (typeof (localStorage[wgUserName + "_LIRQueueData"]) !== "undefined"){
				LIR.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
			}else{
				LIR.queueData = [];
			}

			/* Sets variables used by the function */
			var oldImageName = $('input[name="wpOldTitle"]').val().slice(5),
				newImageName = document.getElementById("wpNewTitleMain").value,
				reason = $("#wpReason").val(),
				current = {
					page: 0,
					content: ""
				}
			LIR.pageKey = [];
			
			/* Checks if old or new file name is currently part of the queue */
			for (i=0; i<LIR.queueData.length; i++){
				if (LIR.queueData[i].newImage == oldImageName || LIR.queueData[i].newImage == newImageName || LIR.queueData[i].oldImage == oldImageName){
					alert("Image is already added to the queue, or the destination image name is already queued to be used by another file.");
					LIR.started = false;
					if (typeof LIR.queuePosition !== "undefined"){
						localStorage.LIRQueuedUpdatesPos++;
						delete LIR.queuePosition;
					}
					updateStatus(false, "");
					return false;
				}
			}
			
			/* Checks if destination file name is valid (since Wikia's server-sided code usually validates this) */
			if (newImageName.slice(-4).search(/\.png/i) == -1 && newImageName.slice(-4).search(/\.jpg/i) == -1 && newImageName.slice(-5).search(/\.jpeg/i) == -1 && newImageName.slice(-4).search(/\.gif/i) == -1 && newImageName.slice(-4).search(/\.svg/i) == -1){
				alert("File name does not contain a valid file extension.  Please add a valid file extension.");
				LIR.started = false;
				if (typeof LIR.queuePosition !== "undefined"){
					localStorage.LIRQueuedUpdatesPos++;
					delete LIR.queuePosition;
				}
				updateStatus(false, "");
				return false;
			}
			
			/* Check if destination file name is in use */
			$.getJSON("/api.php?action=query&prop=revisions&rvprop=content&titles=File:"+encodeURIComponent(newImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27"))+"&format=json", function(result){
				if (typeof result.query.pages[-1] === "undefined"){
					/* If not, then get file usage for image */
					$.getJSON("/api.php?action=query&list=imageusage&iutitle=File:"+encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27"))+"&iulimit=500&format=json", function(result){
						imageUsage = result.query.imageusage;
						if (console) console.log("Image usage successfully retrieved");
						if (imageUsage.length > 0){
						
							/* Resets queue-related variables if only renaming and replacing a single image */
							if (LIR.type == "single"){
								LIR.queueData = [];
								LIR.pageKey = [];
												
								/* Adds pages image is used on to window.LIR.pageKey to help keep track of pages in window.LIR.pageData later on */
								for (current.page = 0; current.page < imageUsage.length; current.page++){
									if (console) console.log("Beginning page "+current.page);
									
									var title = imageUsage[current.page].title;

									if (LIR.pageKey.indexOf(title) == -1){
										LIR.pageKey[LIR.pageKey.length] = title;
									}
									
									/* Temporary until Wikia fixes issue with editing blog comments through the API */
									if (title.search(/User blog comment/i) == -1){
										LIR.queueData[LIR.queueData.length] = {
											oldImage: oldImageName,
											newImage: newImageName,
											title: title,
											reason: reason
										}
									}else{
										LIRBlogComment = true;
									}
								}
							}else{
								for (current.page = 0; current.page < imageUsage.length; current.page++){
									/* Temporary until Wikia fixes issue with editing blog comments through the API */
									if (title.search(/User blog comment/i) != -1){
										LIRBlogComment = true;
									}
								}
							}
							
							/* Temporary until Wikia fixes issue with editing blog comments through the API */
							if (typeof(LIRBlogComment) === "undefined"){
								/* Stores queue if renaming multiple images, or updates file usage if only renaming one */
								if (LIR.type == "multi"){
									LIR.queueData[LIR.queueData.length] = {
										oldImage: oldImageName,
										newImage: newImageName
									}
									
									LIR.storeQueue(function() {
										LIR.started = false;
										localStorage.LIRQueuedUpdatesPos++;
										window.location = "/wiki/File:" + encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27");
									});
								}else{
									/* This may seem odd, but because I use LIR.processQueue() for both single and multiple image 
										updating, it requires LIR.started to be false to start */
									LIR.started = false;
									LIR.processQueue(function(){
										$("#movepage").submit();
									});
								}
							}else{
								if (typeof LIR.queuePosition !== "undefined"){
									localStorage.LIRQueuedUpdatesPos++;
									delete LIR.queuePosition;
								}
								updateStatus(false, "");
								alert("One of pages this image is used on is a blog comment. There is currently a bug with Wikia's API concerning editing blog comments.  Please update the file links manually.");
							}
							

						}else{
							/* Else, prompt to use normal renaming, since this is kind of pointless otherwise */
							alert("Image is not being used on any pages.  Please use the regular rename button.");
							LIR.started = false;
							if (typeof LIR.queuePosition !== "undefined"){
								localStorage.LIRQueuedUpdatesPos++;
								delete LIR.queuePosition;
							}
							updateStatus(false, "");
						}
					});
				}else{
					alert("This desired file name already exists. If you wish to use that file name, please either delete or rename the existing image.");
					LIR.started = false;
					if (typeof LIR.queuePosition !== "undefined"){
						localStorage.LIRQueuedUpdatesPos++;
						delete LIR.queuePosition;
					}
					updateStatus(false, "");
				}
			});
			
		},
		
		getUsage: function(callback, error){
		
		},
		
		storeQueue: function(callback){
			/* Standalone function to store the queue in window.localStorage
				uses wgUserName as a variable key so multi-user computers on the same wiki don't get each other's queue*/
			localStorage[wgUserName + "_LIRQueueData"] = JSON.stringify(LIR.queueData);

			if (typeof(callback) === "function"){
				callback();
			}
			
		},

		/**************************************
		// Process stored queue function chain
		**************************************/
		
		processQueue: function(callback){
			if (localStorage.LIRQueuedUpdates < localStorage.LIRQueuedUpdatesPos && localStorage.LIRQueuedUpdates != 0){
				localStorage.LIRQueuedUpdates = 0;
				localStorage.LIRQueuedUpdatesPos = 1;
			}
			
			/* Check if operation already started */
			if (LIR.started == true){
				return false;
			}
			
			/* LIR.type is already set if processing single update */
			if (typeof(LIR.type) === "undefined"){
				LIR.type = "multi";
			}
			
			/* Variable redeclaration */
			LIR.started = true;
			LIR.requestCompleted  = [];
			LIR.pageData = [];
			
			/* Queue retrieval, returns false if no queue */
			if (LIR.type == "multi" && localStorage.LIRQueuedUpdates == 0){
				if (typeof (localStorage[wgUserName + "_LIRQueueData"]) !== "undefined"){
					LIR.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
					if (console) console.log("Queue retrieved successfully.");
					
					// IMAGE USAGE
					
					
					
				}else{
					if (console) console.log("Queue does not exist or was unable to be retrieved.");
					alert("Queue does not exist or was unable to be retrieved.");
					LIR.started = false;
					return false;
				}
				
				LIR.pagesMoved = [];
				LIR.numPagesMoved = 0;
			}else if (LIR.type == "multi" && localStorage.LIRQueuedUpdates != 0){
				if (console) console.log("Pages still being added to the queue.");
				alert("Pages are still waiting to be added to the queue.  If this is not the case, please use the \"Reset waiting pages\" button to be able to execute the queue.");
				LIR.started = false;
				return false;
			}
			
			if (console) console.log("Begin queue execution");

			//CONTENT
			
		},
		
		submitChangedPages: function(pageKey, callback) {
			
			$.ajax({
				url: "/api.php",
				type: "POST",
				async: true,
				data: {
					action: "edit",
					title: LIR.pageData[pageKey].title,
					summary: LIRoptions.editSummary,
					text: LIR.pageData[pageKey].content,
					minor: true,
					nocreate: true,
					redirect: false,
					bot: true,
					token: mediaWiki.user.tokens.get("editToken")
				},
				contentType: "application/x-www-form-urlencoded",
				error: function(){
					LIR.requestCompleted[pageKey] = true;
					alert("Unable to publish page \""+LIR.pageKey[pageKey]+"\".  Please rename images on that page manually.");
					if (LIR.requestCompleted.indexOf(false) == -1){
						delete localStorage[wgUserName + "_LIRQueueData"];
						LIR.started = false;
						
						if (typeof(callback) === "function"){
							callback();
						}
					}	
				},
				success: function(result){
					LIR.requestCompleted[pageKey] = true;
					if (console) console.log("Posted page \""+LIR.pageKey[pageKey]+"\"");
					if (LIR.type == "multi"){
						$("#LIRProgressInd").css("width", ((++LIR.queueProgress) / LIR.pageKey.length * 100) + "%");
					}
					
					
					if (LIR.requestCompleted.indexOf(false) == -1){
						if (LIR.type == "multi"){
							/* Cleans up localStorage variables */
							delete localStorage[wgUserName + "_LIRQueueData"];
							LIR.started = false;
							$("#LIRQueueProgress").remove();
						}
						/* Call callback if exists */
						if (typeof(callback) === "function"){
							callback();
						}
					}
				}					
			});
		},
		
		moveFile: function(queueKey, callback) {
			
			$.ajax({
				url: "/api.php",
				type: "POST",
				async: true,
				data: {
					action: "move",
					from: LIR.pagesMovedData[queueKey].oldI,
					to: LIR.pagesMovedData[queueKey].newI,
					reason: LIR.pagesMovedData[queueKey].reason,
					movetalk: true,
					noredirect: true,
					ignorewarnings: true,
					token: mediaWiki.user.tokens.get("editToken")
				},
				contentType: "application/x-www-form-urlencoded",
				error: function(){
					alert("Unable to move file \""+LIR.pagesMovedData[queueKey].oldI+"\" to \""+LIR.pagesMovedData[queueKey].newI+"\".  Usages were still updated.  Please rename the image manually.");
					LIR.numPagesMoved++;
					if (typeof(callback) === "function"){
						callback();
					}	
				},
				success: function(result){
					if (typeof result.error === "undefined"){
						if (console) console.log("Moved file \""+LIR.pagesMovedData[queueKey].oldI+"\"");
						LIR.numPagesMoved++;
						/* Call callback if exists */
						if (typeof(callback) === "function"){
							callback();
						}
					}else if (result.error.code == ""){ //NEEDS TO BE FINISHED
						promptResponse = prompt("This file was unable to be renamed for reason: " + + ". \n Please enter another destination name for this file.");
						
						if (promptResponse != null && promptResponse != ""){
							for (i = 0; i < LIR.queueData.length; i++){
								if (LIR.queueData[i].oldImage == LIR.pagesMovedData[queueKey].oldI){
									LIR.queueData[i].newImage = promptResponse;
								}
							}
							LIR.moveFile(queueKey, callback);
						}else{
							for (i = 0; i < LIR.queueData.length; i++){
								if (LIR.queueData[i].oldImage == LIR.pagesMovedData[queueKey].oldI){
									delete LIR.queueData[i];
								}
							}
							alert(LIR.pagesMovedData[queueKey].oldI + " has been removed from the queue");
						}
					}else{
						for (i = 0; i < LIR.queueData.length; i++){
							if (LIR.queueData[i].oldImage == LIR.pagesMovedData[queueKey].oldI){
								delete LIR.queueData[i];
							}
						}
						alert(LIR.pagesMovedData[queueKey].oldI + " has been removed from the queue");
					}
				}	
			});
		},
		
		/**************************************
		// Modal-related functions
		**************************************/
		
		log: function(message){
			if (typeof(LIR.logMessages) === "undefined"){
				LIR.logMessages = "<div style='font-weight: bold'>Queue system started.</div>";
			}
			LIR.logMessages = LIR.logMessages + "<div style='font-weight: bold'>" + message + "</div>";
			
			if ($("#LIRLog").length > 0){
				document.getElementById("LIRLog").innerHTML = LIR.logMessages;
				$("#LIRLog").scrollTop(100000000)
				$("#LIRLog div:odd").css("background-color", "grey");
			}
		},
		
		failedLog: function(oldI, newI, page){
			if (typeof(LIR.logFailed) === "undefined"){
				LIR.logFailed = "";
			}
			LIR.logFailed += "<div><a target='_blank' href='/wiki/File:" + encodeURIComponent(oldI.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + oldI + "</a> --&gt; <a target='_blank' href='/wiki/File:" + encodeURIComponent(newI.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + newI + "</a> on <a target='_blank' href='/wiki/" + encodeURIComponent(page.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + page + "</a></div>";
			
			if ($("#LIRFailedLog").length > 0){
				document.getElementById("LIRFailedLog").innerHTML = LIR.logFailed;
				$("#LIRFailedLog div:odd").css("background-color", "darkred");
			}
		},

		updateQueueListing: function(){
			if (typeof (localStorage[wgUserName + "_LIRQueueData"]) !== "undefined"){
				LIR.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
			}else{
				document.getElementById("LIRQueue").innerHTML = "<div>There is currently nothing in the queue.</div>";
				LIR.log("Queue updated.");
				return false;
			}
			
			LIRCurrentQueueData = LIR.queueData;
			queueToAdd = "";
			
			for (i = 0; i<LIRCurrentQueueData.length; i++){
				queueToAdd += "<div><a target='_blank' href='/wiki/File:" + encodeURIComponent(LIRCurrentQueueData[i].oldImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + LIRCurrentQueueData[i].oldImage + "</a> --&gt; <a target='_blank' href='/wiki/File:" + encodeURIComponent(LIRCurrentQueueData[i].newImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + LIRCurrentQueueData[i].newImage + "</a> on <a target='_blank' href='/wiki/" + encodeURIComponent(LIRCurrentQueueData[i].title.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"'>" + LIRCurrentQueueData[i].title + "</a></div>";
			}
			
			document.getElementById("LIRQueue").innerHTML = queueToAdd;
			$("#LIRQueue div:odd").css("background-color", "lightgrey");
			LIR.log("Queue updated.");
		},

		showQueueModal: function(){
			$.showCustomModal( 
				"Image link updating queue", 
				'<div id="LIRContainer" style="width: 100%;"> <div id="LIRQueue" style="overflow: scroll; width: 580px; height: 300px; float: left; border: 1px solid black; font-weight: bold; background-color: #FFFFFF;"></div> <div id="LIRLog" style="overflow-x: scroll; height: 300px; width: 200px; float: right; background-color: lightgrey; border: 1px solid black;"></div> <div style="clear: both"></div> <div id="LIRFailedLog" style="width: 790px; margin: 5px auto 0px auto; background-color: red; height: 150px; border: 1px solid black; font-weight: bold; overflow: scroll;">Failed items appear here after execution.</div> </div>', 
				{
					id: "optionsWindow",
					width: 800,
					buttons: [
						{
							id: "close",
							message: "Close",
							handler: function () {
								$(".close").click();
							}
						},
						{
							id: "resetCounter",
							message: "Reset waiting pages",
							handler: function () {
								if (confirm("This will reset the list of pages waiting to be added to the queue in-case there was a problem processing a page that's preventing you from executing the queue.  \n\nNote that there are still " + (localStorage.LIRQueuedUpdates - localStorage.LIRQueuedUpdatesPos - 1) + " page(s) waiting to be added to the queue.  If you are absolutely positive that you currently have no pages open that are waiting in line to be processed or a problem has occured that has halted page processing, then press OK to clear the list of waiting pages. \n\nIf you do have any pages waiting to be processed, you will have to reload and resubmit those pages to the queue to add them.")){
									localStorage.LIRQueuedUpdates = 0;
									localStorage.LIRQueuedUpdatesPos = 1;
									alert("List of waiting pages cleared");
								}
							}
						},
						{
							id: "updateButton",
							message: "Refresh",
							handler: function(){
								LIR.updateQueueListing();
							}
						},
						{
							id: "executeButton",
							message: "Execute",
							defaultButton: true,
							handler: function(){
								if (typeof localStorage[wgUserName + "_LIRQueueData"] !== "undefined"){
									LIR.log("Queue execution started.");
									LIR.processQueue(function(){
										LIR.log("Queue executed.");
										LIR.updateQueueListing();
									});
								}else{
									LIR.log("No queue exists to be executed");
								}
							}
						}/*,
						{
							id: "saveQueue",
							defaultButton: true,
							message: "Save",
							handler: function () {
								if (confirm("Save the queue?  These changes can't be undone.")){
								
								}
							}
						}
						*/
					],
					callback: function(){
						$(".blackout, .close").off("click").click(function(){
							if ((LIR.started == false || typeof(LIR.started) === "undefined")){
								delete LIRCurrentQueueData;
								delete LIRCurrentPageKey;
								$("#optionsWindow").remove();
								$(".blackout").fadeOut(function(){
									$(this).remove();
								});
							}
						});
			
						LIR.log("Queue system opened.");
						LIR.updateQueueListing();
					}
				}
			);
		}
	}
		
	if (wgPageName.indexOf("Special:MovePage/File:") != -1){
		LIR.appendButtonText = "<a style='margin-left: 20px;' class='wikia-button' onclick='LIR.start(\"single\")'>" + LIRoptions.singleButtonText + "</a>";
		
		if (Storage){
			LIR.appendButtonText += "<a style='margin-left: 20px;' class='wikia-button' onclick='LIR.start(\"multi\")'>" + LIRoptions.queueButtonText + "</a>";
		}
		
		LIR.appendButtonText += "<span id='liveLoader' style='display:none'><img src='http://slot1.images.wikia.nocookie.net/__cb62004/common/skins/common/progress-wheel.gif' /></span><span id='queueStatus' style='font-weight: bold'></span></span><br /><br /><div style='width: 850px; white-space: normal;'>The <b>\""+LIRoptions.singleButtonText+"\"</b> button updates file usages across pages for a single image, while the <b>\""+LIRoptions.queueButtonText+"\"</b> button adds the file usages of the image to a queue to be updated at one time as a group. When updating file usages using the queue, usages located on like pages are grouped together into one edit, rather than one edit per usage. The queue can be accessed and executed through any file page inside the \"Edit\" drop-down. Please note that a saved queue is local to the computer being used, and does not carry over to other computers.</div>";
		
		if (LIRoptions.bottomMessage != ""){
		LIR.appendButtonText += ('<br /><div style="font-weight: bold; width: 850px; white-space: normal;">' + LIRoptions.bottomMessage + '</div>');
		}
		
		$('td.mw-submit').append(LIR.appendButtonText);
	}
		
	if (wgCanonicalNamespace == "File" && Storage){
		$("#WikiaPageHeader nav ul").append("<li><a onclick='LIR.showQueueModal()'>Queue</a></li>");
		LIR.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
		
		for (var i in LIR.queueData){
			if (LIR.queueData[i].oldImage == wgTitle){
				$("#WikiaPageHeader").after('<div style="width: 80%; margin: 0px auto 10px auto; border: 2px solid lightgreen; background-color: white;"><img src="http://upload.wikimedia.org/wikipedia/commons/b/bd/Checkmark_green.svg" style="height: 40px; float:left; margin: 5px 20px;" /><span style="float: left; word-wrap:break-word; margin-top: 10px; font-size: 14px; padding-bottom: 10px;">This image is currently in your queue to be renamed!<br>New name: <span style="font-weight: bold;">'+LIR.queueData[i].newImage+'</span></span><div style="clear:both;"></div></div>');
				break;
			}
		}
	}
}

//</nowiki>
//</source>
