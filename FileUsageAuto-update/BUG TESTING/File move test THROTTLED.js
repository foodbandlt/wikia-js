array1 = [
	"File1.png",
	"File2.png",
	"File3.png",
	"File4.png",
	"File5.png",
	"File6.png",
	"File7.png",
	"File8.png",
	"File9.png",
	"File10.png"
]

array2 = [
	"File1Test.png",
	"File2Test.png",
	"File3Test.png",
	"File4Test.png",
	"File5Test.png",
	"File6Test.png",
	"File7Test.png",
	"File8Test.png",
	"File9Test.png",
	"File10Test.png"
]

/*
@Param Beginning name
@Param Ending name
@Param Index of array
@param Callback
*/

function moveFile(arrayOne, arrayTwo, index, callback){
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
			}else{
				if (console) console.log("Unable to move file \"" + arrayOne[index] + "\" to \"" + arrayTwo[index] + "\" for reason: \"" + result.error.code + "\".");	
			}
			
			if (typeof(callback) === "function" && (index+1) != arrayOne.length){
				callback(arrayOne, arrayTwo, index+1, callback);
			}
		}
	});
}

/*****************************
Swap param 1 and 2 as needed after each test.

moveFile(array1, array2, 0, function(arrayOne, arrayTwo, index, callback){
	moveFile(arrayOne, arrayTwo, index, callback);
	}
);

*****************************/