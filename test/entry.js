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
var _ = require( 'lodash' );

/**
 * Test module.
 *
 * @type {Object}
 */
var Entry = require( '../src/lib/entry' );

/**
 * Make sure invalid names are sanitized properly
 *
 * @param {Object} test
 */
function test_sanitizeName( test ) {
	var names = {
		'Adam': 'Adam',
		'Mary   ': 'Mary',
		'  Joseph': 'Joseph',
		'{object:etc}': 'objectetc'
	};

	_.forEach( names, function( value, key ) {
		test.strictEqual( value, Entry.prototype.sanitizeName( key ) );
	} );

	test.done();
}

/**
 * Make sure invalid types are sanitized and rejected.
 *
 * @param {Object} test
 */
function test_sanitizeType( test ) {
	var types = {
		'E': 'E',
		'G': 'G',
		'e': 'E',
		'g': 'G',
		'  E': 'E',
		'E  ': 'E',
		'a': '',
		'%': '',
		'1': '',
		4: '',
		'EG': 'E'
	};

	_.forEach( types, function( value, key ) {
		test.strictEqual( value, Entry.prototype.sanitizeType( key ) );
	} );

	test.done();
}

/**
 * Make sure invalid rooms are sanitized and rejected.
 *
 * @param {Object} test
 */
function test_sanitizeRoom( test ) {
	var rooms = {
		0: 0,
		1: 1,
		'-1': 1,
		'01234': 1234
	};

	_.forEach( rooms, function( value, key ) {
		test.strictEqual( value, Entry.prototype.sanitizeRoom( key ), key );
	} );

	// Manually test some special cases
	test.ok( isNaN( Entry.prototype.sanitizeRoom( 'a' ) ) );
	test.ok( null == Entry.prototype.sanitizeRoom() );

	test.done();
}

/**
 * Make sure invalid actions are sanitized properly.
 *
 * @param {Object} test
 */
function test_sanitizeAction( test ) {
	var actions = {
		'A': 'A',
		'L': 'L',
		'a': 'A',
		'l': 'L',
		'  A': 'A',
		'L  ': 'L',
		'v': '',
		'%': '',
		'1': '',
		4: '',
		'AL': 'A'
	};

	_.forEach( actions, function( value, key ) {
		test.strictEqual( value, Entry.prototype.sanitizeAction( key ), key );
	} );

	test.done();
}

/**
 * Make sure the time is sanitized.
 *
 * @param {Object} test
 */
function test_sanitizeTime( test ) {
	var times = {
		0: 0,
		1: 1,
		'-1': 1,
		'01234': 1234
	};

	_.forEach( times, function( value, key ) {
		test.strictEqual( value, Entry.prototype.sanitizeTime( key ), key );
	} );

	// Manually test some special cases
	test.ok( isNaN( Entry.prototype.sanitizeTime( 'a' ) ) );

	test.done();
}

/**
 * Make sure the entry is valid.
 *
 * @param {Object} test
 */
function test_isValid( test ) {
	var valid1 = new Entry( {
		'name': 'Valid',
		'type': 'E',
		'action': 'A',
		'room': undefined,
		'time': 1
	} ),
		valid2 = new Entry( {
			'name': 'Valid',
			'type': 'G',
			'action': 'L',
			'room': 5,
			'time': 3
		} ),
		invalid1 = new Entry( {
			'name': '%%',
			'type': 'G',
			'action': 'L',
			'room': 3,
			'time': 9
		} ),
		invalid2 = new Entry( {
			'name': 'Valid',
			'type': 4,
			'action': 'A',
			'room': undefined,
			'time': 34
		} ),
		invalid3 = new Entry( {
			'name': 'Valud',
			'type': 'G',
			'action': 'join',
			'room': undefined,
			'time': 37
		} ),
		invalid4 = new Entry( {
			'name': 'Valid',
			'type': 'E',
			'action': 'A',
			'room': 'bathroom',
			'time': 56
		} ),
		invalid5 = new Entry( {
			'name': 'Valid',
			'type': 'G',
			'action': 'L',
			'room': 0,
			'time': 'nevermind'
		} );

	test.ok( valid1.isValid() );
	test.ok( valid2.isValid() );

	test.ok( ! invalid1.isValid() );
	test.ok( ! invalid2.isValid() );
	test.ok( ! invalid3.isValid() );
	test.ok( ! invalid4.isValid() );
	test.ok( ! invalid5.isValid() );

	test.done();
}

/**
 * Export the test group.
 *
 * @type {Object}
 */
module.exports = {
	setUp: function( callback ) {
		callback();
	},

	tearDown: function( callback ) {
		callback();
	},

	test_sanitizeName: test_sanitizeName,
	test_sanitizeType: test_sanitizeType,
	test_sanitizeRoom: test_sanitizeRoom,
	test_sanitizeAction: test_sanitizeAction,
	test_sanitizeTime: test_sanitizeTime,
	test_isValid: test_isValid
};