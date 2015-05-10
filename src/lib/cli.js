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
	minimist = require( 'minimist' );

/**
 * Object constructor and arg parser.
 *
 * @constructor
 */
function CLI() {
	this.argv = minimist( process.argv.slice( 2 ) );
}

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
 * Process a minimist arguments array into a generic object with some status.
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