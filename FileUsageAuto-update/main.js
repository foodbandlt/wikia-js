//__NOWYSIWYG__ <source lang="javascript">
//<nowiki>
/**
*
* Description:
* Updates file links in use on the wiki when image is renamed.
*
* @Author Foodbandlt
*
**/

// Options processing

if (typeof LIRoptions !== "undefined"){
	if (typeof (LIRoptions.bottomMessage) === "undefined"){
		LIRoptions.bottomMessage = "";
	}
	
	if (typeof LIRoptions.editSummary === "undefined"){
		LIRoptions.editSummary = "Updating file links (automatic)";
	}

	if (typeof LIRoptions.singleButtonText !== "undefined"){
		if (LIRoptions.singleButtonText === ""){
			LIRoptions.singleButtonText = "Rename and replace";
		}
	}else{
		LIRoptions.singleButtonText = "Rename and replace";
	}
	
	if (typeof LIRoptions.queueButtonText !== "undefined"){
		if (LIRoptions.queueButtonText === "" || LIRoptions.queueButtonText === "Rename and add to queue"){
			LIRoptions.queueButtonText = "Add to queue";
		}
	}else{
		LIRoptions.queueButtonText = "Add to queue";
	}
}else{		
	LIRoptions = {
		bottomMessage: "",
		editSummary: 'Updating file links (automatic)',
		singleButtonText: 'Rename and replace',
		queueButtonText: 'Add to queue'
	};
}
	
