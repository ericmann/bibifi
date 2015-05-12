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
	util = require( './lib/util' ),
	Entry = require( './lib/entry' ),
	Logger = require( './lib/logger' );

var argv = process.argv.slice( 2 ),
	logs = {};

/**
 * Append an entry to a logfile (specified by the entry)
 *
 * @param {Entry} entry
 */
function appendEntry( entry ) {
	if ( undefined === logs[ entry.logfile ] ) {

		var log = Logger.prototype.open( entry.logfile, entry.secret );

		// The Logger utility returns error messages when needed
		if ( 'key_err' === log ) {
			process.stderr.write( 'security error' );
			return; // Continue to the next entry
		}

		logs[ entry.logfile ] = log;
	}

	logs[ entry.logfile ].append( entry );
console.log( JSON.stringify( logs[ entry.logfile ] ) );
}

// Determine if we have a batchfile or not
if ( _.contains( argv, '-B' ) ) {
	// Get an entry for each line in the batchfile
	var entries = [];

	// Validate each entry in the batchfile

	// Append each entry
	_.forEach( entries, function( entry ) {
		appendEntry( entry );
	} );
} else {
	// Validate the entry
	var entry = cli.validate_entry();

	// If we're invalid, exit
	if ( 'invalid' === entry.status ) {
		return util.invalid();
	}

	// Append teh entry
	appendEntry( entry.data );
}

// Now, close out all of the logs
_.forEach( logs, function( log, filename ) {
	log.write();
} );

// Fin
process.exit( 0 );