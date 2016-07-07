var pgnsToFens = require('./pgnsToFens/processPgns');

module.exports = function(options) {

	return function(pgnText, cb) {
		console.log("Process games starts");
		var separated = pgnsToFens(pgnText);
		console.log(separated);
		return;
		console.log(separated[0]);
		console.log("-----------------")
		console.log(separated[1]);
		return 1;
	}
}