//__NOWYSIWYG__ <source lang="javascript">
//<nowiki>
/**
*
* Description:
* Updates page links in use on the wiki when image is renamed.
*
* @Author Foodbandlt
* Last updated 10th April, 2014
**/

// Options processing

if (typeof PRAoptions !== "undefined"){
	if (typeof (PRAoptions.bottomMessage) === "undefined"){
		PRAoptions.bottomMessage = "";
	}
	
	if (typeof PRAoptions.editSummary === "undefined"){
		PRAoptions.editSummary = "Updating file links (automatic)";
	}

	if (typeof PRAoptions.singleButtonText !== "undefined"){
		if (PRAoptions.singleButtonText === ""){
			PRAoptions.singleButtonText = "Rename and replace";
		}
	}else{
		PRAoptions.singleButtonText = "Rename and replace";
	}
	
	if (typeof PRAoptions.queueButtonText !== "undefined"){
		if (PRAoptions.queueButtonText === "" || PRAoptions.queueButtonText === "Rename and add to queue"){
			PRAoptions.queueButtonText = "Add to queue";
		}
	}else{
		PRAoptions.queueButtonText = "Add to queue";
	}
}else{	
	PRAoptions = {
		bottomMessage: "",
		editSummary: 'Updating file links (automatic)',
		singleButtonText: 'Rename and replace',
		queueButtonText: 'Add to queue'
	};
}
	
