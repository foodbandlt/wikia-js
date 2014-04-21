//__NOWYSIWYG__ <source lang="javascript">
//<nowiki>
/**
*
* Description:
* Updates file links in use on the wiki when image is renamed.
*
* @Author Foodbandlt
* @Author Jr Mime
* Last updated 21 April, 2014
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
	
		/**************************************
		// Object instance-related functions
		**************************************/
	
		constructInstance: function(button){
			this.started = false;
			
			this.buttonId = button;
			
			this.updateStatus = function(gifDisplay, message){
				if ($("#queueStatus-" + this.buttonId).length == 0) return false;
			
				if (typeof gifDisplay === "string"){
					message = gifDisplay;
				}else if (typeof gifDisplay === "boolean"){
					if (gifDisplay == false){
						displayValue = "none";
					}else{
						displayValue = "inline-block";
					}
					document.getElementById("liveLoader-" + this.buttonId).style.display = displayValue;
				}else{
					return false;
				}
				
				if (typeof message === "string"){
					$("#queueStatus-" + this.buttonId).html(" " + message);
				}
				return true;
			};
			
			this.start = function(type, oldName, newName, reason, callback){
				/*Variable used for closure to access the instance of the object*/
				var objectInst = this;
				
				if (!Storage){
					return false;
				}
				
				/* Checks if function has already started */
				if ((this.started == true || LIR.started == true) && typeof this.queuePosition === "undefined"){
					return false;
				}
				
				/* Checks whether renaming single image or adding to queue */
				if (typeof(type) !== "undefined"){
					if (type == "single"){
						this.started = true;
						this.updateStatus(true, LIR.getMessage("process"));
						this.type = "single";
					}else if (type == "multi"){
						this.started = true;
						
						if (typeof this.queuePosition === "undefined"){
							this.queuePosition = ++localStorage.LIRQueuedUpdates;
							this.updateStatus(true);
						}
						
						if (this.queuePosition != localStorage.LIRQueuedUpdatesPos){
							this.updateStatus( LIR.getMessage( "waitlist", (this.queuePosition - localStorage.LIRQueuedUpdatesPos) ) );
							setTimeout(function(){
								objectInst.start(type, oldName, newName, reason, callback)
							}, 
							500);
							return false;
						}
						
						this.updateStatus(LIR.getMessage("process"));
						this.type = "multi";
					}else{
						if (console) console.log("Incorrect type specified");
						return false;
					}
				}else{
					this.started = true;
					this.updateStatus(true, LIR.getMessage("process"));
					this.type = "single";
				}
				
				/* Retrieves queue, or resets variables if doesn't exist */
				if (typeof (localStorage[wgUserName + "_LIRQueueData"]) !== "undefined"){
					this.queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
				}else{
					this.queueData = [];
				}

				/* Sets variables used by the function */
				if (typeof oldName != "undefined" && typeof newName != "undefined"){
					var oldImageName = oldName,
						newImageName = newName;
						if (typeof reason == "undefined") var reason = "";
				}else{
					var oldImageName = $('input[name="wpOldTitle"]').val().slice(5),
						newImageName = document.getElementById("wpNewTitleMain").value,
						reason = $("#wpReason").val();
				}
				this.pageKey = [];
				
				/* Checks if old or new file name is currently part of the queue */
				for (i=0; i<this.queueData.length; i++){
					if (this.queueData[i].newImage == oldImageName || this.queueData[i].newImage == newImageName || this.queueData[i].oldImage == oldImageName || this.queueData[i].oldImage == newImageName){
						this.started = false;
						if (typeof this.queuePosition !== "undefined"){
							localStorage.LIRQueuedUpdatesPos++;
							delete this.queuePosition;
						}
						
						if (this.queueData[i].oldImage == oldImageName || this.queueData[i].newImage == oldImageName){
							var errorMessage = "alreadyinqueue";
						}else{
							var errorMessage = "nameinuse";
						}
						
						this.updateStatus(false, LIR.getMessage(errorMessage));
						if (typeof(callback) === "function"){
							callback(false, errorMessage);
						}
						return false;
					}
				}
				
				/* Checks if destination file name is the same as file being renamed (since Wikia's server-sided code usually validates this) */
				if (oldImageName.lastIndexOf(".") == oldImageName.length-4 && oldImageName.slice(oldImageName.length-4).toLowerCase() != newImageName.slice(newImageName.length-4).toLowerCase()){
					this.started = false;
					if (typeof this.queuePosition !== "undefined"){
						localStorage.LIRQueuedUpdatesPos++;
						delete this.queuePosition;
					}
					this.updateStatus(false, LIR.getMessage("invalidextension"));
					if (typeof(callback) === "function"){
						callback(false, "invalidextension");
					}
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
						$.getJSON("/api.php?action=query&list=imageusage&iutitle=File:"+encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"&iulimit=20&format=json", function(result){
							var imageUsage = result.query.imageusage;
							
							$.getJSON("/api.php?action=query" + namespaceSelection + "&list=backlinks&bltitle=File:" + encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "&format=json", function(result){
								var imageLinks = result.query.backlinks;
								var totalImageUsage = imageUsage.concat(imageLinks);
								
								if (console) console.log("Image usage successfully retrieved");
								if (totalImageUsage.length > 0){
								
									/* Resets queue-related variables if only renaming and replacing a single image */
									if (objectInst.type == "single"){
										
										objectInst.queueData = [];
										objectInst.queueDataList = [];
										objectInst.pageKey = [];
										
										for (var currentPage = 0; currentPage < totalImageUsage.length; currentPage++){
											var title = totalImageUsage[currentPage].title;
											/* Temporary until Wikia fixes issue with editing blog comments through the API */
											if (title.search(/User blog comment/i) != -1){
												var LIRBlogComment = true;
											}
										}
										
										objectInst.queueDataList.push({
											oldImage: oldImageName,
											newImage: newImageName,
											reason: reason
										});
										
									}else{
										objectInst.queueData.push({
											oldImage: oldImageName,
											newImage: newImageName,
											reason: reason
										});
											
										for (var currentPage = 0; currentPage < totalImageUsage.length; currentPage++){
											var title = totalImageUsage[currentPage].title;
											/* Temporary until Wikia fixes issue with editing blog comments through the API */
											if (title.search(/User blog comment/i) != -1){
												var LIRBlogComment = true;
											}
										}
									}
									
									/* Temporary until Wikia fixes issue with editing blog comments through the API */
									if (typeof(LIRBlogComment) === "undefined"){
										/* Stores queue if renaming multiple images, or updates file usage if only renaming one */
										if (objectInst.type == "multi"){
											objectInst.storeQueue(function() {
												objectInst.started = false;
												localStorage.LIRQueuedUpdatesPos++;
												
												if (wgPageName.indexOf("Special:MovePage/File:") != -1){
													window.location = "/wiki/File:" + encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27");
												}else{
													if (typeof(callback) === "function"){
														callback(true);
													}
												}
											});
										}else{
											/* This may seem odd, but because I use this.processQueue() for both single and multiple image 
												updating, it requires this.started to be false to start */
											objectInst.started = false;
											LIR.processQueue(function(){
												window.location = "/wiki/File:" + encodeURIComponent(newImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27");
											});
										}
									}else{
										if (typeof objectInst.queuePosition !== "undefined"){
											localStorage.LIRQueuedUpdatesPos++;
											delete objectInst.queuePosition;
										}
										objectInst.updateStatus(false, LIR.getMessage("blogcomment"));
										if (typeof(callback) === "function"){
											callback(false, "blogcomment");
										}
									}
									

								}else{
									/* Else, prompt to use normal renaming, since this is kind of pointless otherwise */
									objectInst.started = false;
									if (typeof objectInst.queuePosition !== "undefined"){
										localStorage.LIRQueuedUpdatesPos++;
										delete objectInst.queuePosition;
									}
									objectInst.updateStatus(false, LIR.getMessage("filenotused"));
									if (typeof(callback) === "function"){
										callback(false, "filenotused");
									}
								}
							});
						});
					}else{
						objectInst.started = false;
						if (typeof objectInst.queuePosition !== "undefined"){
							localStorage.LIRQueuedUpdatesPos++;
							delete objectInst.queuePosition;
						}
						objectInst.updateStatus(false, LIR.getMessage("destinuse"));
						if (typeof(callback) === "function"){
							callback(false, "destinuse");
						}
					}
				});
				
			};
			
			this.storeQueue = function(callback){
				/* Standalone function to store the queue in window.localStorage
					uses wgUserName as a variable key so multi-user computers on the same wiki don't get each other's queue */
				localStorage[wgUserName + "_LIRQueueData"] = JSON.stringify(this.queueData);

				if (typeof(callback) === "function"){
					callback();
				}
				
			};
		},
		
		instances: [],


		/**************************************
		// Processing-related functions
		**************************************/

		started: false,
		
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
			if (typeof(LIR.instances[0].type) === "undefined"){
				LIR.instances[0].type = "multi";
			}

			/* Variable redeclaration */
			LIR.started = true;
			LIR.requestCompleted  = [];
			LIR.pageData = [];

			/* Queue retrieval, returns false if no queue */
			if ( (LIR.instances[0].type == "multi" && localStorage.LIRQueuedUpdates == 0) || LIR.instances[0].type == "single"){
				if (typeof (localStorage[wgUserName + "_LIRQueueData"]) !== "undefined" || LIR.instances[0].type == "single"){
					if (LIR.instances[0].type == "multi"){
						LIR.queueDataList = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
						if (console) console.log("Queue retrieved successfully.");
					}else{
						LIR.queueDataList = LIR.instances[0].queueDataList;
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


			}else if (LIR.instances[0].type == "multi" && localStorage.LIRQueuedUpdates != 0){
				if (console) console.log("Pages are still being added to the queue.");
				alert("Pages are still waiting to be added to the queue.  If this is not the case, please use the \"Reset waiting pages\" button to be able to execute the queue.");
				LIR.started = false;
				return false;
			}else if (LIR.instances[0].type == "single"){
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
									if (LIR.instances[0].type == "multi"){
										LIR.failedLog(LIR.queueData[i].oldImage, LIR.queueData[i].newImage, LIR.queueData[i].title);
									}else{
										alert("Unable to find \""+LIR.queueData[i].oldImage+"\" on page \""+LIR.queueData[i].title+"\"; it may be transcluded through a template. Please check and rename manually if needed.");
									}
								}
							}

							LIR.log("Submitting page content");
							if (console) console.log("Begin submitting pages");

							/* Adds progress bar for page submission (since this is the longest part and something entertaining needs to happen) */
							if (LIR.instances[0].type == "multi"){
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
					if (LIR.instances[0].type == "multi"){
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
						if (LIR.instances[0].type == "multi"){
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
			LIR.instances[0].queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);

			LIR.instances[0].queueData.splice(queueOldName, 1);

			if (LIR.instances[0].queueData.length > 0){
				LIR.instances[0].storeQueue(function(){
					$("#LIRNotification").slideUp("fast", function(){this.remove();});
				});
			}else{
				delete localStorage[wgUserName + "_LIRQueueData"];
				$("#LIRNotification").slideUp("fast", function(){this.remove();});
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
				document.getElementById("LIRQueue").innerHTML = "<div>" + LIR.getMessage("nothinginqueue") + "</div>";
				document.getElementById("LIRQueueLengthBox").innerHTML = "0";
				LIR.log( LIR.getMessage("queueupdate") );
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
			LIR.log( LIR.getMessage("queueupdate") );
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
		},
	
		addToQueueButton: function(buttonId) {
			if ( $("#fuau-button-" + buttonId).attr("data-fuau-from") != "undefined" && $("#fuau-button-" + buttonId).attr("data-fuau-from") != ""){
				if ( $("#fuau-button-" + buttonId).attr("data-fuau-to") != "undefined" && $("#fuau-button-" + buttonId).attr("data-fuau-to") != ""){
					$("#fuau-button-" + buttonId).css("display", "none");
				
					LIR.instances[buttonId].start("multi", decodeURIComponent( $("#fuau-button-" + buttonId).attr("data-fuau-from") ), decodeURIComponent( $("#fuau-button-" + buttonId).attr("data-fuau-to").replace(/_/g, " ") ), "Using [[w:c:dev:FileUsageAuto-update#Other_features|FileUsageAuto-update]].", function(successful, error){
						if (successful){
							LIR.instances[buttonId].updateStatus(false, LIR.getMessage("success"));
						}
						
						if (typeof error != "undefined"){
							switch (error){
								case "nameinuse":
								case "invalidextension":
								case "destinuse":
									$("#fuau-button-" + buttonId).css("display", "inline-block");
									LIR.showFuauModal( $("#fuau-button-" + buttonId), buttonId, error );
									break;
							}
						}
					});
				}else{
					LIR.showFuauModal( $("#fuau-button-" + buttonId), buttonId, "toundef");
				}
			}else{
				LIR.instances[buttonId].updateStatus(false, LIR.getMessage("varsundef"));
			}
		},
		
		showFuauModal: function(buttonObj, Id, message){
			$.showCustomModal(
				"Queue addition",
				'<fieldset><span> ' + LIR.getMessage(message) + '  ' + LIR.getMessage("trydiffname") + ' </span><br><span style="font-weight:bold">Old file name:</span><br><input disabled id="modalOldName" type="text" style="width:400px" value="' + decodeURIComponent( buttonObj.attr("data-fuau-from") ).replace(/_/g, " ") + '" /><br><span style="font-weight:bold">New file name:</span><br><input id="modalNewName" type="text" style="width:400px" value="' + (typeof buttonObj.attr("data-fuau-to") != "undefined" ? decodeURIComponent( buttonObj.attr("data-fuau-to") ).replace(/_/g, " ") : "") + '" /><br><input id="modalId" type="text" value="' + Id + '" style="display: none;" /></fieldset>',
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
									LIR.addToQueueButton(Id);
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
	LIR.instances[0] = new LIR.constructInstance(0);
	LIR.appendButtonText = "<a style='margin-left: 20px;' class='wikia-button' onclick='LIR.instances[0].start(\"single\")'>" + LIRoptions.singleButtonText + "</a><a style='margin-left: 20px;' class='wikia-button' onclick='LIR.instances[0].start(\"multi\")'>" + LIRoptions.queueButtonText + "</a>";


	LIR.appendButtonText += "<span id='liveLoader-0' style='display:none'><img src='http://slot1.images.wikia.nocookie.net/__cb62004/common/skins/common/progress-wheel.gif' /></span><span id='queueStatus-0' style='font-weight: bold'></span><br /><br /><div style='width: 850px; white-space: normal;'>The <b>\""+LIRoptions.singleButtonText+"\"</b> button updates file usages across pages for a single image, while the <b>\""+LIRoptions.queueButtonText+"\"</b> button adds the file usages of the image to a queue to be updated at one time as a group. When updating file usages using the queue, usages located on like pages are grouped together into one edit, rather than one edit per usage. The queue can be accessed and executed through any file page inside the \"Edit\" drop-down. Please note that a saved queue is local to the browser being used, and does not carry over to other browsers/computers.</div>";
	
	if (LIRoptions.bottomMessage != ""){
		LIR.appendButtonText += ('<br /><div style="font-weight: bold; width: 850px; white-space: normal;">' + LIRoptions.bottomMessage + '</div>');
	}
	
	LIR.appendButtonText += ('<br /><div style="font-weight: bold; width: 850px; white-space: normal;">Script Updated 21st of April, 2014.  More information about updates and functionality can be found <a href="http://dev.wikia.com/wiki/FileUsageAuto-update">here</a>.  Please report bugs or missed replacements <a href="http://dev.wikia.com/wiki/Talk:FileUsageAuto-update">here</a> in detail.</div>');
	
	$('td.mw-submit').append(LIR.appendButtonText);
	$('#mw-movepage-table tr:eq(4)').after('<tr><td></td><td class="mw-input"><label><input type="checkbox" id="LIRNamespaceToggleCheck" onchange="LIR.updateNamespaceSelection()" ' + localStorage[wgUserName + "_LIRNamespaceSelection"] + '>&nbsp;Include <span style="font-weight: bold">links</span> in all namespaces eg: [[:File:File.png]] <span style="font-size: 9px;">(only includes Main by default) only affects ' + LIRoptions.singleButtonText + ' option</span></label></td></tr>');
}else if (wgCanonicalNamespace == "File" && Storage){
	/* File page */
	LIR.instances[0] = new LIR.constructInstance(0);
	$("#WikiaPageHeader nav ul").append("<li><a onclick='LIR.showQueueModal()'>Queue</a></li>");
	if (typeof localStorage[wgUserName + "_LIRQueueData"] !== "undefined"){
		LIR.instances[0].queueData = JSON.parse(localStorage[wgUserName + "_LIRQueueData"]);
	
	
		for (var i in LIR.instances[0].queueData){
			if (wgTitle.match(new RegExp(LIR.instances[0].queueData[i].oldImage.replace(/\*/g, "\\*").replace(/\?/g, "\\?").replace(/\./g, "\\.").replace(/( |_)/g, "[ _]*?").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\+/g, "\\+"), "gi") ) != null){
				$("#WikiaArticle").prepend('<table id="LIRNotification" class="metadata plainlinks ambox ambox-notice" style="border-left: 10px solid lightgreen;"><tbody><tr><td class="mbox-image"><div style="width: 52px;"><img alt="" src="http://upload.wikimedia.org/wikipedia/commons/b/bd/Checkmark_green.svg" width="46" height="40"></div></td><td class="mbox-text" style="">This image is currently in your queue to be renamed!<br>New name: <span style="font-weight: bold;">'+LIR.instances[0].queueData[i].newImage+'</span></td></tr><tr><td>&nbsp;</td><td style="text-align: right;"><a onclick="LIR.removeFromQueue(' + i + ')" style="cursor: pointer">Remove from queue</a></td></tr></tbody></table>');
				break;
			}
		}
	}
}else if ($(".fuau").length > 0){
	/* Add to queue button */
	LIR.buttonIndex = 0;
	$(".fuau").each(function(){
		LIR.instances[LIR.buttonIndex] = new LIR.constructInstance(LIR.buttonIndex);
		$(this).html("<a class='wikia-button' id='fuau-button-" + LIR.buttonIndex + "' data-fuau-from='" + $(this).attr('data-fuau-from') + "' data-fuau-to='" + $(this).attr('data-fuau-to') + "' onclick='LIR.addToQueueButton(" + LIR.buttonIndex + ")'>Add to queue</a><span id='liveLoader-" + LIR.buttonIndex + "' style='display:none'><img src='http://slot1.images.wikia.nocookie.net/__cb1395341051/common/skins/common/images/ajax.gif' /></span><span id='queueStatus-" + LIR.buttonIndex + "' style='font-weight: bold'></span>");
		LIR.buttonIndex++;
	});
	delete LIR.buttonIndex;
}

//</nowiki>
//</source>
