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
	util = require( './util' );

/**
 * Object constructor and arg parser.
 *
 * @constructor
 */
function CLI() {
	this.argv = process.argv.slice( 2 );
}

/**
 * Attempt to validate and parse an entry.
 *
 * @param {Array} [argv]
 */
CLI.prototype.validate_entry = function( argv ) {
	if ( undefined === argv ) {
		// Allow a global array if needed
		argv = this.argv;
	}

	var data = {
			'status': 'invalid',
			'data': {
				'room': 'lobby' // Default behavior
			}
		},
		loaded = {
			'time'   : false,
			'secret' : false,
			'type'   : false,
			'name'   : false,
			'action' : false,
			'room'   : false,
			'logfile': false,
		},
		time, secret, name, room, logfile;

	// Get the logfile first
	logfile = argv.pop();
	logfile = logfile.replace( /[^(a-zA-Z0-9_)]/g, '' );
	if ( '' === logfile ) {
		return data;
	}

	data.data['logfile'] = logfile;

	// Loop through the array of args
	do {
		var param = argv.shift();
		switch( param ) {
			case '-T':
				if ( loaded.time ) {
					return data;
				}

				loaded.time = true;

				// Get the next parameter and assume it's the time
				time = argv.shift();
				time = parseInt( time, 10 );
				if ( isNaN( time ) ) {
					return data;
				}

				data.data['time'] = Math.abs( time );
				break;
			case '-K':
				if ( loaded.secret ) {
					return data;
				}

				loaded.secret = true;

				// Get the next parameter and assume it's the key
				secret = argv.shift();
				secret = secret.replace( /[^(a-zA-Z0-9)]/g, '' );
				if ( '' === secret ) {
					return data;
				}

				data.data['secret'] = secret;
				break;
			case '-E':
				if ( loaded.type ) {
					return data;
				}
				loaded.type = true;

				name = argv.shift();
				name = name.replace( /[^(a-zA-Z)]/g, '' );
				if ( '' === name ) {
					return data;
				}

				data.data['type'] = 'E';
				data.data['name'] = name;
				break;
			case '-G':
				if ( loaded.type ) {
					return data;
				}
				loaded.type = true;

				name = argv.shift();
				name = name.replace( /[^(a-zA-Z)]/g, '' );
				if ( '' === name ) {
					return data;
				}

				data.data['type'] = 'G';
				data.data['name'] = name;
				break;
			case '-A':
				if ( loaded.action ) {
					return data;
				}
				loaded.action = true;

				data.data['action'] = 'A';
				break;
			case '-L':
				if ( loaded.action ) {
					return data;
				}
				loaded.action = true;

				data.data['action'] = 'L';
				break;
			case '-R':
				if ( loaded.room ) {
					return data;
				}

				loaded.room = true;

				// Get the next parameter and assume it's the key
				room = argv.shift();
				room = parseInt( room, 10 );
				if ( isNaN( room ) ) {
					return data;
				}

				data.data['room'] = room;
				break;
			default:
				// If we're here, it means we had an illegal entry.
				return data;
		}
	} while ( argv.length > 0 );

	// If we're good, we're valid
	data['status'] = 'valid';

	// Return our processed entry
	return data;
};

/**
 * Attempt to validate and parse a query.
 *
 * @param {Array} [argv]
 */
CLI.prototype.validate_query = function( argv ) {
	if ( undefined === argv ) {
		// Allow a global array if needed
		argv = this.argv;
	}

	var query = {
			'status': 'invalid',
			'params': {}
		},
		parsed = {
			'secret': false,
			'query' : false,
			'type'  : false,
		},
		logfile, secret;

	// Get the logfile first
	logfile = argv.pop();
	logfile = logfile.replace( /[^(a-zA-Z0-9_)]/g, '' );
	if ( '' === logfile ) {
		return data;
	}

	query.params['logfile'] = logfile;

	// Loop through the array of args
	do {
		var param = argv.shift();
		switch( param ) {
			case '-K':
				if ( parsed.secret ) {
					return query;
				}

				parsed.secret = true;

				// Get the next parameter and assume it's the key
				secret = argv.shift();
				secret = secret.replace( /[^(a-zA-Z0-9)]/g, '' );
				if ( '' === secret ) {
					return query;
				}

				query.params['secret'] = secret;
				break;
			case '-S':
				if ( parsed.query ) {
					return query;
				}
				parsed.query = true;
				query.params['query'] = 'S';


				break;
			case '-R':
				if ( parsed.query ) {
					return query;
				}
				parsed.query = true;
				query.params['query'] = 'R';

				break;
			case '-T':
				if ( parsed.query ) {
					return query;
				}
				parsed.query = true;
				query.params['query'] = 'T';

				process.stdout.write( 'unimplemented' ); process.exit();
				break;
			case '-I':
				if ( parsed.query ) {
					return query;
				}
				parsed.query = true;
				query.params['query'] = 'I';

				process.stdout.write( 'unimplemented' ); process.exit();
				break;
			default:
				// If we're here, it means we had an illegal entry.
				return query;
		}
	} while ( argv.length > 0 );

	// If we're good, we're valid
	query['status'] = 'valid';

	// Return our processed query
	return query;
};

// Fire the module
module.exports = CLI;