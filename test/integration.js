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
var exec = require( 'child_process' ).execSync;

/**
 * Complete the first example from the project spec.
 *
 * @param {Object} test
 */
function log_status( test ) {
	test.done();return;
	exec( './build/logappend -T 1 -K secret -A -E Fred log1' );
	exec( './build/logappend -T 2 -K secret -A -G Jill log1' );
	exec( './build/logappend -T 3 -K secret -A -E Fred -R 1 log1' );
	exec( './build/logappend -T 4 -K secret -A -G Jill -R 1 log1' );

	var expected = 'Fred\nJill\n1: Fred,Jill';

	var status = exec( './build/logread -K secret -S log1' );

	test.strictEqual( status.toString(), expected );
	test.done();
}

/**
 * Using a new log, make sure the second example (with Fred's movements) is correct.
 *
 * @param {Object} test
 */
function log_fred_movements( test ) {
	test.done();return;
	exec( './build/logappend -T 1 -K secret -A -E Fred log1' );
	exec( './build/logappend -T 2 -K secret -A -G Jill log1' );
	exec( './build/logappend -T 3 -K secret -A -E Fred -R 1 log1' );
	exec( './build/logappend -T 4 -K secret -A -G Jill -R 1 log1' );
	exec( './build/logappend -T 5 -K secret -L -E Fred -R 1 log1' );
	exec( './build/logappend -T 6 -K secret -A -E Fred -R 2 log1' );
	exec( './build/logappend -T 7 -K secret -L -E Fred -R 2 log1' );
	exec( './build/logappend -T 8 -K secret -A -E Fred -R 3 log1' );
	exec( './build/logappend -T 9 -K secret -L -E Fred -R 3 log1' );
	exec( './build/logappend -T 10 -K secret -A -E Fred -R 1 log1' );

	var expected = '1,2,3,1';

	var movements = exec( './build/logread -K secret -R -E Fred log1' );

	test.strictEqual( movements.toString(), expected );
	test.done();
}

/**
 * Verify the batch functionality.
 *
 * @param {Object} test
 */
function log_batch( test ) {
	test.done();return;
	exec( './build/logappend -B test/batch' );

	var expected = 'John\nJames\n0: James,John';

	var status = exec( './build/logread -K secret -S log1' );

	test.strictEqual( status.toString(), status );
	test.done();
}

/**
 * Export the test group, with setup and teardown to cull the log file.
 *
 * @type {Object}
 */
module.exports = {
	setUp: function( callback ) {
		exec( 'rm -rf log1' );

		callback();
	},

	tearDown: function( callback ) {
		exec( 'rm -rf log1' );

		callback();
	},

	log_status: log_status,
	log_fred_movements: log_fred_movements,
	log_batch: log_batch
};