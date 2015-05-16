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
var log = new LogFile( lookup.logfile, lookup.secret );

switch( lookup.query ) {
	case 'S':
		// Print out 3 or more lines:
		// - Employees, comma-separated
		// - Guests, comma-separated
		// - Rooms occupied (ignore the lobby)
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
		break;
	case 'R':
		break;
	case 'T':
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