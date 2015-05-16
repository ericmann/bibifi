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
		log_parsed = false,
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
			if ( log_parsed ) {
				return append_query;
			}

			append_query.file = param;
			log_parsed = true;
		}
	}

	// If we're good, we're valid
	append_query['status'] = 'valid';

	// Return our processed entry
	return append_query;
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
			'type'  : 'S',
			'status': 'invalid',
			'key'   : null,
			'names' : [],
			'file'  : null
		},
		log_parsed = false,
		type_selected = false,
		param, name;

	for ( var i = 0, l = argv.length; i < l; i ++ ) {
		param = argv[i];

		// Grab a key parameter
		if ( param.indexOf( '-K' ) === 0 ) {
			// If the key is standalone
			if ( param === '-K' ) {
				i += 1;
				query.key = argv[ i ];
			} else {
				query.key = param.replace( '-K', '' );
			}
		}
		// Grab the Status query
		else if ( param.indexOf( '-S' ) === 0 ) {
			// Only one query type is allowed
			if ( type_selected && type_selected !== 'S' ) {
				return query;
			}

			query.type = 'S';
			type_selected = 'S';
		}
		// Grab the Room query
		else if ( param.indexOf( '-R' ) === 0 ) {
			// Only one query type is allowed
			if ( type_selected && type_selected !== 'R' ) {
				return query;
			}

			query.type = 'R';
			type_selected = 'R';
		}
		// Grab the Time query
		else if ( param.indexOf( '-T' ) === 0 ) {
			// Only one query type is allowed
			if ( type_selected && type_selected !== 'T' ) {
				return query;
			}

			query.type = 'T';
			type_selected = 'T';
		}
		// Grab the Collision query
		else if ( param.indexOf( '-I' ) === 0 ) {
			process.stdout.write( 'unimplemented' );
			process.exit( 0 );
		}
		// Grab an employee
		else if ( param.indexOf( '-E' ) === 0 ) {
			if ( param === '-E' ) {
				i += 1;
				name = argv[i];
			} else {
				name = param.replace( '-E', '' );
			}

			query.names.push( 'E-' + name )
		}
		// Grab a guest
		else if ( param.indexOf( '-G' ) === 0 ) {
			if ( param === '-G' ) {
				i += 1;
				name = argv[i];
			} else {
				name = param.replace( '-G', '' );
			}

			query.names.push( 'G-' + name )
		}
		// Get the logfile name
		else {
			if ( log_parsed ) {
				return query;
			}

			query.file = param;
			log_parsed = true;
		}
	}

	// If we're good, we're valid!
	query['status'] = 'valid';

	// Return our processed query
	return query;
};

// Fire the module
module.exports = CLI;