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
			'data': {}
		},
		valid_command = true;

	// Make sure no duplicate commands - T, K, E, G, A, L
	var counts = _.countBy( argv, _.identity );
	if ( counts['-T'] > 1 || counts['-K'] > 1 || counts['-E'] > 1 || counts['-G'] > 1 || counts['-A'] > 1 || counts['-L'] > 1 ) {
		return util.invalid();
	}

	// Ensure no contradictory situations
	if ( ( counts['-A'] > 0 && counts['-L'] > 0 ) || ( counts['-E'] > 0 && counts['-G'] > 0 ) ) {
		return util.invalid();
	}

	// Logfile
	var logfile = _.last( argv );
	logfile = logfile.replace( /[^(a-zA-Z0-9_)]/g, '' );
	if ( '' === logfile ) {
		valid_command = false;
		data.data['logfile'] = null;
	} else {
		data.data['logfile'] = logfile;
	}

	// Time
	var time_index = _.indexOf( argv, '-T' );
	if ( -1 === time_index ) {
		valid_command = false;
		data.data[time] = 0;
	} else {
		var time = argv[ time_index + 1 ];
		time = parseInt( time, 10 );
		if ( isNaN( time ) ) {
			valid_command = false;
			data.data[time] = 0;
		} else {
			data.data['time'] = Math.abs( time );
		}
	}

	// Secret
	var secret_index = _.indexOf( argv, '-K' );
	if ( -1 === secret_index ) {
		valid_command = false;
		data.data['secret'] = null;
	} else {
		var secret = argv[ secret_index + 1 ];
		secret = secret.replace( /[^(a-zA-Z0-9)]/g, '' );
		if ( '' === secret ) {
			valid_command = false;
			data.data['secret'] = null;
		} else {
			data.data['secret'] = secret;
		}
	}

	// Action
	if ( -1 !== _.indexOf( argv, '-A' ) ) {
		// Great, they're arriving!
		data.data['action'] = 'A';
	} else if ( -1 !== _.indexOf( argv, '-L' ) ) {
		// Great, they're leaving!
		data.data['action'] = 'L';
	} else {
		// Whoops!
		valid_command = false;
		data.data['action'] = null;
	}

	// Room
	var room_index = _.indexOf( argv, '-R' );
	if ( -1 !== room_index ) {
		var room = argv[ room_index + 1 ];
		room =  parseInt( room, 10 );
		if ( isNaN( room ) ) {
			valid_command = false;
			data.data['room'] = null;
		} else {
			data.data['room'] = room;
		}
	} else {
		data.data['room'] = 'lobby';
	}

	// Type
	var type_index;
	if ( -1 !== ( type_index = _.indexOf( argv, '-E' ) ) ) {
		// Great, they're an employee!
		data.data['type'] = 'E';
	} else if ( -1 !== ( type_index = _.indexOf( argv, '-G' ) ) ) {
		// Great, they're a guest!
		data.data['type'] = 'G';
	} else {
		// Whoops!
		valid_command = false;
		data.data['type'] = null;
	}

	// Name
	if ( null !== data.data['type'] ) {
		// Only move forward if we know what type the visitor is
		var name = argv[ type_index + 1 ];
		name = name.replace( /[^(a-zA-Z)]/g, '' );
		if ( '' === name ) {
			valid_command = false;
			data.data['name'] = null;
		} else {
			data.data['name'] = name;
		}
	}

	// If we're good, we're valid
	if ( valid_command ) {
		data['status'] = 'valid';
	}

	// Return our processed entry
	return data;
};

/**
 * Process a batchfile request.
 *
 * @param {Object} argv
 *
 * @returns {Object}
 */
function process_batch( argv ) {
	var data = {
		'status': 'invalid',
		'data': {
			'batchfile': argv['B']
		}
	};

	// Make sure there are no extra parameters
	var valid_command = true;
	_.forEach( argv, function( value, key ) {
		if ( ! _.contains( ['_', 'B' ], key ) ) {
			valid_command = false;
		}
	} );

	// Make sure only one log is passed
	if ( argv['_'].length > 0 ) {
		valid_command = false;
	}

	// If we're good, we're valid
	if ( valid_command ) {
		data['status'] = 'valid';
	}

	return data;
}

/**
 * Process a regular entry.
 *
 * @param {Object} argv
 *
 * @returns {Object}
 */
function process_entry( argv ) {
	var data = {
		'status': 'invalid',
		'data': {}
		},
		valid_command = true;

	// Time
	var time = parseInt( argv['T'], 10 );
	if ( isNaN( time ) ) {
		valid_command = false;
	}
	data.data['time'] = Math.abs( time );

	// Secret
	data.data['secret'] = argv['K'];

	// Action
	if ( argv['L'] && ! argv['A'] ) {
		data.data['action'] = 'L'
	} else if ( argv['A'] && ! argv['L'] ) {
		data.data['action'] = 'A'
	} else {
		valid_command = false;
	}

	// Room
	if ( undefined === argv['R'] ) {
		data.data['room'] = undefined;
	} else {
		var room = parseInt( argv['R'], 10 );

		if ( isNaN( room ) ) {
			valid_command = false;
		} else {
			data.data['room'] = Math.abs( room );
		}
	}

	// Type
	if ( undefined !== argv['E'] && undefined !== argv['G'] ) {
		valid_command = false;
	}

	// Name
	if ( undefined !== argv['E'] ) {
		data.data['name'] = argv['E'];
		data.data['type'] = 'E';
	} else if ( undefined !== argv['G'] ) {
		data.data['name'] = argv['G'];
		data.data['type'] = 'G';
	} else {
		valid_command = false;
	}

	// Logfile
	if ( ! _.isEmpty( argv['_'] ) && 1 === argv['_'].length ) {
		data.data['logfile'] = argv['_'][0];
	} else {
		valid_command = false;
	}

	// Make sure there are no extra parameters
	_.forEach( argv, function( value, key ) {
		if ( ! _.contains( ['_', 'T', 'K', 'A', 'L', 'R', 'E', 'G' ], key ) ) {
			valid_command = false;
		}
	} );

	// Make sure only one log is passed
	if ( argv['_'].length !== 1 ) {
		valid_command = false;
	}

	// If we're good, we're valid
	if ( valid_command ) {
		data['status'] = 'valid';
	}

	return data;
}

/**
 * Process an arguments array into a generic object with some status.
 *
 * @returns {Object}
 */
CLI.prototype.append_parsed = function() {
	// Process a batch file
	if ( undefined !== this.argv['B'] ) {
		return process_batch( this.argv );
	}

	return process_entry( this.argv );
};

// Fire the module
module.exports = CLI;