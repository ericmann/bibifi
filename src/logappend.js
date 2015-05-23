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
	LineStream = require( 'byline' ).LineStream,
	cli = new (require( './lib/cli' )),
	LogFile = require( './lib/logfile' ),
	util = require( './lib/util' ),
	Entry = require( './lib/entry' );

var argv = process.argv.slice( 2 );

/**
 * Mark a visitor as having entered the gallery.
 *
 * If the name is a duplicate (Guests and Employees cannot share names), return false.
 * If the visitor is already in the gallery, return false.
 *
 * Return true after inserting the record.
 *
 * @param {LogFile} log
 * @param {String}  name
 * @param {String}  type Either E or G
 * @param {Number}  timestamp
 *
 * @returns {Boolean}
 */
function enterGallery( log, name, type, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	type = type.toUpperCase().replace( /[^(E|G)]/g, '' ).substring( 0, 1 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || '' === type || isNaN( timestamp ) ) {
		return false;
	}

	// Attempt to activate our visitor
	if ( ! log.meta.activateVisitor( type, name ) ) {
		return false;
	}

	// Add a location entry
	if ( ! log.meta.updateLocation( name, undefined, 'L' ) ) {
		return false;
	}

	// Update the timestamp
	log.meta.time = timestamp;

	// All good, move on!
	return true;
}

/**
 * Mark a visitor as having entered a room.
 *
 * If they're in another room already, return false.
 * If they're not in the gallery, return false.
 *
 * @param {LogFile} log
 * @param {String}  name
 * @param {String}  type
 * @param {Number}  room
 * @param {Number}  timestamp
 *
 * @returns {Boolean}
 */
function enterRoom( log, name, type, room, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	room = parseInt( room, 10 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( room ) || isNaN( timestamp ) ) {
		return false;
	}

	// Make sure the visitor is active
	if ( ! log.meta.visitorIsActive( name, type) ) {
		return false;
	}

	// Update their location
	if ( ! log.meta.updateLocation( name, 'L', room ) ) {
		return false;
	}

	// Update the timestamp
	log.meta.time = timestamp;

	// All good, move on!
	return true;
}

/**
 * Mark a visitor as having left a room.
 *
 * @param {LogFile} log
 * @param {String}  name
 * @param {String}  type
 * @param {Number}  room
 * @param {Number}  timestamp
 *
 * @return {Boolean}
 */
function exitRoom( log, name, type, room, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	room = parseInt( room, 10 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( room ) || isNaN( timestamp ) ) {
		return false;
	}

	// Make sure the visitor is active
	if ( ! log.meta.visitorIsActive( name, type ) ) {
		return false;
	}

	// Update their location
	if ( ! log.meta.updateLocation( name, room, 'L' ) ) {
		return false;
	}

	// Update the timestamp
	log.meta.time = timestamp;

	// All good, move on!
	return true;
}

/**
 * Mark a visitor as having left the gallery.
 *
 * @param {LogFile} log
 * @param {String}  name
 * @param {String}  type
 * @param {Number}  timestamp
 *
 * @returns {Boolean}
 */
function exitGallery( log, name, type, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	type = type.toUpperCase().replace( /[^(E|G)]/g, '' ).substring( 0, 1 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || '' === type || isNaN( timestamp ) ) {
		return false;
	}

	// Remove them from the lobby
	if ( ! log.meta.updateLocation( name, 'L', undefined ) ) {
		return false;
	}

	// Attempt to deactivate the visitor
	if ( ! log.meta.deactivateVisitor( type, name ) ) {
		return false;
	}

	// Update the timestamp
	log.meta.time = timestamp;

	// All good, move on!
	return true;
}

/**
 * Handle entries and exits.
 *
 * @param {LogFile} log
 * @param {Entry}   entry
 *
 * @returns {Boolean}
 */
