/*
 * Automove tool version 0.3
 * Written by Grunny (http://www.wikia.com/wiki/User:Grunny)
 * Adds three buttons on Special:Log/move
 * "movify" turns revert links into auto move links
 * "movify nr" turns revert links into auto move links with redirect suppressed
 * "move all" then opens all revert links in new windows
 */
 
$( function (){
	if ( document.title.indexOf( 'Move log' ) !== -1 ) {
		var	ug = wgUserGroups.join(' '),
			linktext = '(<a href="javascript:moveLinkify()">movify</a> / <a href="javascript:moveLinkifySuppressed()">movify nr</a> / <a href="javascript:moveEverything()">move all</a>)';
		if ( ug.indexOf( 'staff' ) + ug.indexOf( 'helper' ) + ug.indexOf( 'vstf' ) > -3 ) {
			if( skin == 'oasis' ) {
				$( '#WikiaArticle' ).find( 'div.AdminDashboardArticleHeader' ).after( linktext );
			} else {
				document.getElementById( 'contentSub' ).innerHTML = linktext;
			}
		}
	}
} );
 
function moveLinkify() {
	var	bodyId = (( skin == 'oasis' ) ? '#WikiaArticle' : '#bodyContent');
	$( bodyId ).find( '.mw-logevent-actionlink > a' ).each( function () {
		if ( $( this ).attr( 'href' ).indexOf( 'wpOldTitle' ) > -1 ) {
			$( this ).attr( 'href', $( this ).attr( 'href' ).replace( 'wpMovetalk=0', 'wpMovetalk=1' )  + '&submitmove=true' );
			$( this ).text( $( this ).text() + ' (auto)' );
			$( this ).addClass( 'automovable' );
		}
	} );
}
 
$( function () {
	if ( $.getUrlVar( 'submitmove' ) == 'true' ) {
		document.getElementById( 'movepage' ).wpMove.click();
	}
} );
 
function moveLinkifySuppressed() {
	var	bodyId = (( skin == 'oasis' ) ? '#WikiaArticle' : '#bodyContent');
	$( bodyId ).find( '.mw-logevent-actionlink > a' ).each( function () {
		if ( $( this ).attr( 'href' ).indexOf( 'wpOldTitle' ) > -1 ) {
			$( this ).attr( 'href', $( this ).attr( 'href' ).replace( 'wpMovetalk=0', 'wpMovetalk=1' )  + '&wpLeaveRedirect=0&submitmove=true' );
			$( this ).text( $( this ).text() + ' (auto)' );
			$( this ).addClass( 'automovable' );
		}
	} );
}
 
function moveEverything() {
	var	bodyId = (( skin == 'oasis' ) ? '#WikiaArticle' : '#bodyContent');
	$( bodyId ).find( '.mw-logevent-actionlink > a.automovable' ).each( function () {
		window.open( $( this ).attr( 'href' ) );
	} );
}