/* Check if destination file name is in use */
			$.getJSON("/api.php?action=query&prop=revisions&rvprop=content&titles=File:"+encodeURIComponent(newImageName)+"&format=json", function(result){
				if (typeof result.query.pages[-1] === "undefined"){
					/* If not, then get file usage for image */
					$.getJSON("/api.php?action=query&list=imageusage&iutitle=File:"+encodeURIComponent(oldImageName)+"&iulimit=500&format=json", function(result){
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
										newImage: newImageName,
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