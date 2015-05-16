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
 * Parse and somewhat validate the command-line arguments for logappend.
 *
 * If we have certain kinds of collisions, the validation will exit immediately, returning the default status of 'invalid':
 * - Both -E and -G are used
 * - Both -A and -L are used
 *
 * @param {Array} [argv]
 *
 * @returns {Object}
 */
CLI.prototype.validate_append_args = function( argv ) {
	if ( undefined === argv ) {
		// Allow a global array if needed
		argv = this.argv;
	}

	var append_query = {
			'type'        : 'entry',
			'status'      : 'invalid',
			'key'         : null,
			'file'        : null,
			'time'        : null,
			'action'      : null,
			'room'        : null,
			'name'        : null,
			'visitor_type': null
		},
		type_selected = false,
		action_selected = false;

	for ( var i = 0, l = argv.length; i < l; i++ ) {
		var param = argv[i];

		// Grab a key parameter
		if ( param.indexOf( '-K' ) === 0 ) {
			// If the key is standalone
			if ( param === '-K' ) {
				i += 1;
				append_query.key = argv[ i ];
			} else {
				append_query.key = param.replace( '-K', '' );
			}
		}
		// Grab a time parameter
		else if ( param.indexOf( '-T' ) === 0 ) {
			if ( param === '-T' ) {
				i += 1;
				append_query.time = argv[ i ];
			} else {
				append_query.time = param.replace( '-T', '' );
			}
		}
		// Grab a room parameter
		else if ( param.indexOf( '-R' ) === 0 ) {
			if ( param === '-R' ) {
				i += 1;
				append_query.room = argv[ i ];
			} else {
				append_query.room = param.replace( '-R', '' );
			}
		}
		// Grab an employee name
		else if ( param.indexOf( '-E' ) === 0 ) {
			// Only one type is allowed
			if ( type_selected && type_selected !== 'E' ) {
				return append_query;
			}

			if ( param === '-E' ) {
				i += 1;
				append_query.name = argv[ i ];
			} else {
				append_query.name = param.replace( '-E', '' );
			}
			append_query.visitor_type = 'E';
			type_selected = 'E';
		}
		// Grab a guest name
		else if ( param.indexOf( '-G' ) === 0 ) {
			// Only one type is allowed
			if ( type_selected && type_selected !== 'G' ) {
				return append_query;
			}

			if ( param === '-G' ) {
				i += 1;
				append_query.name = argv[ i ];
			} else {
				append_query.name = param.replace( '-G', '' );
			}
			append_query.visitor_type = 'G';
			type_selected = 'G';
		}
		// Grab an arrive action
		else if ( param.indexOf( '-A' ) === 0 ) {
			// Only one type is allowed
			if ( action_selected && action_selected !== 'A' ) {
				return append_query;
			}

			append_query.action = 'A';
			action_selected = 'A';
		}
		// Grab a leave action
		else if ( param.indexOf( '-L' ) === 0 ) {
			// Only one type is allowed
			if ( action_selected && action_selected !== 'L' ) {
				return append_query;
			}

			append_query.action = 'L';
			action_selected = 'L';
		}
		// Are we a batch?
		else if ( param.indexOf( '-B' ) === 0 ) {
			append_query.type = 'batch';
		}
		// Get the logfile name
		else {
			append_query.file = param;
		}
	}

	// If we're good, we're valid
	append_query['status'] = 'valid';

	// Return our processed entry
	return append_query;
};

/**
 * Attempt to validate and parse an entry.
 *
 * @param {Array}   [argv]
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
			case '-B':
				return data;
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
			'name'  : false,
			'type'  : false,
			'query' : false
		},
		logfile, name, secret;

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
			case '-E':
				if ( parsed.type ) {
					return query;
				}
				parsed.type = true;

				name = argv.shift();
				name = name.replace( /[^(a-zA-Z)]/g, '' );
				if ( '' === name ) {
					return parsed;
				}

				query.params['type'] = 'E';
				query.params['name'] = name;
				break;
			case '-G':
				if ( parsed.type ) {
					return query;
				}
				parsed.type = true;

				name = argv.shift();
				name = name.replace( /[^(a-zA-Z)]/g, '' );
				if ( '' === name ) {
					return query;
				}

				query.params['type'] = 'G';
				query.params['name'] = name;
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