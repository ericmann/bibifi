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
	LogFile = require( './lib/logfile' ),
	util = require( './lib/util' ),
	Entry = require( './lib/entry' );

var argv = process.argv.slice( 2 ),
	logs = {};

// Validate the entry arguments
var append = cli.validate_append_args();

// Get a log file
var log = new LogFile( append.file, append.key );

console.log( log.metaPointer() );

console.log( log );

// We're done, so let's close the logfile
log.close();

// Fin
process.exit( 0 );