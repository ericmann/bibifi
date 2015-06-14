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
 * @param {Number}  timestamp
 *
 * @returns {Boolean}
 */
function enterGallery( log, name, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( timestamp ) ) {
		return false;
	}

	// Attempt to activate our visitor
	if ( ! log.meta.activateVisitor( name ) ) {
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
 * @param {Number}  room
 * @param {Number}  timestamp
 *
 * @returns {Boolean}
 */
function enterRoom( log, name, room, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	room = parseInt( room, 10 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( room ) || isNaN( timestamp ) ) {
		return false;
	}

	// Make sure the visitor is active
	if ( ! log.meta.visitorIsActive( name ) ) {
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
 * @param {Number}  room
 * @param {Number}  timestamp
 *
 * @return {Boolean}
 */
function exitRoom( log, name, room, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	room = parseInt( room, 10 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( room ) || isNaN( timestamp ) ) {
		return false;
	}

	// Make sure the visitor is active
	if ( ! log.meta.visitorIsActive( name ) ) {
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
 * @param {Number}  timestamp
 *
 * @returns {Boolean}
 */
function exitGallery( log, name, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( timestamp ) ) {
		return false;
	}

	// Remove them from the lobby
	if ( ! log.meta.updateLocation( name, 'L', undefined ) ) {
		return false;
	}

	// Attempt to deactivate the visitor
	if ( ! log.meta.deactivateVisitor( name ) ) {
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
				success = enterGallery( log, entry.name, entry.time );
			} else {
				success = enterRoom( log, entry.name, entry.room, entry.time );
			}
			break;
		case 'L':
			if ( null === entry.room || 'L' === entry.room ) {
				success = exitGallery( log, entry.name, entry.time );
			} else {
				success = exitRoom( log, entry.name, entry.room, entry.time );
			}
			break;
		default:
			success = false;
			break;
	}

	return success;
}

function readBatch( readable ) {

}

/**
 * Handle a batchfile.
 *
 *
 */
function handleBatch( file ) {
	var lineStream = new LineStream();

	return new Promise( function( fulfill, reject ) {
		fs.createReadStream( file )
			.pipe( lineStream );

		lineStream.on( 'readable', function() {
			var line;
			while( null !== ( line = lineStream.read() ) ) {
				var lineArgv = line.toString().match( /\S+/g ),
					append = cli.validate_append_args( lineArgv );

				if ( 'entry' !== append.type ) {
					process.stdout.write( 'invalid' );
					continue;
				}

				appendLog( append, false );
			}
		} );

		lineStream.on( 'end', function() {
			fulfill();
		} );
	} );
}

/**
 * If the log is new, the dump it and don't write an empty file!
 *
 * @param {LogFile} log
 *
 * @return {Boolean}
 */
function maybePurge( log ) {
	// If no entries, truncate and exit
	if ( log.newFile ) {
		fs.closeSync( log.fd );
		fs.unlinkSync( log.path );

		return true;
	}

	return false;
}

/**
 * Append a single logfile.
 *
 * @param {Object}  append
 * @param {Boolean} [exit]
 */
function appendLog( append, exit ) {
	if ( undefined === exit ) {
		exit = true;
	}

	// Get a log file
	var log;
	try {
		log = new LogFile( append.file, append.key );
	} catch ( e ) {
		return util.invalid( exit );
	}

	// Validate our secret key
	if ( ! log.isValidSecret() ) {
		maybePurge( log );

		return util.invalid( exit );
	}

	// The name is really the type and name concatenated
	var type = append.visitor_type.trim()[0];

	// Parse our entry
	var entry = new Entry( {
		'name'  : type + append.name,
		'action': append.action,
		'room'  : append.room,
		'time'  : append.time
	} );


	// If it's an invalid entry, or if the timestamp fails to validate, err
	if ( ! entry.isValid() || entry.time <= log.meta.time ) {
		maybePurge( log );

		return util.invalid( exit );
	}

	// Handle the action
	if ( ! handleAction( log, entry ) ) {
		maybePurge( log );

		return util.invalid( exit );
	}

	// Append the log
	log.newEntries.push( entry );

	// We're done, so let's close the logfile
	log.close();
}

// Validate the entry arguments
var append = cli.validate_append_args();

if ( 'valid' !== append.status ) {
	return util.invalid();
}

switch( append.type ) {
	case 'entry':
		appendLog( append, true );

		break;
	case 'batch':
		handleBatch( append.file ).then(
			function() {
				process.exit( 0 );
			}
		);
		return;
	default:
		return util.invalid();
}

// Fin
process.exit( 0 );