if (typeof PRA === "undefined"){

	if (typeof localStorage.PRAQueuedUpdates === "undefined"){
		localStorage.PRAQueuedUpdates = 0;
		localStorage.PRAQueuedUpdatesPos = 1;
	}
	
	if (typeof localStorage[wgUserName + "_PRANamespaceSelection"] === "undefined"){
		localStorage[wgUserName + "_PRANamespaceSelection"] = "";
	}

	PRA = {

		started: false,
		
		updateStatus: function(gifDisplay, message){
			if ($("#queueStatus").length == 0) return false;
		
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
		
		start: function(oldName, newName, reason, callback){
			
			/* Checks if function has already started */
			if (PRA.started == true){
				return false;
			}
			
			PRA.started = true;
			PRA.updateStatus(true, PRA.getMessage("process"));

			/* Sets variables used by the function */
			if (typeof oldName != "undefined" && typeof newName != "undefined"){
				var oldImageName = oldName,
					newImageName = newName;
					if (typeof reason == "undefined") var reason = "";
			}
			
			PRA.pageKey = [];			

			/* Check if destination file name is in use */
			$.getJSON("/api.php?action=query&prop=revisions&rvprop=content&titles="+encodeURIComponent(newImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"&format=json", function(result){
				if (typeof result.query.pages[-1] !== "undefined"){
					
					$.getJSON("/api.php?action=query&list=backlinks&bltitle=" + encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "&format=json", function(result){
						var pageLinks = result.query.backlinks;
						
						if (console) console.log("Usage successfully retrieved");
						if (pageLinks.length > 0){
						
							PRA.queueData = [];
							PRA.queueDataList = [];
							PRA.pageKey = [];
							
							for (var currentPage = 0; currentPage < pageUsage.length; currentPage++){
								var title = pageUsage[currentPage].title;
								/* Temporary until Wikia fixes issue with editing blog comments through the API */
								if (title.search(/User blog comment/i) != -1){
									var PRABlogComment = true;
								}
							}
							
							PRA.queueDataList.push({
								oldImage: oldImageName,
								newImage: newImageName,
								reason: reason
							});
							
							/* Temporary until Wikia fixes issue with editing blog comments through the API */
							if (typeof(PRABlogComment) === "undefined"){
								PRA.started = false;
								PRA.processQueue(function(){
									window.location = "/wiki/File:" + encodeURIComponent(newImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27");
								});
							}else{
								PRA.updateStatus(false, PRA.getMessage("blogcomment"));
								if (typeof(callback) === "function"){
									callback(false, "blogcomment");
								}
							}
							

						}else{
							/* Else, prompt to use normal renaming, since this is kind of pointless otherwise */
							PRA.started = false;
							PRA.updateStatus(false, PRA.getMessage("filenotused"));
							if (typeof(callback) === "function"){
								callback(false, "filenotused");
							}
						}
					});
				}else{
					PRA.started = false;
					if (typeof PRA.queuePosition !== "undefined"){
						localStorage.PRAQueuedUpdatesPos++;
						delete PRA.queuePosition;
					}
					PRA.updateStatus(false, PRA.getMessage("destinuse"));
					if (typeof(callback) === "function"){
						callback(false, "destinuse");
					}
				}
			});
			
		},

		/**************************************
		// Processing-related functions
		**************************************/
		
		getUsage: function(index, callback){
			$.getJSON("/api.php?action=query&list=imageusage&iutitle=File:"+encodeURIComponent(PRA.queueDataList[index].oldImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"&iulimit=5000&format=json", function(result){
				var imageUsage = result.query.imageusage;

				$.getJSON("/api.php?action=query" + namespaceSelection + "&bllimit=5000&list=backlinks&bltitle=File:" + encodeURIComponent(PRA.queueDataList[index].oldImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "&format=json", function(result){
					var imageLinks = result.query.backlinks;
					var totalImageUsage = imageUsage.concat(imageLinks);

					if (console) console.log("Image usage successfully retrieved");

					/* Adds pages image is used on to window.PRA.pageKey to help keep track of pages in window.PRA.pageData later on */
					for (var currentPage = 0; currentPage < totalImageUsage.length; currentPage++){
						var title = totalImageUsage[currentPage].title;

						if (PRA.pageKey.indexOf(title) == -1){
							PRA.pageKey[PRA.pageKey.length] = title;
						}

						for (i = 0; i <= PRA.queueData.length; i++){
							if (i == PRA.queueData.length){
								PRA.queueData[PRA.queueData.length] = {
									oldImage: PRA.queueDataList[index].oldImage,
									newImage: PRA.queueDataList[index].newImage,
									title: title
								};
								break;
							}else if (PRA.queueData[i].title == title && PRA.queueData[i].oldImage == PRA.queueDataList[index].oldImage && PRA.queueData[i].newImage == PRA.queueDataList[index].newImage){
								break;
							}
						}
					}

					if (typeof(callback) === "function"){
						callback();
					}
				});
			});
		},
		
		processQueue: function(callback){
			if (localStorage.PRAQueuedUpdates < localStorage.PRAQueuedUpdatesPos && localStorage.PRAQueuedUpdates != 0){
				localStorage.PRAQueuedUpdates = 0;
				localStorage.PRAQueuedUpdatesPos = 1;
			}

			/* Check if operation already started */
			if (PRA.started == true){
				return false;
			}

			/* PRA.type is already set if processing single update */
			if (typeof(PRA.instances[0].type) === "undefined"){
				PRA.instances[0].type = "multi";
			}

			/* Variable redeclaration */
			PRA.started = true;
			PRA.requestCompleted  = [];
			PRA.pageData = [];

			/* Queue retrieval, returns false if no queue */
			if ( (PRA.instances[0].type == "multi" && localStorage.PRAQueuedUpdates == 0) || PRA.instances[0].type == "single"){
				if (typeof (localStorage[wgUserName + "_PRAQueueData"]) !== "undefined" || PRA.instances[0].type == "single"){
					if (PRA.instances[0].type == "multi"){
						PRA.queueDataList = JSON.parse(localStorage[wgUserName + "_PRAQueueData"]);
						if (console) console.log("Queue retrieved successfully.");
					}else{
						PRA.queueDataList = PRA.instances[0].queueDataList;
					}

					PRA.usageRequested = 0;
					PRA.usageProgress = 0;
					PRA.moveRequested = PRA.queueDataList.length;
					PRA.moveProgress = 0;
					PRA.queueData = [];
					PRA.pageKey = [];

					for (var index in PRA.queueDataList){
						PRA.moveFile(index, function(index){
							PRA.moveProgress++;
							PRA.usageRequested++;
							PRA.getUsage(index, function(){
								PRA.usageProgress++;
								if (PRA.moveProgress == PRA.moveRequested && PRA.usageProgress == PRA.usageRequested){
									PRA.processPageContent(callback);
								}
							});
						},
						function(callback){
							PRA.moveProgress++;

							if (PRA.moveProgress == PRA.moveRequested && PRA.usageProgress == PRA.usageRequested){
								PRA.processPageContent(callback);
							}
						});
					}
				}else{
					if (console) console.log("Queue does not exist or was unable to be retrieved.");
					PRA.started = false;
					return false;
				}


			}else if (PRA.instances[0].type == "multi" && localStorage.PRAQueuedUpdates != 0){
				if (console) console.log("Pages are still being added to the queue.");
				alert("Pages are still waiting to be added to the queue.  If this is not the case, please use the \"Reset waiting pages\" button to be able to execute the queue.");
				PRA.started = false;
				return false;
			}else if (PRA.instances[0].type == "single"){
				PRA.processPageContent(callback);
			}
		},

		processPageContent: function(callback) {
			if (console) console.log("Begin queue execution");

			/* Sets progress checking variables */
			for (i = 0; i<PRA.pageKey.length; i++){
				PRA.requestCompleted[i] = false;
			}
			var pageDataRetrieved = 0;

			if (console) console.log("Getting page contents");


			for (var j = 0; j < (Math.floor(PRA.pageKey.length/500)+1); j++){
				var tempArray = [];

				for (var k = (j * 500); k < (j * 500) + 500; k++){
					if (k == PRA.pageKey.length){
						break;
					}

					tempArray.push( PRA.pageKey[k] );
				}
				
			/* Calls API for page contents */
				$.post(
					"/api.php",
					{
						action: "query",
						prop: "revisions",
						rvprop: "content",
						titles: tempArray.join("|"),
						format: "json"
					},
					function(result){
						/* Saves page contents for each page in PRA.pageData */
						for (var i in result.query.pages){
							var keyNum = PRA.pageKey.indexOf(result.query.pages[i].title);
							PRA.pageData[keyNum] = {
								title: PRA.pageKey[keyNum],
								content: result.query.pages[i].revisions[0]["*"],
								changed: false
							};
							pageDataRetrieved++;
						}

						if (pageDataRetrieved == PRA.pageKey.length){
							if (console) console.log("Page contents retrieved and saved");
							PRA.log("Page contents retrieved and saved");

							if (console) console.log("Begin processing page content.");

							/* Replacing image name on each page */
							for (i=0; i<PRA.queueData.length; i++){
								var pageKey = PRA.pageKey.indexOf(PRA.queueData[i].title);
								var escapedName0 = window.PRA.queueData[i].oldImage.replace(/\*/g, "\\*").replace(/\?/g, "\\?").replace(/\./g, "\\.").replace(/( |_)/g, "[ _]*?").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\+/g, "\\+");

								if ( escapedName0.substr(0,1).match(/[A-z]/i) ){
									var escapedName = "[" + escapedName0.substr(0,1).toUpperCase() + escapedName0.substr(0,1).toLowerCase() + "]" + escapedName0.substr(1);
								}else{
									var escapedName = escapedName0;
								}

								var pageReplacement = new RegExp("(\\n[ ]*?|:?File:[ ]*?|:?Image:[ ]*?|:?Video:[ ]*?|=[ ]*?|\\|)" + escapedName + "(.*?\\n|[ ]*?\\||\\]|\\}|\\{|\\[)", "g");
								var replacementReg = new RegExp(escapedName, "g");

								if (PRA.pageData[pageKey].content.search(pageReplacement) != -1){
									PRA.pageData[pageKey].changed = true;
									if (console) console.log("\""+PRA.queueData[i].oldImage+"\" replaced on page \""+PRA.queueData[i].title+"\"");

									while ((regExec = pageReplacement.exec(PRA.pageData[pageKey].content)) != null){
										PRA.pageData[pageKey].content = PRA.pageData[pageKey].content.replace(regExec[0], regExec[0].replace(replacementReg, PRA.queueData[i].newImage));
										pageReplacement.lastIndex += (regExec[0].replace(replacementReg, PRA.queueData[i].newImage).length - regExec[0].length) - (regExec[2].length);
									}
								}else{
									if (PRA.instances[0].type == "multi"){
										PRA.failedLog(PRA.queueData[i].oldImage, PRA.queueData[i].newImage, PRA.queueData[i].title);
									}else{
										alert("Unable to find \""+PRA.queueData[i].oldImage+"\" on page \""+PRA.queueData[i].title+"\"; it may be transcluded through a template. Please check and rename manually if needed.");
									}
								}
							}

							PRA.log("Submitting page content");
							if (console) console.log("Begin submitting pages");

							/* Adds progress bar for page submission (since this is the longest part and something entertaining needs to happen) */
							if (PRA.instances[0].type == "multi"){
								$(".modalToolbar").prepend("<div id='PRAQueueProgress' style='float: left; width: 200px; border: 2px solid black; height: 17px;'><div id='PRAProgressInd' style='width: 0%; height: 100%; float: left; background-color: green;'></div></div>");
								PRA.queueProgress = 0;
							}

							var l = 0;

							var throttle = setInterval(function(){
								if (PRA.pageData[l].changed == true){
									PRA.submitChangedPages(l, callback);
								}else{
									PRA.requestCompleted[l] = true;
								}

								l++;

								if (l == PRA.pageData.length){
									clearInterval(throttle);
								}
							}, 500);
						}else if (k == PRA.pageKey.length && pageDataRetrieved != PRA.pageKey.length){
							if(console) console.log("There was a problem retrieving one or more pages. Retrieved " + PRA.pageData.length + " of " + PRA.pageKey.length + " pages");  
						}
					},
					"json"
				);
			}
		},

		submitChangedPages: function(pageKey, callback) {

			$.ajax({
				url: "/api.php",
				type: "POST",
				async: true,
				data: {
					action: "edit",
					title: PRA.pageData[pageKey].title,
					summary: PRAoptions.editSummary,
					text: PRA.pageData[pageKey].content,
					minor: true,
					nocreate: true,
					redirect: false,
					bot: true,
					token: mediaWiki.user.tokens.get("editToken"),
					format: "json"
				},
				contentType: "application/x-www-form-urlencoded",
				error: function(){
					PRA.requestCompleted[pageKey] = true;
					alert("Unable to publish page \""+PRA.pageKey[pageKey]+"\".  Please rename images on that page manually.");
					if (PRA.requestCompleted.indexOf(false) == -1){
						delete localStorage[wgUserName + "_PRAQueueData"];
						PRA.started = false;

						if (typeof(callback) === "function"){
							callback();
						}
					}	
				},
				success: function(result){
					PRA.requestCompleted[pageKey] = true;
					if (console) console.log("Posted page \""+PRA.pageKey[pageKey]+"\"");
					if (PRA.instances[0].type == "multi"){
						$("#PRAProgressInd").css("width", ((++PRA.queueProgress) / PRA.pageKey.length * 100) + "%");

						if (typeof result.error !== "undefined"){
							alert("The page \"" + PRA.pageData[pageKey].title + "\" could not be submitted because of error code:\"" + result.error.code + "\". Please update the link(s) listed below on that page manually.");

							for (var i in PRA.queueData){
								if (PRA.queueData[i].title === PRA.pageData[pageKey].title){
									PRA.failedLog(PRA.queueData[i].oldImage, PRA.queueData[i].newImage, PRA.queueData[i].title);
								}
							}
						}
					}else{
						if (typeof result.error !== "undefined"){
							alert("The page \"" + PRA.pageData[pageKey].title + "\" could not be submitted because of error code:\"" + result.error.code + "\". Please update the link(s) on that page manually.");
						}
					}


					if (PRA.requestCompleted.indexOf(false) == -1){
						if (PRA.instances[0].type == "multi"){
							/* Cleans up localStorage variables */
							delete localStorage[wgUserName + "_PRAQueueData"];
							PRA.started = false;
							$("#PRAQueueProgress").remove();
						}
						/* Call callback if exists */
						if (typeof(callback) === "function"){
							callback();
						}
					}
				}					
			});
		},

		moveFile: function(index, callback, failure) {

			$.ajax({
				url: "/api.php",
				type: "POST",
				async: true,
				data: {
					action: "move",
					from: "File:" + PRA.queueDataList[index].oldImage,
					to: "File:" + PRA.queueDataList[index].newImage,
					reason: PRA.queueDataList[index].reason,
					movetalk: true,
					noredirect: true,
					ignorewarnings: true,
					token: mediaWiki.user.tokens.get("editToken"),
					format: "json"
				},
				contentType: "application/x-www-form-urlencoded",
				error: function(){
					alert("Unable to move file \"" + PRA.queueDataList[index].oldImage + "\" to \"" + PRA.queueDataList[index].newImage + "\".");
				},
				success: function(result){
					if (typeof result.error === "undefined"){
						if (console) console.log("Moved file \"" + PRA.queueDataList[index].oldImage + "\"");

						/* Call callback if exists */
						if (typeof(callback) === "function"){
							callback(index);
						}
					}else if (result.error.code == "articleexists" || result.error.code == "invalidtitle"){
						var promptResponse = prompt("The file \"" + PRA.queueDataList[index].oldImage + "\" was unable to be moved to \"" + PRA.queueDataList[index].newImage + "\" for reason: " + result.error.code + ". \n Please enter another destination name for this file.");

						if (promptResponse != null && promptResponse != ""){
							PRA.queueDataList[index].newImage = promptResponse;
							PRA.moveFile(index, callback, failure);
						}else{
							alert(PRA.queueDataList[index].oldImage + " has been removed from the queue.");

							if (PRA.queueDataList.length == 1){
								delete localStorage[wgUserName + "_PRAQueueData"];
								PRA.started = false;
								PRA.log("Queue execution completed");
								PRA.updateQueueListing();
							}else{
								delete PRA.queueDataList[index];

								failure();
							}
						}
					}else{
						alert("The file \"" + PRA.queueDataList[index].oldImage + "\" was unable to be moved to \"" + PRA.queueDataList[index].newImage + "\" for reason: " + result.error.code + ".\n\"" + PRA.queueDataList[index].oldImage + "\" has been removed from the queue.");

						if (PRA.queueDataList.length == 1){
							delete localStorage[wgUserName + "_PRAQueueData"];
							PRA.started = false;
							PRA.log("Queue execution completed");
							PRA.updateQueueListing();
						}else{
							delete PRA.queueDataList[index];

							failure();
						}
					}
				}
			});
		},

		removeFromQueue: function(queueOldName){
			PRA.instances[0].queueData = JSON.parse(localStorage[wgUserName + "_PRAQueueData"]);

			PRA.instances[0].queueData.splice(queueOldName, 1);

			if (PRA.instances[0].queueData.length > 0){
				PRA.instances[0].storeQueue(function(){
					$("#PRANotification").slideUp("fast", function(){this.remove();});
				});
			}else{
				delete localStorage[wgUserName + "_PRAQueueData"];
				$("#PRANotification").slideUp("fast", function(){this.remove();});
			}
		},

		/**************************************
		// Modal-related functions
		**************************************/

		log: function(message){
			if (typeof PRA.logMessages === "undefined"){
				PRA.logMessages = "";
			}

			PRA.logMessages = PRA.logMessages + "<div style='font-weight: bold'>" + message + "</div>";

			if ($("#PRALog").length > 0){
				document.getElementById("PRALog").innerHTML = PRA.logMessages;
				$("#PRALog").scrollTop(100000000)
				$("#PRALog div:odd").css("background-color", "grey");
			}
		},
		
		getMessage: function(message, number){
			switch (message){
				case "":
					break;
				case "nameinuse":
					return "Destination name is already queued to be used or is currently in use.";
				case "alreadyinqueue":
					return "File already added to queue.";
				case "invalidextension":
					return "Invalid file extension."
				case "blogcomment":
					return "File used in blog comment. Unable to update blog comments.";
				case "filenotused":
					return "File not being used on any pages.";
				case "destinuse":
					return "Destination name already in use.";
				case "process":
					return "Processing...";
				case "success":
					return "Successful.";
				case "varsundef":
					return "Variables undefined, check code.";
				case "waitlist":
					return "Number " + number + " on wait list";
				case "queueupdate":
					return "Queue updated.";
				case "nothinginqueue":
					return "There is currently nothing in the queue.";
				case "trydiffname":
					return "Please enter a file name.";
				case "toundef":
					return "The \"To\" variable is not set.";
			}
		},

		failedLog: function(oldI, newI, page){
			if (typeof(PRA.logFailed) === "undefined"){
				PRA.logFailed = "";
			}
			PRA.logFailed += "<div><a target='_blank' href='/wiki/File:" + encodeURIComponent(oldI.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + oldI + "</a> --&gt; <a target='_blank' href='/wiki/File:" + encodeURIComponent(newI.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + newI + "</a> on <a target='_blank' href='/wiki/" + encodeURIComponent(page.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + page + "</a></div>";

			if ($("#PRAFailedLog").length > 0){
				document.getElementById("PRAFailedLog").innerHTML = PRA.logFailed;
				$("#PRAFailedLog div:odd").css("background-color", "darkred");
			}
		},

		updateQueueListing: function(){
			if (typeof (localStorage[wgUserName + "_PRAQueueData"]) !== "undefined"){
				PRA.queueData = JSON.parse(localStorage[wgUserName + "_PRAQueueData"]);
			}else{
				document.getElementById("PRAQueue").innerHTML = "<div>" + PRA.getMessage("nothinginqueue") + "</div>";
				document.getElementById("PRAQueueLengthBox").innerHTML = "0";
				PRA.log( PRA.getMessage("queueupdate") );
				return false;
			}

			var PRACurrentQueueData = PRA.queueData;
			var queueToAdd = "";

			for (i = 0; i<PRACurrentQueueData.length; i++){
				queueToAdd += "<div><a target='_blank' href='/wiki/File:" + encodeURIComponent(PRACurrentQueueData[i].oldImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + PRACurrentQueueData[i].oldImage + "</a> --&gt; <a target='_blank' href='/wiki/File:" + encodeURIComponent(PRACurrentQueueData[i].newImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + PRACurrentQueueData[i].newImage + "</a></div>";
			}

			document.getElementById("PRAQueue").innerHTML = queueToAdd;
			document.getElementById("PRAQueueLengthBox").innerHTML = PRA.queueData.length;
			$("#PRAQueue div:odd").css("background-color", "lightgrey");
			PRA.log( PRA.getMessage("queueupdate") );
		},

		updateNamespaceSelection: function(){
			if (document.getElementById("PRANamespaceToggleCheck").checked == true){
				localStorage[wgUserName + "_PRANamespaceSelection"] = "checked";
			}else{
				localStorage[wgUserName + "_PRANamespaceSelection"] = "";
			}
		},

		showQueueModal: function(){
			$.showCustomModal( 
				"Image link updating queue", 
				'<div id="PRAContainer" style="width: 100%;"> <div id="PRAQueue" style="overflow: scroll; width: 590px; height: 300px; float: left; border: 1px solid black; font-weight: bold; background-color: #FFFFFF;"></div> <div id="PRALog" style="overflow-x: scroll; height: 300px; width: 200px; float: right; background-color: lightgrey; border: 1px solid black;"></div> <div id="PRAQueueLength" style="float: left;margin: 5px 15px 0px 0px; font-weight: bold;">Files in queue: <span id="PRAQueueLengthBox"></span></div> <div id="PRANamespaceToggle" style="float: left; margin: 5px 5px 0px 0px;"><label><input type="checkbox" id="PRANamespaceToggleCheck" onchange="PRA.updateNamespaceSelection()" ' + localStorage[wgUserName + "_PRANamespaceSelection"] + '>Include <span style="font-weight: bold">links</span> in all namespaces eg: [[:File:File.png]] <span style="font-size: 9px;">(only includes Main by default)</span></label></div> <div style="clear: both"></div> <div id="PRAFailedLog" style="width: 798px; margin: 5px auto 0px auto; background-color: #ffbfbf; height: 150px; border: 1px solid black; font-weight: bold; overflow: scroll;">Failed items appear here after execution. Note that pages that the file is transcluded through a template on will also appear here falsely.</div> </div>', 
				{
					id: "queueModal",
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
							message: "Reset wait list",
							handler: function () {
								if (confirm("This will reset the list of pages waiting to be added to the queue in-case there was a problem processing a page that's preventing you from executing the queue.  \n\nNote that there are still " + (localStorage.PRAQueuedUpdates - localStorage.PRAQueuedUpdatesPos - 1) + " page(s) waiting to be added to the queue.  If you are absolutely positive that you currently have no pages open that are waiting in line to be processed or a problem has occured that has halted page processing, then press OK to clear the list of waiting pages. \n\nIf you do have any pages waiting to be processed, you will have to reload and resubmit those pages to the queue to add them.")){
									localStorage.PRAQueuedUpdates = 0;
									localStorage.PRAQueuedUpdatesPos = 1;
									PRA.log("List of waiting pages cleared");
								}
							}
						},
						{
							id: "updateButton",
							message: "Refresh",
							handler: function(){
								PRA.updateQueueListing();
							}
						},
						{
							id: "executeButton",
							message: "Execute",
							defaultButton: true,
							handler: function(){
								if (typeof localStorage[wgUserName + "_PRAQueueData"] !== "undefined"){
									PRA.log("Queue execution started.");
									PRA.processQueue(function(){
										PRA.log("Queue executed.");
										PRA.updateQueueListing();
									});
								}else{
									PRA.log("No queue exists to be executed");
								}
							}
						}
					],
					callback: function(){
						$(".blackout, .close").off("click").click(function(){
							if ((PRA.started == false || typeof(PRA.started) === "undefined")){
								delete PRACurrentQueueData;
								$("#queueModal").remove();
								$(".blackout").fadeOut(function(){
									$(this).remove();
								});
							}
						});

						PRA.updateQueueListing();
					}
				}
			);
		},
	
		addToQueueButton: function(buttonId) {
			if ( $("#fuau-button-" + buttonId).attr("data-fuau-from") != "undefined" && $("#fuau-button-" + buttonId).attr("data-fuau-from") != ""){
				if ( $("#fuau-button-" + buttonId).attr("data-fuau-to") != "undefined" && $("#fuau-button-" + buttonId).attr("data-fuau-to") != ""){
					$("#fuau-button-" + buttonId).css("display", "none");
				
					PRA.instances[buttonId].start("multi", decodeURIComponent( $("#fuau-button-" + buttonId).attr("data-fuau-from") ), decodeURIComponent( $("#fuau-button-" + buttonId).attr("data-fuau-to").replace(/_/g, " ") ), "Test Reason", function(successful, error){
						if (successful){
							PRA.instances[buttonId].updateStatus(false, PRA.getMessage("success"));
						}
						
						if (typeof error != "undefined"){
							switch (error){
								case "nameinuse":
								case "invalidextension":
								case "destinuse":
									$("#fuau-button-" + buttonId).css("display", "inline-block");
									PRA.showFuauModal( $("#fuau-button-" + buttonId), buttonId, error );
									break;
							}
						}
					});
				}else{
					PRA.showFuauModal( $("#fuau-button-" + buttonId), buttonId, "toundef");
				}
			}else{
				PRA.instances[buttonId].updateStatus(false, PRA.getMessage("varsundef"));
			}
		},
		
		showFuauModal: function(buttonObj, Id, message){
			$.showCustomModal(
				"Queue addition",
				'<fieldset><span> ' + PRA.getMessage(message) + '  ' + PRA.getMessage("trydiffname") + ' </span><br><span style="font-weight:bold">Old file name:</span><br><input disabled id="modalOldName" type="text" style="width:400px" value="' + decodeURIComponent( buttonObj.attr("data-fuau-from") ).replace(/_/g, " ") + '" /><br><span style="font-weight:bold">New file name:</span><br><input id="modalNewName" type="text" style="width:400px" value="' + (typeof buttonObj.attr("data-fuau-to") != "undefined" ? decodeURIComponent( buttonObj.attr("data-fuau-to") ).replace(/_/g, " ") : "") + '" /><br><input id="modalId" type="text" value="' + Id + '" style="display: none;" /></fieldset>',
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
							message: "Add to queue",
							handler: function(){
								var Id = $("#modalId").val();
								if ( $("#modalNewName").val() != "" ){
									$("#fuau-button-" + Id).attr( "data-fuau-to", encodeURIComponent( $("#modalNewName").val() ).replace(/'/g, "%27") );
									$(".close").click();
									PRA.addToQueueButton(Id);
								}
							}
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
	};
}

/* Actions performed on page load to add script elements */

if (wgPageName.indexOf("Special:MovePage/File:") != -1 && Storage){
	/* Move file page */
	PRA.instances[0] = new PRA.constructInstance(0);
	PRA.appendButtonText = "<a style='margin-left: 20px;' class='wikia-button' onclick='PRA.instances[0].start(\"single\")'>" + PRAoptions.singleButtonText + "</a><a style='margin-left: 20px;' class='wikia-button' onclick='PRA.instances[0].start(\"multi\")'>" + PRAoptions.queueButtonText + "</a>";


	PRA.appendButtonText += "<span id='liveLoader-0' style='display:none'><img src='http://slot1.images.wikia.nocookie.net/__cb62004/common/skins/common/progress-wheel.gif' /></span><span id='queueStatus-0' style='font-weight: bold'></span><br /><br /><div style='width: 850px; white-space: normal;'>The <b>\""+PRAoptions.singleButtonText+"\"</b> button updates file usages across pages for a single image, while the <b>\""+PRAoptions.queueButtonText+"\"</b> button adds the file usages of the image to a queue to be updated at one time as a group. When updating file usages using the queue, usages located on like pages are grouped together into one edit, rather than one edit per usage. The queue can be accessed and executed through any file page inside the \"Edit\" drop-down. Please note that a saved queue is local to the browser being used, and does not carry over to other browsers/computers.</div>";
	
	if (PRAoptions.bottomMessage != ""){
		PRA.appendButtonText += ('<br /><div style="font-weight: bold; width: 850px; white-space: normal;">' + PRAoptions.bottomMessage + '</div>');
	}
	
	PRA.appendButtonText += ('<br /><div style="font-weight: bold; width: 850px; white-space: normal;">Script Updated 10th of April, 2014.  More information about updates and functionality can be found <a href="http://dev.wikia.com/wiki/FileUsageAuto-update">here</a>.  Please report bugs or missed replacements <a href="http://dev.wikia.com/wiki/Talk:FileUsageAuto-update">here</a> in detail.</div>');
	
	$('td.mw-submit').append(PRA.appendButtonText);
	$('#mw-movepage-table tr:eq(4)').after('<tr><td></td><td class="mw-input"><label><input type="checkbox" id="PRANamespaceToggleCheck" onchange="PRA.updateNamespaceSelection()" ' + localStorage[wgUserName + "_PRANamespaceSelection"] + '>&nbsp;Include <span style="font-weight: bold">links</span> in all namespaces eg: [[:File:File.png]] <span style="font-size: 9px;">(only includes Main by default) only affects ' + PRAoptions.singleButtonText + ' option</span></label></td></tr>');
}else if (wgCanonicalNamespace == "File" && Storage){
	/* File page */
	PRA.instances[0] = new PRA.constructInstance(0);
	$("#WikiaPageHeader nav ul").append("<li><a onclick='PRA.showQueueModal()'>Queue</a></li>");
	if (typeof localStorage[wgUserName + "_PRAQueueData"] !== "undefined"){
		PRA.instances[0].queueData = JSON.parse(localStorage[wgUserName + "_PRAQueueData"]);
	
	
		for (var i in PRA.instances[0].queueData){
			if (wgTitle.match(new RegExp(PRA.instances[0].queueData[i].oldImage.replace(/\*/g, "\\*").replace(/\?/g, "\\?").replace(/\./g, "\\.").replace(/( |_)/g, "[ _]*?").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\+/g, "\\+"), "gi") ) != null){
				$("#WikiaArticle").prepend('<table id="PRANotification" class="metadata plainlinks ambox ambox-notice" style="border-left: 10px solid lightgreen;"><tbody><tr><td class="mbox-image"><div style="width: 52px;"><img alt="" src="http://upload.wikimedia.org/wikipedia/commons/b/bd/Checkmark_green.svg" width="46" height="40"></div></td><td class="mbox-text" style="">This image is currently in your queue to be renamed!<br>New name: <span style="font-weight: bold;">'+PRA.instances[0].queueData[i].newImage+'</span></td></tr><tr><td>&nbsp;</td><td style="text-align: right;"><a onclick="PRA.removeFromQueue(' + i + ')" style="cursor: pointer">Remove from queue</a></td></tr></tbody></table>');
				break;
			}
		}
	}
}else if ($(".fuau").length > 0){
	/* Add to queue button */
	PRA.buttonIndex = 0;
	$(".fuau").each(function(){
		PRA.instances[PRA.buttonIndex] = new PRA.constructInstance(PRA.buttonIndex);
		$(this).html("<a class='wikia-button' id='fuau-button-" + PRA.buttonIndex + "' data-fuau-from='" + $(this).attr('data-fuau-from') + "' data-fuau-to='" + $(this).attr('data-fuau-to') + "' onclick='PRA.addToQueueButton(" + PRA.buttonIndex + ")'>Add to queue</a><span id='liveLoader-" + PRA.buttonIndex + "' style='display:none'><img src='http://slot1.images.wikia.nocookie.net/__cb1395341051/common/skins/common/images/ajax.gif' /></span><span id='queueStatus-" + PRA.buttonIndex + "' style='font-weight: bold'></span>");
		PRA.buttonIndex++;
	});
	delete PRA.buttonIndex;
}

//</nowiki>
//</source>
