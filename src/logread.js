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
	Logger = require( './lib/logger' );

// Get our parsed data
var data = cli.read_parsed();

if ( 'invalid' == data.status ) {
	process.stderr.write( 'invalid' );
	process.exit( 255 );
	return;
}