/**
 * Secure logging mechanism
 *
 * @author Eric Mann <eric@eamann.com>
 *
 * MIT License.
 */

'use strict';

/**
 * Module dependencies
 */
var fs = require( 'fs' ),
	cli = new (require( './cli' )),
	util = require( './util' ),
	Entry = require( './entry' ),
	LogFile = require( './logfile' );

/**
 * Batch file container.
 *
 * @param {String} file
 *
 * @constructor
 */
function BatchFile( file ) {
	this.path = file;

	// Attempt to open the file
	this.fd = this.open();

	// If we failed, abort
	if ( false === this.fd ) {
		return util.invalid();
	}

	// Set up some containers
	this.entries = [];
	this.log = false;
	this.logPath = false;
}

/**
 * Get a handle on the batchfile.
 *
 * @returns {Boolean|Number} File descriptor
 */
BatchFile.prototype.open = function() {
	var fd;

	try {
		fd = fs.openSync( this.path, 'r+' );
	} catch ( e ) {
		return false;
	}

	return fd;
};

/**
 * Read the first line of the batchfile to get a handle on our logfile.
 *
 * @returns {Boolean}
 */
BatchFile.prototype.getData = function() {
	var dataBuffer = new Buffer( 0 ),
		intermediateBuffer,
		position = 0,
		bytesRead;

	do {
		intermediateBuffer = new Buffer( 128 );
		bytesRead = fs.readSync( this.fd, intermediateBuffer, 0, 128, position );
		intermediateBuffer = intermediateBuffer.slice( 0, bytesRead );

		// Concatenate allthethings
		var oldBuffer = new Buffer( dataBuffer );
		dataBuffer = Buffer.concat( [ oldBuffer, intermediateBuffer ] );

		// Increment a chunk
		position += 128;
	} while( 128 === bytesRead );

	// Split our entries up
	var lineBuffers = util.splitBuffer( dataBuffer, '\n' ),
		batch = this; // Safety outside of the closure!
	for ( var i = 0, l = lineBuffers.length; i < l; i++ ) {
		var line = lineBuffers[ i ];

		var lineString = line.toString(),
			lineArgv = lineString.split( ' ' );

		// Validate the entry's arguments
		var append = cli.validate_append_args( lineArgv );

		// If we've got a batch in a batch, report invalid and skip
		if ( 'entry' !== append.type ) {
			process.stdout.write( 'invalid' );
			return;
		}

		// If we don't have a log, let's get one!
		if ( false === batch.log ) {
			try {
				batch.log = new LogFile( append.file, append.key );
			} catch ( e ) {
				return util.invalid();
			}

			// Validate our secret key
			if ( ! batch.log.isValidSecret() ) {
				return util.invalid();
			}
		}

		// Parse the entry
		var entry = new Entry( {
			'name'   : append.name,
			'type'   : append.visitor_type,
			'action' : append.action,
			'room'   : append.room,
			'time'   : append.time,
			'secret' : append.key,
			'logfile': append.file
		} );

		batch.entries.push( entry );
	}

	// Set up our key based on the first item
	var first = this.entries[0];
	this.key = first.secret;
	this.logPath = first.logfile;

	return true;
};

/**
 * Export the module
 */
module.exports = BatchFile;