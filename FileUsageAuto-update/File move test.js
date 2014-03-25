array1 = [
	File1.png,
	File2.png,
	File3.png,
	File4.png,
	File5.png,
	File6.png,
	File7.png,
	File8.png,
	File9.png,
	File10.png
]

array2 = [
	File10.png,
	File20.png,
	File30.png,
	File40.png,
	File50.png,
	File60.png,
	File70.png,
	File80.png,
	File90.png,
	File100.png
]




moveFiles: function(arrayOne, arrayTwo, callback) {
	/* Arrays are assumed to be the same length */
	for (var index = 0; index < arrayOne.length; index++){
		$.ajax({
			url: "/api.php",
			type: "POST",
			async: true,
			data: {
				action: "move",
				from: "File:" + arrayOne[index],
				to: "File:" + arrayTwo[index],
				reason: "Testing file moving",
				movetalk: true,
				noredirect: true,
				ignorewarnings: true,
				token: mediaWiki.user.tokens.get("editToken"),
				format: "json"
			},
			contentType: "application/x-www-form-urlencoded",
			success: function(result){
				if (typeof result.error === "undefined"){
					if (console) console.log("Moved file \"" + arrayOne[index] + "\" to \"" + arrayTwo[index] + "\"");

					/* Call callback if exists */
					if (typeof(callback) === "function" && index++ == arrayOne.length){
						callback(index);
					}
				}else{
					if (console) console.log("Unable to move file \"" + arrayOne[index] + "\" to \"" + arrayTwo[index] + "\" for reason: " + result.error.code + ".");
					
					if (typeof(callback) === "function" && index++ == arrayOne.length){
						callback(index);
					}
				}
			}
		});
	}
}