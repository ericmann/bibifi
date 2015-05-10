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
var cli = new (require( './lib/cli' )),
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
var logs = {};
_.forEach( entries, function( entry ) {
	if ( undefined === logs['logfile'] ) {
		logs['logfile'] = Logger.open( logs['logfile'] );
	}

	logs['logfile'].append( entry );
} );

// Now, close out all of the logs
_.forEach( logs, function( log, filename ) {
	log.close();
} );

// Fin
process.exit( 0 );