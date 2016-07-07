var fs = require('fs');

// Engine layer dep
var processGames = require('../engineLayer/entry')({
	engineCmd: 'stockfish', // Use stockfish engine
	color: 'w', // Filter out black-to-move positions
	username: 'jussi', // Include only positions where user 'jussi' is to move!
	moves: {
		start: 5, // From move number 5 onwards...
		stop: 15 // ...until move number 15
	},
	mistakeThreshold: 50, // In centipawns, minimum eval change to be classified as mistake
	blunderThreshold: 100, // Minimum eval change to be classified as a blunder
	excludeIfEvalStaysOver: 250, // Math.abs(eval) over 2.5 pawns? Exclude irregardless of change.
	includeHeaders: [
		'White', 'Black', 'Event' // Which headers to include into the response obj
	],
	concurrentEngineProcesses: 1, // How many engine processes are spawned?
	streaming: false // Results streamed back one-by-one or in one big batch?
});

// How I want the engine layer API to be used? The example below.
// First get the text containing pgn games
var testGamesPGNText = fs.readFileSync(__dirname + "/testgames.pgn", "utf8");
// Send the text string to our component's entry function
processGames(testGamesPGNText, function(err, resultsBatch) {
	if (err) throw err;
	console.log(resultsBatch);
});