if (typeof LIR === "undefined"){

	if (typeof localStorage.LIRQueuedUpdates === "undefined"){
		localStorage.LIRQueuedUpdates = 0;
		localStorage.LIRQueuedUpdatesPos = 1;
	}
	
	if (typeof localStorage[wgUserName + "_LIRNamespaceSelection"] === "undefined"){
		localStorage[wgUserName + "_LIRNamespaceSelection"] = "";
	}

	LIR = {
		started: false,
		
		updateStatus: function(gifDisplay, message, loaderId){
			if ($("#queueStatus").length == 0) return false;
			
			if (typeof loaderId != "undefined"){
				loaderIdString = "liveLoader-" + loaderId";
				queueStatusString = "queueStatus-" + loaderIdString";
			}else{
				loaderIdString = "liveLoader";
				queueStatusString = "queueStatus"
			}
		
			if (typeof gifDisplay === "string"){
				message = gifDisplay;
			}else if (typeof gifDisplay === "boolean"){
				if (gifDisplay == false){
					displayValue = "none";
				}else{
					displayValue = "inline-block";
				}
				document.getElementById(loaderIdString).style.display = displayValue;
			}else{
				return false;
			}
			
			if (typeof message === "string"){
				$("#" + queueStatusString).html(" " + message);
			}
			return true;
		},
		
		start: function(type, oldName, newName, reason, loaderId){
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
					LIR.updateStatus(true, "Processing");
					LIR.type = "single";
				}else if (type == "multi"){
					LIR.started = true;
					
					if (typeof LIR.queuePosition === "undefined"){
						LIR.queuePosition = ++localStorage.LIRQueuedUpdates;
						LIR.updateStatus(true);
					}
					
					if (LIR.queuePosition != localStorage.LIRQueuedUpdatesPos){
						LIR.updateStatus("Number " + (LIR.queuePosition - localStorage.LIRQueuedUpdatesPos) + " on wait list");
						setTimeout(function(){LIR.start(type, oldName, newName, reason);}, 500);
						return false;
					}
					
					LIR.updateStatus("Processing");
					LIR.type = "multi";
				}else{
					if (console) console.log("Incorrect type specified");
					return false;
				}
			}else{
				LIR.started = true;
				LIR.updateStatus(true, "Processing");
				LIR.type = "single";
			}
			
			/* Retrieves queue, or resets variables if doesn't exist */
			if (typeof (localStorage[wgUserName + "_LIRQueueData"]) !== "undefined"){
				LIR.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
			}else{
				LIR.queueData = [];
			}

			/* Sets variables used by the function */
			if (typeof oldName != "undefined" && typeof newName != "undefined"){
				var oldImageName = oldName,
					newImageName = newName,
					if (typeof reason == "undefined") reason = "";
			}else{
				var oldImageName = $('input[name="wpOldTitle"]').val().slice(5),
					newImageName = document.getElementById("wpNewTitleMain").value,
					reason = $("#wpReason").val();
			}
			LIR.pageKey = [];
			
			/* Checks if old or new file name is currently part of the queue */
			for (i=0; i<LIR.queueData.length; i++){
				if (LIR.queueData[i].newImage == oldImageName || LIR.queueData[i].newImage == newImageName || LIR.queueData[i].oldImage == oldImageName || LIR.queueData[i].oldImage == newImageName){
					LIR.started = false;
					if (typeof LIR.queuePosition !== "undefined"){
						localStorage.LIRQueuedUpdatesPos++;
						delete LIR.queuePosition;
					}
					LIR.updateStatus(false, "File already added to queue, or destination name is already queued to be used.");
					return false;
				}
			}
			
			/* Checks if destination file name is the same as file being renamed (since Wikia's server-sided code usually validates this) */
			if (oldImageName.lastIndexOf(".") == oldImageName.length-4 && oldImageName.slice(oldImageName.length-4).toLowerCase() != newImageName.slice(newImageName.length-4).toLowerCase()){
				LIR.started = false;
				if (typeof LIR.queuePosition !== "undefined"){
					localStorage.LIRQueuedUpdatesPos++;
					delete LIR.queuePosition;
				}
				LIR.updateStatus(false, "Invalid file extension");
				return false;
			}
			
			if (localStorage[wgUserName + "_LIRNamespaceSelection"] == false){
				var namespaceSelection = "&blnamespace=0";
			}else{
				var namespaceSelection = "";
			}
			
			/* Check if destination file name is in use */
			$.getJSON("/api.php?action=query&prop=revisions&rvprop=content&titles=File:"+encodeURIComponent(newImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"&format=json", function(result){
				if (typeof result.query.pages[-1] !== "undefined"){
					/* If not, then get file usage for image */
					$.getJSON("/api.php?action=query&list=imageusage&iutitle=File:"+encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"&iulimit=500&format=json", function(result){
						var imageUsage = result.query.imageusage;
						
						$.getJSON("/api.php?action=query" + namespaceSelection + "&bllimit=500&list=backlinks&bltitle=File:" + encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "&format=json", function(result){
							var imageLinks = result.query.backlinks;
							var totalImageUsage = imageUsage.concat(imageLinks);
							
							if (console) console.log("Image usage successfully retrieved");
							if (imageUsage.length > 0 || imagesLinks.length > 0){
							
								/* Resets queue-related variables if only renaming and replacing a single image */
								if (LIR.type == "single"){
									
									LIR.queueData = [];
									LIR.queueDataList = [];
									LIR.pageKey = [];
									
									for (var currentPage = 0; currentPage < imageUsage.length; currentPage++){
										var title = imageUsage[currentPage].title;
										/* Temporary until Wikia fixes issue with editing blog comments through the API */
										if (title.search(/User blog comment/i) != -1){
											LIRBlogComment = true;
										}
									}
									
									LIR.queueDataList[LIR.queueData.length] = {
										oldImage: oldImageName,
										newImage: newImageName,
										reason: reason
									};
													
									/* Adds pages image is used on to window.LIR.pageKey to help keep track of pages in window.LIR.pageData later on 
									for (var currentPage = 0; currentPage < totalImageUsage.length; currentPage++){
										var title = totalImageUsage[currentPage].title;

										if (LIR.pageKey.indexOf(title) == -1){
											LIR.pageKey[LIR.pageKey.length] = title;
										}
										
										/* Temporary until Wikia fixes issue with editing blog comments through the API 
										if (title.search(/User blog comment/i) == -1){
											for (i = 0; i <= LIR.queueData.length; i++){
												if (i == LIR.queueData.length){
													LIR.queueData[LIR.queueData.length] = {
														oldImage: oldImageName,
														newImage: newImageName,
														title: title,
														reason: reason
													};
													break;
												}else if (LIR.queueData[i].title == title && LIR.queueData[i].oldImage == oldImageName && LIR.queueData[i].newImage == newImageName){
													break;
												}
											}
										}else{
											LIRBlogComment = true;
										}
									}
									*/
								}else{
									LIR.queueData[LIR.queueData.length] = {
										oldImage: oldImageName,
										newImage: newImageName,
										reason: reason
									};
										
									for (var currentPage = 0; currentPage < imageUsage.length; currentPage++){
										var title = imageUsage[currentPage].title;
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
											window.location = "/wiki/File:" + encodeURIComponent(newImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27");
										});
									}
								}else{
									if (typeof LIR.queuePosition !== "undefined"){
										localStorage.LIRQueuedUpdatesPos++;
										delete LIR.queuePosition;
									}
									LIR.updateStatus(false, "File used in blog comment. Unable to update blog comments.");
								}
								

							}else{
								/* Else, prompt to use normal renaming, since this is kind of pointless otherwise */
								LIR.started = false;
								if (typeof LIR.queuePosition !== "undefined"){
									localStorage.LIRQueuedUpdatesPos++;
									delete LIR.queuePosition;
								}
								LIR.updateStatus(false, "File not being used on any pages");
							}
						});
					});
				}else{
					LIR.started = false;
					if (typeof LIR.queuePosition !== "undefined"){
						localStorage.LIRQueuedUpdatesPos++;
						delete LIR.queuePosition;
					}
					LIR.updateStatus(false, "File name already exists");
				}
			});
			
		},
		
		storeQueue: function(callback){
			/* Standalone function to store the queue in window.localStorage
				uses wgUserName as a variable key so multi-user computers on the same wiki don't get each other's queue */
			localStorage[wgUserName + "_LIRQueueData"] = JSON.stringify(LIR.queueData);

			if (typeof(callback) === "function"){
				callback();
			}
			
		},
		
		getUsage: function(index, callback){
			if (localStorage[wgUserName + "_LIRNamespaceSelection"] == false){
				var namespaceSelection = "&blnamespace=0";
			}else{
				var namespaceSelection = "";
			}
		
			$.getJSON("/api.php?action=query&list=imageusage&iutitle=File:"+encodeURIComponent(LIR.queueDataList[index].oldImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"&iulimit=5000&format=json", function(result){
				var imageUsage = result.query.imageusage;
				
				$.getJSON("/api.php?action=query" + namespaceSelection + "&bllimit=5000&list=backlinks&bltitle=File:" + encodeURIComponent(LIR.queueDataList[index].oldImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "&format=json", function(result){
					var imageLinks = result.query.backlinks;
					var totalImageUsage = imageUsage.concat(imageLinks);
					
					if (console) console.log("Image usage successfully retrieved");

					/* Adds pages image is used on to window.LIR.pageKey to help keep track of pages in window.LIR.pageData later on */
					for (var currentPage = 0; currentPage < totalImageUsage.length; currentPage++){
						var title = totalImageUsage[currentPage].title;

						if (LIR.pageKey.indexOf(title) == -1){
							LIR.pageKey[LIR.pageKey.length] = title;
						}
						
						for (i = 0; i <= LIR.queueData.length; i++){
							if (i == LIR.queueData.length){
								LIR.queueData[LIR.queueData.length] = {
									oldImage: LIR.queueDataList[index].oldImage,
									newImage: LIR.queueDataList[index].newImage,
									title: title
								};
								break;
							}else if (LIR.queueData[i].title == title && LIR.queueData[i].oldImage == LIR.queueDataList[index].oldImage && LIR.queueData[i].newImage == LIR.queueDataList[index].newImage){
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
			if ( (LIR.type == "multi" && localStorage.LIRQueuedUpdates == 0) || LIR.type == "single"){
				if (typeof (localStorage[wgUserName + "_LIRQueueData"]) !== "undefined" || LIR.type == "single"){
					if (LIR.type == "multi"){
						LIR.queueDataList = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
						if (console) console.log("Queue retrieved successfully.");
					}
					
					LIR.usageRequested = 0;
					LIR.usageProgress = 0;
					LIR.moveRequested = LIR.queueDataList.length;
					LIR.moveProgress = 0;
					LIR.queueData = [];
					LIR.pageKey = [];
					
					for (var index in LIR.queueDataList){
						LIR.moveFile(index, function(index){
							LIR.moveProgress++;
							LIR.usageRequested++;
							LIR.getUsage(index, function(){
								LIR.usageProgress++;
								if (LIR.moveProgress == LIR.moveRequested && LIR.usageProgress == LIR.usageRequested){
									LIR.processPageContent(callback);
								}
							});
						},
						function(callback){
							LIR.moveProgress++;
								
							if (LIR.moveProgress == LIR.moveRequested && LIR.usageProgress == LIR.usageRequested){
								LIR.processPageContent(callback);
							}
						});
					}
				}else{
					if (console) console.log("Queue does not exist or was unable to be retrieved.");
					LIR.started = false;
					return false;
				}
				
				
			}else if (LIR.type == "multi" && localStorage.LIRQueuedUpdates != 0){
				if (console) console.log("Pages are still being added to the queue.");
				alert("Pages are still waiting to be added to the queue.  If this is not the case, please use the \"Reset waiting pages\" button to be able to execute the queue.");
				LIR.started = false;
				return false;
			}else if (LIR.type == "single"){
				LIR.processPageContent(callback);
			}
		},
		
		processPageContent: function(callback) {
			if (console) console.log("Begin queue execution");
			
			/* Sets progress checking variables */
			for (i = 0; i<LIR.pageKey.length; i++){
				LIR.requestCompleted[i] = false;
			}
			var pageDataRetrieved = 0;

			if (console) console.log("Getting page contents");
			
			
			for (var j = 0; j < (Math.floor(LIR.pageKey.length/500)+1); j++){
				var tempArray = [];
				
				for (var k = (j * 500); k < (j * 500) + 500; k++){
					if (k == LIR.pageKey.length){
						break;
					}
					
					tempArray.push( LIR.pageKey[k] );
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
						/* Saves page contents for each page in LIR.pageData */
						for (var i in result.query.pages){
							var keyNum = LIR.pageKey.indexOf(result.query.pages[i].title);
							LIR.pageData[keyNum] = {
								title: LIR.pageKey[keyNum],
								content: result.query.pages[i].revisions[0]["*"],
								changed: false
							};
							pageDataRetrieved++;
						}
						
						if (pageDataRetrieved == LIR.pageKey.length){
							if (console) console.log("Page contents retrieved and saved");
							LIR.log("Page contents retrieved and saved");
							
							if (console) console.log("Begin processing page content.");
							
							/* Replacing image name on each page */
							for (i=0; i<LIR.queueData.length; i++){
								var pageKey = LIR.pageKey.indexOf(LIR.queueData[i].title);
								var escapedName0 = window.LIR.queueData[i].oldImage.replace(/\*/g, "\\*").replace(/\?/g, "\\?").replace(/\./g, "\\.").replace(/( |_)/g, "[ _]*?").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\+/g, "\\+");
								
								if ( escapedName0.substr(0,1).match(/[A-z]/i) ){
									var escapedName = "[" + escapedName0.substr(0,1).toUpperCase() + escapedName0.substr(0,1).toLowerCase() + "]" + escapedName0.substr(1);
								}else{
									var escapedName = escapedName0;
								}
								
								var pageReplacement = new RegExp("(\\n[ ]*?|:?File:[ ]*?|:?Image:[ ]*?|:?Video:[ ]*?|=[ ]*?|\\|)" + escapedName + "(.*?\\n|[ ]*?\\||\\]|\\}|\\{|\\[)", "g");
								var replacementReg = new RegExp(escapedName, "g");
								
								if (LIR.pageData[pageKey].content.search(pageReplacement) != -1){
									LIR.pageData[pageKey].changed = true;
									if (console) console.log("\""+LIR.queueData[i].oldImage+"\" replaced on page \""+LIR.queueData[i].title+"\"");
									
									while ((regExec = pageReplacement.exec(LIR.pageData[pageKey].content)) != null){
										LIR.pageData[pageKey].content = LIR.pageData[pageKey].content.replace(regExec[0], regExec[0].replace(replacementReg, LIR.queueData[i].newImage));
										pageReplacement.lastIndex += (regExec[0].replace(replacementReg, LIR.queueData[i].newImage).length - regExec[0].length) - (regExec[2].length);
									}
								}else{
									if (LIR.type == "multi"){
										LIR.failedLog(LIR.queueData[i].oldImage, LIR.queueData[i].newImage, LIR.queueData[i].title);
									}else{
										alert("Unable to find \""+LIR.queueData[i].oldImage+"\" on page \""+LIR.queueData[i].title+"\"; it may be transcluded through a template. Please check and rename manually if needed.");
									}
								}
							}
							
							LIR.log("Submitting page content");
							if (console) console.log("Begin submitting pages");
							
							/* Adds progress bar for page submission (since this is the longest part and something entertaining needs to happen) */
							if (LIR.type == "multi"){
								$(".modalToolbar").prepend("<div id='LIRQueueProgress' style='float: left; width: 200px; border: 2px solid black; height: 17px;'><div id='LIRProgressInd' style='width: 0%; height: 100%; float: left; background-color: green;'></div></div>");
								LIR.queueProgress = 0;
							}
							
							var l = 0;
							
							var throttle = setInterval(function(){
								if (LIR.pageData[l].changed == true){
									LIR.submitChangedPages(l, callback);
								}else{
									LIR.requestCompleted[l] = true;
								}
								
								l++;
								
								if (l == LIR.pageData.length){
									clearInterval(throttle);
								}
							}, 500);
						}else if (k == LIR.pageKey.length && pageDataRetrieved != LIR.pageKey.length){
							if(console) console.log("There was a problem retrieving one or more pages. Retrieved " + LIR.pageData.length + " of " + LIR.pageKey.length + " pages");  
						}
						
						/* Submits edited pages
						
						for (var i=0; i<LIR.pageData.length; i++){
							if (LIR.pageData[i].changed == true){
								LIR.submitChangedPages(i, callback);
							}else{
								LIR.requestCompleted[i] = true;
							}
						}
						*/
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
					title: LIR.pageData[pageKey].title,
					summary: LIRoptions.editSummary,
					text: LIR.pageData[pageKey].content,
					minor: true,
					nocreate: true,
					redirect: false,
					bot: true,
					token: mediaWiki.user.tokens.get("editToken"),
					format: "json"
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
						
						if (typeof result.error !== "undefined"){
							alert("The page \"" + LIR.pageData[pageKey].title + "\" could not be submitted because of error code:\"" + result.error.code + "\". Please update the link(s) listed below on that page manually.");
							
							for (var i in LIR.queueData){
								if (LIR.queueData[i].title === LIR.pageData[pageKey].title){
									LIR.failedLog(LIR.queueData[i].oldImage, LIR.queueData[i].newImage, LIR.queueData[i].title);
								}
							}
						}
					}else{
						if (typeof result.error !== "undefined"){
							alert("The page \"" + LIR.pageData[pageKey].title + "\" could not be submitted because of error code:\"" + result.error.code + "\". Please update the link(s) on that page manually.");
						}
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
		
		moveFile: function(index, callback, failure) {
			
			$.ajax({
				url: "/api.php",
				type: "POST",
				async: true,
				data: {
					action: "move",
					from: "File:" + LIR.queueDataList[index].oldImage,
					to: "File:" + LIR.queueDataList[index].newImage,
					reason: LIR.queueDataList[index].reason,
					movetalk: true,
					noredirect: true,
					ignorewarnings: true,
					token: mediaWiki.user.tokens.get("editToken"),
					format: "json"
				},
				contentType: "application/x-www-form-urlencoded",
				error: function(){
					alert("Unable to move file \"" + LIR.queueDataList[index].oldImage + "\" to \"" + LIR.queueDataList[index].newImage + "\".");
				},
				success: function(result){
					if (typeof result.error === "undefined"){
						if (console) console.log("Moved file \"" + LIR.queueDataList[index].oldImage + "\"");
						
						/* Call callback if exists */
						if (typeof(callback) === "function"){
							callback(index);
						}
					}else if (result.error.code == "articleexists" || result.error.code == "invalidtitle"){
						var promptResponse = prompt("The file \"" + LIR.queueDataList[index].oldImage + "\" was unable to be moved to \"" + LIR.queueDataList[index].newImage + "\" for reason: " + result.error.code + ". \n Please enter another destination name for this file.");
						
						if (promptResponse != null && promptResponse != ""){
							LIR.queueDataList[index].newImage = promptResponse;
							LIR.moveFile(index, callback, failure);
						}else{
							alert(LIR.queueDataList[index].oldImage + " has been removed from the queue.");
						
							if (LIR.queueDataList.length == 1){
								delete localStorage[wgUserName + "_LIRQueueData"];
								LIR.started = false;
								LIR.log("Queue execution completed");
								LIR.updateQueueListing();
							}else{
								delete LIR.queueDataList[index];
								
								failure();
							}
						}
					}else{
						alert("The file \"" + LIR.queueDataList[index].oldImage + "\" was unable to be moved to \"" + LIR.queueDataList[index].newImage + "\" for reason: " + result.error.code + ".\n\"" + LIR.queueDataList[index].oldImage + "\" has been removed from the queue.");
						
						if (LIR.queueDataList.length == 1){
							delete localStorage[wgUserName + "_LIRQueueData"];
							LIR.started = false;
							LIR.log("Queue execution completed");
							LIR.updateQueueListing();
						}else{
							delete LIR.queueDataList[index];
							
							failure();
						}
					}
				}
			});
		},
		
		removeFromQueue: function(queueOldName){
			LIR.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
			
			for (var i in LIR.queueData){
				if (LIR.queueData[i].oldImage == queueOldName){
					LIR.queueData.splice(i, 1);
					
					if (LIR.queueData.length > 0){
						LIR.storeQueue(function(){
							$("#LIRNotification").slideUp("fast", function(){this.remove();});
						});
					}else{
						delete localStorage[wgUserName + "_LIRQueueData"];
						$("#LIRNotification").slideUp("fast", function(){this.remove();});
					}
				}
			}
		},
		
		/**************************************
		// Modal-related functions
		**************************************/
		
		log: function(message){
			if (typeof LIR.logMessages === "undefined"){
				LIR.logMessages = "";
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
				document.getElementById("LIRQueueLengthBox").innerHTML = "0";
				LIR.log("Queue updated.");
				return false;
			}
			
			var LIRCurrentQueueData = LIR.queueData;
			var queueToAdd = "";
			
			for (i = 0; i<LIRCurrentQueueData.length; i++){
				queueToAdd += "<div><a target='_blank' href='/wiki/File:" + encodeURIComponent(LIRCurrentQueueData[i].oldImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + LIRCurrentQueueData[i].oldImage + "</a> --&gt; <a target='_blank' href='/wiki/File:" + encodeURIComponent(LIRCurrentQueueData[i].newImage.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "'>" + LIRCurrentQueueData[i].newImage + "</a></div>";
			}
			
			document.getElementById("LIRQueue").innerHTML = queueToAdd;
			document.getElementById("LIRQueueLengthBox").innerHTML = LIR.queueData.length;
			$("#LIRQueue div:odd").css("background-color", "lightgrey");
			LIR.log("Queue updated.");
		},
		
		updateNamespaceSelection: function(){
			if (document.getElementById("LIRNamespaceToggleCheck").checked == true){
				localStorage[wgUserName + "_LIRNamespaceSelection"] = "checked";
			}else{
				localStorage[wgUserName + "_LIRNamespaceSelection"] = "";
			}
		},

		showQueueModal: function(){
			$.showCustomModal( 
				"Image link updating queue", 
				'<div id="LIRContainer" style="width: 100%;"> <div id="LIRQueue" style="overflow: scroll; width: 590px; height: 300px; float: left; border: 1px solid black; font-weight: bold; background-color: #FFFFFF;"></div> <div id="LIRLog" style="overflow-x: scroll; height: 300px; width: 200px; float: right; background-color: lightgrey; border: 1px solid black;"></div> <div id="LIRQueueLength" style="float: left;margin: 5px 15px 0px 0px; font-weight: bold;">Files in queue: <span id="LIRQueueLengthBox"></span></div> <div id="LIRNamespaceToggle" style="float: left; margin: 5px 5px 0px 0px;"><label><input type="checkbox" id="LIRNamespaceToggleCheck" onchange="LIR.updateNamespaceSelection()" ' + localStorage[wgUserName + "_LIRNamespaceSelection"] + '>Include <span style="font-weight: bold">links</span> in all namespaces eg: [[:File:File.png]] <span style="font-size: 9px;">(only includes Main by default)</span></label></div> <div style="clear: both"></div> <div id="LIRFailedLog" style="width: 798px; margin: 5px auto 0px auto; background-color: #ffbfbf; height: 150px; border: 1px solid black; font-weight: bold; overflow: scroll;">Failed items appear here after execution. Note that pages that the file is transcluded through a template on will also appear here falsely.</div> </div>', 
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
								if (confirm("This will reset the list of pages waiting to be added to the queue in-case there was a problem processing a page that's preventing you from executing the queue.  \n\nNote that there are still " + (localStorage.LIRQueuedUpdates - localStorage.LIRQueuedUpdatesPos - 1) + " page(s) waiting to be added to the queue.  If you are absolutely positive that you currently have no pages open that are waiting in line to be processed or a problem has occured that has halted page processing, then press OK to clear the list of waiting pages. \n\nIf you do have any pages waiting to be processed, you will have to reload and resubmit those pages to the queue to add them.")){
									localStorage.LIRQueuedUpdates = 0;
									localStorage.LIRQueuedUpdatesPos = 1;
									LIR.log("List of waiting pages cleared");
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
						}
					],
					callback: function(){
						$(".blackout, .close").off("click").click(function(){
							if ((LIR.started == false || typeof(LIR.started) === "undefined")){
								delete LIRCurrentQueueData;
								$("#queueModal").remove();
								$(".blackout").fadeOut(function(){
									$(this).remove();
								});
							}
						});

						LIR.updateQueueListing();
					}
				}
			);
		}
	};
		
	if (wgPageName.indexOf("Special:MovePage/File:") != -1 && Storage){
		LIR.appendButtonText = "<a style='margin-left: 20px;' class='wikia-button' onclick='LIR.start(\"single\")'>" + LIRoptions.singleButtonText + "</a><a style='margin-left: 20px;' class='wikia-button' onclick='LIR.start(\"multi\")'>" + LIRoptions.queueButtonText + "</a>";
	
	
		LIR.appendButtonText += "<span id='liveLoader' style='display:none'><img src='http://slot1.images.wikia.nocookie.net/__cb62004/common/skins/common/progress-wheel.gif' /></span><span id='queueStatus' style='font-weight: bold'></span></span><br /><br /><div style='width: 850px; white-space: normal;'>The <b>\""+LIRoptions.singleButtonText+"\"</b> button updates file usages across pages for a single image, while the <b>\""+LIRoptions.queueButtonText+"\"</b> button adds the file usages of the image to a queue to be updated at one time as a group. When updating file usages using the queue, usages located on like pages are grouped together into one edit, rather than one edit per usage. The queue can be accessed and executed through any file page inside the \"Edit\" drop-down. Please note that a saved queue is local to the browser being used, and does not carry over to other browsers/computers.</div>";
		
		if (LIRoptions.bottomMessage != ""){
			LIR.appendButtonText += ('<br /><div style="font-weight: bold; width: 850px; white-space: normal;">' + LIRoptions.bottomMessage + '</div>');
		}
		
		LIR.appendButtonText += ('<br /><div style="font-weight: bold; width: 850px; white-space: normal;">Script Updated 23rd of March, 2014</div>');
		
		$('td.mw-submit').append(LIR.appendButtonText);
		$('#mw-movepage-table tr:eq(4)').after('<tr><td></td><td class="mw-input"><label><input type="checkbox" id="LIRNamespaceToggleCheck" onchange="LIR.updateNamespaceSelection()" ' + localStorage[wgUserName + "_LIRNamespaceSelection"] + '>&nbsp;Include <span style="font-weight: bold">links</span> in all namespaces eg: [[:File:File.png]] <span style="font-size: 9px;">(only includes Main by default) only affects ' + LIRoptions.singleButtonText + ' option</span></label></td></tr>');
	}else if (wgCanonicalNamespace == "File" && Storage){
		$("#WikiaPageHeader nav ul").append("<li><a onclick='LIR.showQueueModal()'>Queue</a></li>");
		if (typeof localStorage[wgUserName + "_LIRQueueData"] !== "undefined"){
			LIR.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
		
		
			for (var i in LIR.queueData){
				if (LIR.queueData[i].oldImage == wgTitle){
					$("#WikiaPageHeader").after('<div style="position: relative; width: 80%; margin: 0px auto 10px auto; padding-bottom: 10px; border: 2px solid lightgreen; background-color: white;" id="LIRNotification"><img src="http://upload.wikimedia.org/wikipedia/commons/b/bd/Checkmark_green.svg" style="height: 40px; float:left; margin: 5px 20px;" /><span style="float: left; word-wrap:break-word; margin-top: 10px; font-size: 14px; padding-bottom: 10px;">This image is currently in your queue to be renamed!<br>New name: <span style="font-weight: bold;">'+LIR.queueData[i].newImage+'</span></span><div style="position: absolute; bottom: 2px; right: 2px;"><a onclick="LIR.removeFromQueue(\'' + LIR.queueData[i].oldImage.replace(/'/g, "\\'") + '\')" style="cursor: pointer">Remove from queue</a></div><div style="clear:both;"></div></div>');
					break;
				}
			}
		}
	}
}

//</nowiki>
//</source>
