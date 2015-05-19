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
	// Get real names
	var employees = [], guests = [],
		employee_ids = log.meta.activeEmployees,
		guest_ids = log.meta.activeGuests,
		i, l;

	for ( i = 0, l = employee_ids.length; i < l; i++ ) {
		employees.push( log.meta.dictionary[ employee_ids[ i ] ] );
	}

	for ( i = 0, l = guest_ids.length; i < l; i++ ) {
		guests.push( log.meta.dictionary[ guest_ids[ i ] ] );
	}

	employees = employees.sort().join( ',' );
	guests = guests.sort().join( ',' );

	// Massage our occupant data
	var rooms = {},
		people = Object.getOwnPropertyNames( log.meta.locations );

	for ( var i = 0, l = people.length; i < l; i++ ) {
		var occupant = people[ i ],
			room = log.meta.locations[ occupant ];

		if ( 'L' === room ) {
			// Skip the lobby
			continue;
		}

		room = parseInt( room, 10 );
		if ( isNaN( room ) ) {
			// Error checking
			continue;
		}

		if ( undefined === rooms[ room ] ) {
			rooms[ room ] = [];
		}

		rooms[ room ].push( log.meta.dictionary[ occupant ] );
	}

	// Get ordered room keys
	var roomKeys = _.keys( rooms ).sort( util.numOrderA );

	// Build out our output
	var roomOutput = [];
	for ( i = 0, l = roomKeys.length; i < l; i++ ) {
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

	// Get our entries - we only have one visitor, so life is easy!
	var entries = log.entriesForVisitors( [[name,type]] );
	for ( var i = 0, l = entries.length; i < l; i++ ) {
		var entry = entries[ i ];

		// We only want arrivals to rooms, exists are duplicates
		// Also, skip the lobby
		if ( 'L' === entry.room || 'L' === entry.action ) {
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

	var entries = log.entriesForVisitors( [[name, type]] );

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
		else if ( 'L' === entry.action && 'L' === entry.room ) {
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

/**
 * Get a list of all rooms occupied by everyone in the names array.
 *
 * @param {LogFile} log
 * @param {Array}   names
 *
 * Wreturns {Boolean}
 */
function getCollisions( log, names ) {
	var visitors = [],
		testCollection = [],
		i, l;

	// Get our names out of the array
	for ( i = 0, l = names.length; i < l; i++ ) {
		var concatenated = names[ i ];

		var type = concatenated[0],
			name = concatenated.substr( 2 );

		visitors.push( [name, type] );
		testCollection.push( name );
	}

	// Get our entries so we can replay a subset of history
	var entries = log.entriesForVisitors( visitors );

	// Will contain a list of all occupants in a given room at a given time in our following iteration.
	// For example: {'L': ['Mark'], '2': ['Tina','Tony']}
	// Visitors not in the `names` array above will be ignored
	var placeholder = {};

	// Array of rooms occupied by all specified visitors at the same time. Will be push()ed when we find a collision.
	var rooms = [];

	for ( i = 0, l = entries.length; i < l; i++ ) {
		var entry = entries[ i ];

		// Make sure the placeholder exists
		placeholder[ entry.room ] = placeholder[ entry.room ] || [];

		// If this is an entry, add the visitor
		if ( 'A' === entry.action ) {
			placeholder[ entry.room ].push( entry.name );

			if ( 'L' !== entry.room ) {
				// Remove them from the lobby
				_.remove( placeholder['L'], function( item ) { return entry.name === item; } );

				// Do we have a collision? If so, let's record it
				var collection_contains_everyone = _.every( testCollection, function( item ) { return _.contains( placeholder[ entry.room ], item ); } );
				if ( collection_contains_everyone ) {
					rooms.push( entry.room );
				}
			}
		}
		// If it's an exit, remove the visitor
		else if ( 'L' === entry.action ) {
			_.remove( placeholder[ entry.room ], function( item ) { return entry.name === item; } );

			if ( 'L' !== entry.room ) {
				// Add them back to the lobby
				placeholder['L'].push( entry.name );
			}
		}
	}

	rooms = _.uniq( rooms );
	rooms = rooms.sort( util.numOrderA );

	process.stdout.write( rooms.join( ',' ) );

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
		if ( ! getCollisions( log, query.names ) ) {
			return util.invalid();
		}
		break;
	default:
		return util.invalid();
}

// Close the file
log.exit();

// Fin
process.exit( 0 );