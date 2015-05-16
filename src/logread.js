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
var _ = require( 'lodash' ),
	cli = new (require( './lib/cli' )),
	LogFile = require( './lib/logfile' ),
	Query = require( './lib/query' ),
	util = require( './lib/util' );

var argv = process.argv.slice( 2 );

/**
 * Print out 3 or more lines:
 * - Employees, comma-separated
 * - Guests, comma-separated
 * - Rooms occupied (ignore the lobby)
 *
 * @param {LogFile} log
 *
 * @returns {Boolean}
 */
function getStatus( log ) {
	var employees = log.meta.activeEmployees.sort().join( ',' ),
		guests = log.meta.activeGuests.sort().join( ',' );

	// Massage our occupant data
	var rooms = {};
	_.forEach( log.meta.locations, function( room, occupant ) {
		if ( 'lobby' === room ) {
			// Skip the lobby
			return;
		}

		room = parseInt( room, 10 );
		if ( isNaN( room ) ) {
			// Error checking
			return;
		}

		if ( undefined === rooms[ room ] ) {
			rooms[ room ] = [];
		}

		rooms[ room ].push( occupant );
	} );

	// Get ordered room keys
	var roomKeys = _.keys( rooms ).sort( util.numOrderA );

	// Build out our output
	var roomOutput = [];
	for ( var i = 0, l = roomKeys.length; i < l; i++ ) {
		var key = roomKeys[ i],
			room = rooms[ key ];

		roomOutput.push( key.toString() + ': ' + room.sort().join( ',' ) );
	}

	// Concatenate room data
	rooms = roomOutput.join( '\n' );

	process.stdout.write( employees + '\n' + guests + '\n' + rooms );

	return true;
}

/**
 * Get the history of a specific visitor.
 *
 * @param {LogFile} log
 * @param {Array}   names
 *
 * @returns {Boolean}
 */
function getHistory( log, names ) {
	var rooms = [];

	// This query only allows one name, so let's validate
	if ( names.length > 1 ) {
		return false;
	}

	// Get the type and name out of the string
	var concatenated = names[0],
		type = concatenated[0],
		name = concatenated.substr( 2 );

	var entries = log.entriesForVisitor( name, type );
	for ( var i = 0, l = entries.length; i < l; i++ ) {
		var entry = entries[ i ];

		// We only want arrivals to rooms, exists are duplicates
		// Also, skip the lobby
		if ( 'lobby' === entry.room || 'L' === entry.action ) {
			continue;
		}

		rooms.push( entry.room );
	}

	// Concatenate room data
	rooms = rooms.join( ',' );

	process.stdout.write( rooms );

	return true;
}

/**
 * Get the total time spent in the gallery by a specific person.
 *
 * @param {LogFile} log
 * @param {Array} names
 *
 * @returns {Boolean}
 */
function getTime( log, names ) {
	var entryTime = false,
		exitTime = false,
		maxTime = 0,
		totalTime;

	// This query only allows one name, so let's validate
	if ( names.length > 1 ) {
		return false;
	}

	// Get the type and name out of the string
	var concatenated = names[0],
		type = concatenated[0],
		name = concatenated.substr( 2 );

	var entries = log.entriesForVisitor( name, type );
	for ( var i = 0, l = entries.length; i < l; i++ ) {
		var entry = entries[ i ];

		// Bump the clock, no matter what!
		maxTime = entry.time;

		// Until the visitor enters the library, we don't care about entries
		if ( false === entryTime && name !== entry.name ) {
			continue;
		}
		// When they first visit the library, we set their entry time
		else if ( false === entryTime ) {
			entryTime = entry.time;
		}
		// When they exit the library, track their exit time
		else if ( 'L' === entry.action && 'lobby' === entry.room ) {
			exitTime = entry.time;
			break;
		}
	}

	// They much never have entered the gallery. We have an error!
	if ( false === entryTime ) {
		return false;
	}
	// If they're still in the gallery, print the max time (now) - their entry time.
	else if ( false === exitTime ) {
		totalTime = maxTime - entryTime;
	}
	// Print out the total time they were around
	else {
		totalTime = exitTime - entryTime;
	}

	process.stdout.write( totalTime.toString() );

	return true;
}

// Validate the query
var query = cli.validate_query();

// If we're invalid exit
if ( 'invalid' === query.status ) {
	return util.invalid();
}

// Extra verification that the query is secure
var lookup = new Query( {
	'logfile': query.file,
	'query'  : query.type,
	'secret' : query.key
} );

if ( ! lookup.isValid() ) {
	return util.invalid();
}

// Get a log file
var log;
try {
	log = new LogFile( lookup.logfile, lookup.secret );
} catch ( e ) {
	return util.integrityViolation();
}

// Validate our security key
if ( ! log.isValidSecret() ) {
	return util.invalid();
}

switch( lookup.query ) {
	case 'S':
		if ( ! getStatus( log ) ) {
			return util.invalid();
		}
		break;
	case 'R':
		if ( ! getHistory( log, query.names ) ) {
			return util.invalid();
		}
		break;
	case 'T':
		if ( ! getTime( log, query.names ) ) {
			return util.invalid();
		}
		break;
	case 'I':
		break;
	default:
		return util.invalid();
}

// Close the file
log.exit();

// Fin
process.exit( 0 );