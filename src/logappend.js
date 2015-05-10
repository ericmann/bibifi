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
	Entry = require( './lib/entry' ),
	Logger = require( './lib/logger' );

// Get our parsed data
var data = cli.append_parsed();

if ( 'invalid' == data.status ) {
	process.stderr.write( 'invalid' );
	process.exit( 255 );
	return;
}

// If we have a valid request, let's handle it
var entries = [];
if ( undefined !== data.batchfile ) {
	// Get an entry for each line in the batchfile
} else {
	entries.push( new Entry( data.data ) );
}

// Add each entry to its log, keeping track of our logs
var logs = {}, error = false;
_.forEach( entries, function( entry ) {
	if ( undefined === logs['logfile'] ) {

		var log = Logger.prototype.open( data.data['logfile'], entry.secret );

		// The Logger utility returns error messages when needed
		if ( 'key_err' === log ) {
			process.stderr.write( 'security error' );
			return; // Continue to the next entry
		}

		logs['logfile'] = log;
	}

	logs['logfile'].append( entry );
} );

// Now, close out all of the logs
_.forEach( logs, function( log, filename ) {
	log.write();
} );

// Fin
process.exit( 0 );