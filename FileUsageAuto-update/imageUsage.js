					$.getJSON("/api.php?action=query&list=imageusage&iutitle=File:"+encodeURIComponent(oldImageName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27"))+"&iulimit=500&format=json", function(result){
						imageUsage = result.query.imageusage;
						if (console) console.log("Image usage successfully retrieved");
						LIR.queueData = LIR.pageKey = [];
						currentPage = 0;

						/* Adds pages image is used on to window.LIR.pageKey to help keep track of pages in window.LIR.pageData later on */
						for (currentPage = 0; currentPage < imageUsage.length; currentPage++){
							var title = imageUsage[currentPage].title;

							if (LIR.pageKey.indexOf(title) == -1){
								LIR.pageKey[LIR.pageKey.length] = title;
							}
							
							LIR.queueData[LIR.queueData.length] = {
								oldImage: oldImageName,
								newImage: newImageName,
								title: title,
								reason: reason
							}
						}
					});