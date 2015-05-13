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
	Query = require( './lib/query' ),
	util = require( './lib/util' ),
	Logger = require( './lib/logger' );

var argv = process.argv.slice( 2 );

// Validate the query
var query = cli.validate_query();

// If we're invalid exit
if ( 'invalid' === query.status ) {
	return util.invalid();
}

// Extra verification that the query is secure
var lookup = new Query( query.params );

if ( ! lookup.isValid() ) {
	return util.invalid();
}

// Attempt to open the logfile given the secret
var log = Logger.prototype.open( lookup.logfile, lookup.secret );

if ( 'key_err' === log ) {
	process.stderr.write( 'integrity violation' );
	process.exit( 255 );
}

log.query( lookup );