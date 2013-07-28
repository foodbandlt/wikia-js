			/* Sets progress checking variables */
			for (i = 0; i<LIR.pageKey.length; i++){
				LIR.requestCompleted[i] = false;
			}
			
			/* Begin getting page contents */
			if (console) console.log("Getting page contents");
			
			/* Calls API for page contents */
			$.post(
				"/api.php",
				{
					action: "query",
					prop: "revisions",
					rvprop: "content",
					titles: LIR.pageKey.join("|"),
					format: "json"
				},
				function(result){
					/* Saves page contents for each page in window.LIR.pageData */
					for (i in result.query.pages){
						keyNum = LIR.pageKey.indexOf(result.query.pages[i].title);
						LIR.pageData[keyNum] = {title: LIR.pageKey[keyNum], content: result.query.pages[i].revisions[0]["*"], changed: false};
					}
					if (console) console.log("Page contents retrieved and saved");
					LIR.log("Page contents retrieved and saved");
					
					if (console) console.log("Begin processing page content.");
					
					for (i=0; i<LIR.pagesMovedData.length; i++){
						LIR.moveFile(i, function(){
							if (LIR.numPagesMoved == LIR.pagesMoved.length){
							
								/* Replacing image name on each page */
								for (i=0; i<LIR.queueData.length; i++){
									pageKey = LIR.pageKey.indexOf(LIR.queueData[i].title);
									escapedName0 = window.LIR.queueData[i].oldImage.replace(/\*/g, "\\*").replace(/\?/g, "\\?").replace(/\./g, "\\.").replace(/ /g, "[ _]*?").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
									
									if ( escapedName0.substr(0,1).match(/[A-z]/i) ){
										escapedName = "[" + escapedName0.substr(0,1).toUpperCase() + escapedName0.substr(0,1).toLowerCase() + "]" + escapedName0.substr(1);
									}else{
										escapedName = escapedName0;
									}
									
									pageReplacement = new RegExp("(\\n[ ]*?|:?File:[ ]*?|=[ ]*?|\\|)" + escapedName + "([ ]*?\\n|[ ]*?\\||\\]|\\})", "g");
									replacementReg = new RegExp(escapedName, "g");
									
									if (LIR.pageData[pageKey].content.search(pageReplacement) != -1){
										LIR.pageData[pageKey].changed = true;
										if (console) console.log("\""+LIR.queueData[i].oldImage+"\" replaced on page \""+LIR.queueData[i].title+"\"");
										
										while ((regExec = pageReplacement.exec(LIR.pageData[pageKey].content)) != null){
											LIR.pageData[pageKey].content = LIR.pageData[pageKey].content.replace(regExec[0], regExec[0].replace(replacementReg, LIR.queueData[i].newImage));
											pageReplacement.lastIndex += (regExec[0].replace(replacementReg, LIR.queueData[i].newImage).length - regExec[0].length) - (regExec[2].length);
										}
										
										if (LIR.pagesMoved.indexOf(LIR.queueData[i].oldImage) == -1 && LIR.type == "multi"){
											LIR.pagesMoved[LIR.pagesMoved.length] = LIR.queueData[i].oldImage;
											LIR.pagesMovedData[LIR.pagesMoved.indexOf(LIR.queueData[i].oldImage)] = {
												oldI: LIR.queueData[i].oldImage,
												newI: LIR.queueData[i].newImage,
												reason: LIR.queueData[i].reason
											}
										}
									}else{
										if (LIR.type == "multi"){
											LIR.failedLog(LIR.queueData[i].oldImage, LIR.queueData[i].newImage, LIR.queueData[i].title);
										}else{
											alert("Unable to find \""+LIR.queueData[i].oldImage+"\" on page \""+LIR.queueData[i].title+"\". Please rename manually.");
										}
									}
								}
							}
						});
					}
					
					LIR.log("Submitting page content");
					if (console) console.log("Begin submitting pages");
					
					/* Adds progress bar for page submission (since this is the longest part) */
					if (LIR.type == "multi"){
						$(".modalToolbar").prepend("<div id='LIRQueueProgress' style='float: left; width: 200px; border: 2px solid black; height: 17px;'><div id='LIRProgressInd' style='width: 0%; height: 100%; float: left; background-color: green;'></div></div>");
						LIR.queueProgress = 0;
					}
					
					/* Submits edited pages */
					for (i=0; i<LIR.pageData.length; i++){
						if (LIR.pageData[i].changed == true){
							LIR.submitChangedPages(i, callback);
						}else{
							LIR.requestCompleted[i] = true;
						}
					}
					
					
					
				},
				"json"
			);