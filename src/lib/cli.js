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
var util = require( './util' );

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
		if ( '-K' === param ) {
			i += 1;
			append_query.key = argv[ i ];
		}
		// Grab a time parameter
		else if ( '-T' === param ) {
			i += 1;
			append_query.time = argv[ i ];
		}
		// Grab a room parameter
		else if ( '-R' === param ) {
			i += 1;
			append_query.room = argv[ i ];
		}
		// Grab an employee name
		else if ( '-E' === param ) {
			// Only one type is allowed
			if ( type_selected && type_selected !== 'E' ) {
				return append_query;
			}

			i += 1;
			append_query.name = argv[ i ];
			append_query.visitor_type = 'E';
			type_selected = 'E';
		}
		// Grab a guest name
		else if ( '-G' === param ) {
			// Only one type is allowed
			if ( type_selected && type_selected !== 'G' ) {
				return append_query;
			}

			i += 1;
			append_query.name = argv[ i ];
			append_query.visitor_type = 'G';
			type_selected = 'G';
		}
		// Grab an arrive action
		else if ( '-A' === param ) {
			// Only one type is allowed
			if ( action_selected && action_selected !== 'A' ) {
				return append_query;
			}

			append_query.action = 'A';
			action_selected = 'A';
		}
		// Grab a leave action
		else if ( '-L' === param ) {
			// Only one type is allowed
			if ( action_selected && action_selected !== 'L' ) {
				return append_query;
			}

			append_query.action = 'L';
			action_selected = 'L';
		}
		// Are we a batch?
		else if ( '-B' === param ) {
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

	// Make sure the key is valid
	if ( /[^(a-zA-Z0-9)]/gi.test( append_query.key ) ) {
		return append_query;
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
		if ( param === '-K' ) {
			i += 1;
			query.key = argv[ i ];
		}
		// Grab the Status query
		else if ( '-S' === param ) {
			// Only one query type is allowed
			if ( type_selected && type_selected !== 'S' ) {
				return query;
			}

			query.type = 'S';
			type_selected = 'S';
		}
		// Grab the Room query
		else if ( '-R' === param ) {
			// Only one query type is allowed
			if ( type_selected && type_selected !== 'R' ) {
				return query;
			}

			query.type = 'R';
			type_selected = 'R';
		}
		// Grab the Time query
		else if ( '-T' === param ) {
			// Only one query type is allowed
			if ( type_selected && type_selected !== 'T' ) {
				return query;
			}

			query.type = 'T';
			type_selected = 'T';
		}
		// Grab the Collision query
		else if ( '-I' === param ) {
			// Only one query type is allowed
			if ( type_selected && type_selected !== 'I' ) {
				return query;
			}

			query.type = 'I';
			type_selected = 'I';
		}
		// Grab an employee
		else if ( param === '-E' ) {
			i += 1;
			name = argv[i];

			query.names.push( 'E-' + name )
		}
		// Grab a guest
		else if ( param === '-G' ) {
			i += 1;
			name = argv[i];

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

	// Make sure the key is valid
	if ( /[^(a-zA-Z0-9)]/gi.test( query.key ) ) {
		return query;
	}

	// If we're good, we're valid!
	query['status'] = 'valid';

	// Return our processed query
	return query;
};

// Fire the module
module.exports = CLI;