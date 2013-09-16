//__NOWYSIWYG__ <source lang="javascript">
//<nowiki>
/**
*
* Description:
* Updates category links in use on the wiki when category is renamed.
*
* @Author Foodbandlt and Jr Mime
*
**/

// Todo: All & Make it work
// Set Special:BlankPage?categoryname=' + mw.config.get('wgTitle'),
// Add the edit summary via api "&summary=" thingy
// Admin only possibly? Teest


// How it will work:
// 1. Get categories on pages
// 2. Create new category name (copy from old to new)
// 3. Fix category name on pages
// 4. Delete (possibly) old category


// BUTTONS (Works)

;(function ($, mw) {
    'use strict';
    $(function () {
        if (mw.config.get('wgAction') !== 'view' || mw.config.get('wgNamespaceNumber') !== 14) {
            return;
        }

        $('.wikia-menu-button .WikiaMenuElement').append(
            $('<li/>').append(
                $('<a/>', {
                    'href': '/index.php?title=Special:BlankPage&blankspecial=categoryrename&categoryname=' + mw.config.get('wgTitle'),
                    'title': 'Rename',
                    'html': 'Rename'
                })
            )
        );
    });
 
}(this.jQuery, this.mediaWiki));




// BLANK PAGE
if( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Blankpage' && $.getUrlVar( 'blankspecial' ) === 'categoryrename' ) {
			document.title = 'Category Rename Auto-Update';
			createCategoryRenameForm();
		}
	} );
} ( mediaWiki, jQuery, window, document ) );
 
function createAjaxDeleteForm() {
        var     pageHeading = ( skin === 'oasis' ) ? ( $( '.AdminDashboardArticleHeader' ).length ? '.AdminDashboardArticleHeader > h1' : '.WikiaPageHeader > h1' ) : 'h1.firstHeading',
                $bodyId = $( '#mw-content-text > p' ),
                bdelFormHtml = '<form method="post" action="/wiki/Special:MovePage?action=submit" id="movepage"><fieldset><legend>Rephrase question or page</legend><table border="0" id="mw-movepage-table"><tr><td class="mw-label">Current name:</td><td class="mw-input"><strong><a href="/wiki/' + mw.config.get('wgTitle') + '" title="'+ mw.config.get('wgTitle') + '>' + mw.config.get('wgTitle') + '</a></strong></td></tr><tr><td class="mw-label"><label for="wpNewTitleMain">Rephrase question:</label></td>';
        $( pageHeading ).text( 'Category Rename Auto-Update' );
        $bodyId.text( 'Using the form below will rename a category, by changing the category names on pages that the category is used one. The old title will be deleted and moved to the old title. Be sure to check <a href="/wiki/Special:WantedCategories>wanted categories</a>. You are responsible for making sure that links continue to point where they are supposed to go.\n\nNote that the page will <strong>note</stronge> be moved if there is already a page to the new title.\n\n<strong>Warning!</strong> This can be drastic and unexpected for a popular page; please be sure you understand the consequences of this before proceeding.');
        $bodyId.after( bdelFormHtml );
};


// Options processing
 
if (typeof CRA === "undefined"){

	CRA = {
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
 
		start: function(type){
 
			/* Checks if function has already started */
			if (CRA.started == true){
				return false;
			}
			
			/* Sets variables used by the function */
			var oldCategoryName = $.getUrlVar("categoryname"),
				newCategoryName = document.getElementById("wpNewTitleMain").value, /////////////////////////TBD
				reason = $("#wpReason").val(); /////////////////////////TBD
			CRA.pageKey = [];
 
			/* Check if destination file name is in use */
			$.getJSON("/api.php?action=query&prop=revisions&rvprop=content&titles=Category:"+encodeURIComponent(newCategoryName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27")+"&format=json", function(result){
				if (typeof result.query.pages[-1] !== "undefined"){
					/* If not, then get file usage for category */
					$.getJSON("/api.php?action=query&list=categorymembers&cmtitle=Category:" + encodeURIComponent(oldCategoryName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27") + "&cmprop=title&cmlimit=5000", function(result){
						var categoryUsage = result.query.categorymembers;
 
						if (console) console.log("Category usage successfully retrieved");
						if (categoryUsage.length > 0){

							/* Adds pages category is used on to window.CRA.pageKey to help keep track of pages in window.CRA.pageData later on */
							for (var currentPage = 0; currentPage < categoryUsage.length; currentPage++){
								var title = categoryUsage[currentPage].title;

								if (CRA.pageKey.indexOf(title) == -1){
									CRA.pageKey[CRA.pageKey.length] = title;
								}

								/* Temporary until Wikia fixes issue with editing blog comments through the API */
								if (title.search(/User blog comment/i) == -1){
									for (i = 0; i <= CRA.queueData.length; i++){
										if (i == CRA.queueData.length){
											CRA.queueData[CRA.queueData.length] = {
												oldCategory: oldCategoryName,
												newCategory: newCategoryName,
												title: title,
												reason: reason
											};
											break;
										}else if (CRA.queueData[i].title == title && CRA.queueData[i].oldCategory == oldCategoryName && CRA.queueData[i].newCategory == newCategoryName){
											break;
										}
									}
								}else{
									CRABlogComment = true;
								}
							}

							/* Temporary until Wikia fixes issue with editing blog comments through the API */
							if (typeof(CRABlogComment) === "undefined"){
								/* Stores queue if renaming multiple categorys, or updates file usage if only renaming one */
								if (CRA.type == "multi"){
									CRA.storeQueue(function() {
										CRA.started = false;
										localStorage.CRAQueuedUpdatesPos++;
										window.location = "/wiki/Category:" + encodeURIComponent(oldCategoryName.replace(/ /g, "_")).replace(/"/g, "%22").replace(/'/g, "%27");
									});
								}else{
									/* This may seem odd, but because I use CRA.processQueue() for both single and multiple category 
										updating, it requires CRA.started to be false to start */
									CRA.started = false;
									CRA.processQueue(function(){
										$("#movepage").submit();
									});
								}
							}else{
								if (typeof CRA.queuePosition !== "undefined"){
									localStorage.CRAQueuedUpdatesPos++;
									delete CRA.queuePosition;
								}
								CRA.updateStatus(false, "File used in blog comment. Unable to update blog comments.");
							}


						}else{
							/* Else, prompt to use normal renaming, since this is kind of pointless otherwise */
							CRA.started = false;
							if (typeof CRA.queuePosition !== "undefined"){
								localStorage.CRAQueuedUpdatesPos++;
								delete CRA.queuePosition;
							}
							CRA.updateStatus(false, "File not being used on any pages");
						}
					});
				}else{
					CRA.started = false;
					if (typeof CRA.queuePosition !== "undefined"){
						localStorage.CRAQueuedUpdatesPos++;
						delete CRA.queuePosition;
					}
					CRA.updateStatus(false, "File name already exists");
				}
			});
 
		},
 
		storeQueue: function(callback){
			/* Standalone function to store the queue in window.localStorage
				uses wgUserName as a variable key so multi-user computers on the same wiki don't get each other's queue */
			localStorage[wgUserName + "_CRAQueueData"] = JSON.stringify(CRA.queueData);
 
			if (typeof(callback) === "function"){
				callback();
			}
 
		},

//</nowiki>
//</source>