function handleAction( log, entry ) {
	var success;
	switch( entry.action ) {
		case 'A':
			if ( null === entry.room || 'L' === entry.room ) {
				success = enterGallery( log, entry.name, entry.type, entry.time );
			} else {
				success = enterRoom( log, entry.name, entry.type, entry.room, entry.time );
			}
			break;
		case 'L':
			if ( null === entry.room || 'L' === entry.room ) {
				success = exitGallery( log, entry.name, entry.type, entry.time );
			} else {
				success = exitRoom( log, entry.name, entry.type, entry.room, entry.time );
			}
			break;
		default:
			success = false;
			break;
	}

	return success;
}

/**
 * Validate entry.
 *
 * @param {LogFile} logFile
 * @param {Entry}   entry
 *
 * @returns {Boolean}
 */
function validateEntry( logFile, entry ) {
	// Validate our secret key
	if ( ! logFile.isValidSecret() ) {
		return false;
	}

	// If it's an invalid entry, or if the timestamp fails to validate, err
	if ( ! entry.isValid() || entry.time < logFile.meta.time ) {
		return false;
	}

	return true;
}

/**
 * Handle a specific entry.
 *
 * @param {Object} append
 *
 * @returns {Promise}
 */
function handleEntry( append ) {
	var logFile = new LogFile( append.file, append.key );

	// Parse our entry
	var entry = new Entry( {
		'name'  : append.name,
		'type'  : append.visitor_type,
		'action': append.action,
		'room'  : append.room,
		'time'  : append.time
	} );

	return new Promise( function ( fulfill, reject ) {
		logFile.read().then( function () {

			// Handle the action
			if ( ! validateEntry( logFile, entry ) || ! handleAction( logFile, entry ) ) {
				return util.invalid();
			}

			// Append the log
			logFile.newEntries.push( entry );

			// We're done, so let's close the logfile
			logFile.close().then( fulfill );
		} );

	} );
}

/**
 * Handle a batchfile.
 *
 * @param {String} file
 */
function handleBatch( file ) {
	var lineStream = new LineStream(),
		logfile = false;

	return new Promise( function( fulfill, reject ) {
		fs.createReadStream( file )
			.pipe( lineStream );

		var entries = [];

		lineStream.on( 'readable', function() {
			var line;
			while( null !== ( line = lineStream.read() ) ) {

				var lineArgv = line.toString().match( /\S+/g ),
					append = cli.validate_append_args( lineArgv );

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

				if ( 'entry' !== append.type ) {
					process.stdout.write( 'invalid' );
					continue;
				}

				if ( 0 === entries.length ) {
					entries.push( append );
				} else {
					entries.push( entry );
				}
			}
		} );

		lineStream.on( 'end', function() {
			// Process the first entry
			var first = entries.shift();

			handleEntry( first ).then( function() {
				return new Promise( function( fulfill, reject ) {

					var logFile = new LogFile( first.file, first.key );

					logFile.read().then( function() {

						for ( var i = 0, l = entries.length; i < l; i ++ ) {
							var entry = entries[ i ];

							// Make sure the entry is for this log
							if ( ! validateEntry( logFile, entry ) || entry.logfile !== logFile.path || entry.secret !== logFile.passkey ) {
								process.stdout.write( 'invalid' );
							}
							// Handle the action
							else if ( ! handleAction( logFile, entry ) ) {
								process.stdout.write( 'invalid' );
							}
							// Append the log
							else {
								logFile.newEntries.push( entry );
							}
						}

						fulfill( logFile );
					} );
				} ).then( function ( log ) {
						log.close();
					} );
			} );

		} );
	} );
}

// Validate the entry arguments
var append = cli.validate_append_args();

if ( 'valid' !== append.status ) {
	return util.invalid();
}

switch( append.type ) {
	case 'entry':
		handleEntry( append ).then( function() {
			process.exit( 0 );
		} );

		break;
	case 'batch':
		handleBatch( append.file ).then( function() {
			process.exit( 0 );
		} );

		break;
	default:
		return util.invalid();
}