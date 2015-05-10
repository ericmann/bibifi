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
	util = require( './lib/util' ),
	Logger = require( './lib/logger' );

// Get our parsed data
var data = cli.read_parsed();

if ( 'invalid' == data.status ) {
	return util.invalid();
}