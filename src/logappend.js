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
				success = enterRoom( log, entry.name, entry.room, entry.time );
			}
			break;
		case 'L':
			if ( null === entry.room || 'L' === entry.room ) {
				success = exitGallery( log, entry.name, entry.type, entry.time );
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
	var lineStream = new LineStream(),
		logfile = false;

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

				// If we don't have a log, let's get one!
				if ( false === logfile ) {
					try {
						logfile = new LogFile( append.file, append.key );
					} catch ( e ) {
						return util.invalid();
					}

					// Validate our secret key
					if ( ! logfile.isValidSecret() ) {
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

				// If it's an invalid entry, or if the timestamp fails to validate, err
				if ( ! entry.isValid() || entry.time <= logfile.meta.time ) {
					process.stdout.write( 'invalid' );
					continue;
				}

				// Make sure the entry is for this log
				if ( entry.logfile !== logfile.path || entry.secret !== logfile.passkey ) {
					process.stdout.write( 'invalid' );
					continue;
				}

				// Handle the action
				if ( ! handleAction( logfile, entry ) ) {
					process.stdout.write( 'invalid' );
					continue;
				}

				// Append the log
				logfile.newEntries.push( entry );
			}
		} );

		lineStream.on( 'end', function() {
//			console.log( logfile.newEntries.length );
			if ( logfile ) {
				logfile.close();
			}
			fulfill();
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
		// Get a log file
		var log;
		try {
			log = new LogFile( append.file, append.key );
		} catch ( e ) {
			return util.invalid();
		}

		// Validate our secret key
		if ( ! log.isValidSecret() ) {
			return util.invalid();
		}

		// Parse our entry
		var entry = new Entry( {
			'name'  : append.name,
			'type'  : append.visitor_type,
			'action': append.action,
			'room'  : append.room,
			'time'  : append.time
		} );

		// If it's an invalid entry, or if the timestamp fails to validate, err
		if ( ! entry.isValid() || entry.time <= log.meta.time ) {
			return util.invalid();
		}

		// Handle the action
		if ( ! handleAction( log, entry ) ) {
			return util.invalid();
		}

		// Append the log
		log.newEntries.push( entry );

		// We're done, so let's close the logfile
		log.close();

		break;
	case 'batch':
		handleBatch( append.file ).then(
			function() {
				process.exit( 0 );
			}
		);
		return;

		// We have a batchfile, let's populate it
		if ( ! batch.getData() ) {
			return util.invalid();
		}

		// Handle entries
		for ( var i = 0, l = batch.entries.length; i < l; i++ ) {
			var entry = batch.entries[ i ];

			// If it's an invalid entry, or if the timestamp fails to validate, err
			if ( ! entry.isValid() || entry.time <= batch.log.meta.time ) {
				process.stdout.write( 'invalid' );
				continue;
			}

			// Make sure the entry is for this log
			if ( entry.logfile !== batch.logPath || entry.secret !== batch.key ) {
				process.stdout.write( 'invalid' );
				continue;
			}

			// Handle the action
			if ( ! handleAction( batch.log, entry ) ) {
				process.stdout.write( 'invalid' );
				continue;
			}

			// Append the log
			batch.log.newEntries.push( entry );
		}

		// We're done, so let's close the logfile
		batch.log.close();

		break;
	default:
		return util.invalid();
}

// Fin
process.exit( 0 );