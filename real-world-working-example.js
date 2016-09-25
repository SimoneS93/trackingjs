var Jimp = require('jimp'),
	getpixels = require('get-pixels'),
	Datastore = require('nedb'),
	db = new Datastore({ filename: 'counts.db', timestampData: true });
	tracking = require('./tracking');


var TRESHOLD      = 50,
	MIN_DIMENSION = 8,
	MAX_DIMENSION = 1000,
	MIN_GROUP     = 100,
	MIN_WIDTH     = 15,
	MIN_HEIGHT    = 15;



function dump(err, res) {
	if (err) {
		console.error('error', err);
		throw err;
	}
	else if (res)
		console.log('res', res);
}


/**
 * Greyscale image for easy processing
 */
function greyscale(fin, fout) {
	console.log('start greyscale');

	Jimp.read(fin).then(function(image) {
		image.greyscale().write(fout, function(err) {
			console.log('done greyscale');

			dump(err);

			pixels(fout);
		});
	}).catch(dump);
}


/**
 * Read image raw pixels
 */
function pixels(fin) {
	getpixels(fin, function(err, data) {
		console.log('done getpixels');

		dump(err);

		track(data);
	});
}


function isValidObject(obj) {
	return obj.width > MIN_WIDTH && obj.height > MIN_HEIGHT;
}


/**
 * Count objects
 */
function track(data) {
	tracking.ColorTracker.prototype.minDimension = MIN_DIMENSION;
	tracking.ColorTracker.prototype.maxDimension = MAX_DIMENSION;
	tracking.ColorTracker.prototype.minGroupSize = MIN_GROUP;
	
	// detect dark pixels
	tracking.ColorTracker.registerColor('dark', function(r, g, b) {
		return r < TRESHOLD && g < TRESHOLD && b < TRESHOLD;
	});

	var tracker = new tracking.ColorTracker(['dark']);

	//  get objects' count
	tracker.on('track', function(event) {
		var objects = event.data,
			valid    = objects.filter(isValidObject);

		console.log('objects found', event.data.length, 'valid', valid.length);

		save(valid.length);
	});

	console.log('start tracking');

	// 
	tracker.track(data.data, data.shape[0], data.shape[1]);
}


/**
 * Save counted objects
 */
function save(count) {
	db.insert({ count: count }, dump);
}


/**
 * Start the processing pipe
 **/
function pipe(fin) {
	greyscale(fin, 'pics/grey.jpg');
}


// run
db.loadDatabase(function (err) {
	dump(err);

	console.log('working on', process.argv[2]);

  	pipe(process.argv[2]);
});
