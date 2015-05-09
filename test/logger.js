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

/**
 * Test module.
 *
 * @type {Object}
 */
var logger = require( '../src/lib/logger' ),
	util = require( '../src/lib/util' );

exports.test_validate_entry_type = function( test ) {
	var guest = { type: 'guest', name: 'guest' },
		employee = { type: 'employee', name: 'employee' },
		invalid = { type: 'invalid' };

	test.ok( logger.prototype.validate_entry_type( guest ) );
	test.ok( logger.prototype.validate_entry_type( employee ) );
	test.ok( ! logger.prototype.validate_entry_type( invalid ) );

	test.done();
};

exports.test_validate_entry_unique_names = function( test ) {
	var _guests = logger.prototype.guests;
	logger.prototype.guests = [ 'Alice' ];

	var valid_employee = { type: 'employee', name: 'Bob'},
		invalid_employee = { type: 'employee', name: 'Alice' };

	test.ok( logger.prototype.validate_entry_type( valid_employee ) );
	test.ok( ! logger.prototype.validate_entry_type( invalid_employee ) );

	var _employees = logger.prototype.employees;
	logger.prototype.employees = [ 'Bob' ];

	var valid_guest = { type: 'guest', name: 'Alice'},
		invalid_guest = { type: 'guest', name: 'Bob' };

	test.ok( logger.prototype.validate_entry_type( valid_guest ) );
	test.ok( ! logger.prototype.validate_entry_type( invalid_guest ) );

	logger.prototype.guests = _guests;
	logger.prototype.employees = _employees;

	test.done();
};