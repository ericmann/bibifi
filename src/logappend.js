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
	fs = require( 'fs' ),
	cli = new (require( './lib/cli' )),
	util = require( './lib/util' ),
	Entry = require( './lib/entry' ),
	Logger = require( './lib/logger' );

var argv = process.argv.slice( 2 ),
	logs = {};

/**
 * Append an entry to a logfile (specified by the entry)
 *
 * @param {Entry}   entry
 * @param {String}  logfile
 * @param {String}  secret
 * @param {Boolean} [handleError]
 */
function appendEntry( entry, logfile, secret, handleError ) {
	if ( undefined === handleError ) {
		handleError = true;
	}

	if ( undefined === logs[ logfile ] ) {

		var log = Logger.prototype.open( logfile, secret );

		// The Logger utility returns error messages when needed
		if ( 'key_err' === log ) {
			process.stdout.write( 'invalid' );
			if ( handleError ) {
				process.exit( 255 );
			}
			return; // Continue to the next entry
		}

		logs[ logfile ] = log;
	}

	logs[ logfile ].append( entry, handleError );
}

// Determine if we have a batchfile or not
if ( _.find( argv, function( item ) { return item.indexOf( '-B' ) == 0; } ) ) {
	var batch, file, i, l;

	// Get the batchfile name
	for ( i = 0, l = argv.length; i < l; i++ ) {
		if ( argv[ i ].indexOf( '-B' ) === 0 ) {
			continue;
		}

		batch = argv[ i ];
		break;
	}

	// Load the batchfile
	try {
		file = fs.readFileSync( batch );
		file = file.toString();
	} catch ( e ) {
		return util.invalid();
	}

	var lines = file.split( '\n' );

	// Get an entry for each line in the batchfile
	var entries = [];

	// Validate each entry in the batchfile
	for ( i = 0, l = lines.length; i < l; i ++ ) {
		var line = lines[ i ];

		if ( '' === line.trim() ) {
			continue;
		}

		var line_argv = line.split( /\s/ ),
			line_entry = cli.validate_entry( line_argv );

		if ( 'invalid' === line_entry.status ) {
			process.stdout.write( 'invalid' );
		} else {
			entries.push( line_entry );
		}
	}

	// Append each entry
	_.forEach( entries, function( entry ) {
		// Convert and double-check our entry
		var sanitized = new Entry( entry.data );

		if ( ! sanitized.isValid() ) {
			process.stdout.write( 'invalid' );
			return; // Move to the next item
		}

		appendEntry( sanitized, entry.data.logfile, entry.data.secret, false );
	} );
} else {
	// Validate the entry
	var entry = cli.validate_entry();

	// If we're invalid, exit
	if ( 'invalid' === entry.status ) {
		return util.invalid();
	}

	// Convert and double-check our entry
	var sanitized = new Entry( entry.data );

	if ( ! sanitized.isValid() ) {
		return util.invalid();
	}

	// Append the entry
	appendEntry( sanitized, entry.data.logfile, entry.data.secret );
}

// Now, close out all of the logs
_.forEach( logs, function( log ) {
	log.write();
} );

// Fin
process.exit( 0 );