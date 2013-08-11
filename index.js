// If in nodejs, use amdefine instead
if (typeof define !== 'function') { var define = require('amdefine')(module); }

// Define halyard.js
define(function() {

	// Load a buffer library
	var Buffer = require("buffer").Buffer;

	// Load a buffer library
	var crc32 = require("buffer-crc32");

	/** 
	 * Halyard class
	 * @name Halyard
	 * @class Halyard
	 * @classdesc This is the main class for simulating a driver station
	 * @param {Integer} [Team] [Team number]
	 * @constructor
	 */
	function Halyard(team) {

		// Save the team number
		this._team = team;

		// Get the main part of the ip
		var main = "10." + parseInt(team / 100, 10) + "." + team % 100;

		// Save the ips
		this._ips = {
			cRIO: main + ".2",
			Computer: main + ".5"
		};

	}

	/**
	 * Enum for different modes
	 * @readonly
	 * @enum {Integer}
	 */
	Halyard.MODE = {
		TELEOP: 1,
		AUTONOMOUS: 2,
		TEST: 3
	};

	/**
	 * Enum for different alliances
	 * @readonly
	 * @enum {Boolean}
	 */
	Halyard.ALLIANCE = {
		RED: true,
		BLUE: false
	};

	/**
	 * Enum for different positions
	 * @readonly
	 * @enum {Integer}
	 */
	Halyard.POSITION = {
		1: 48,
		2: 49,
		3: 50
	};

	/**
	 * The Packet Index, starting at 0
	 * @private
	 * @type {Integer}
	 */
	Halyard.prototype._packetIndex = 0;

	/**
	 * Default to values
	 * @private
	 * @type {Object}
	 */
	Halyard.prototype._to = {
		digitalIn: 0,
		control: 68,
		analog: [0, 0, 0, 0],
		joysticks: [
			{
				axes: [0, 0, 0, 0, 0, 0],
				buttons: 0
			},
			{
				axes: [0, 0, 0, 0, 0, 0],
				buttons: 0
			},
			{
				axes: [0, 0, 0, 0, 0, 0],
				buttons: 0
			},
			{
				axes: [0, 0, 0, 0, 0, 0],
				buttons: 0
			}
		]
	};

	/**
	 * Default from values
	 * @private
	 * @type {Object}
	 */
	Halyard.prototype._from = {
		control: 68,
		mac: "00:00:00:00:00",
		battery: 0.0
	};

	/**
	 * Emergency stop the robot
	 * @name Halyard#stop
	 */
	Halyard.prototype.__defineSetter__("stop", function(value) {

		// Flip the value of the correct bit
		if (value) {
			this._to.control = this._to.control | (1 << 1);
		} else {
			this._to.control = this._to.control & ~(1 << 1);
		}

	});

	/**
	 * If the robot it emergency stoped
	 * @name Halyard#stoped
	 */
	Halyard.prototype.__defineGetter__("stoped", function() {

		// Get the control bit
		return (num & (1 << 1) !== 0);

	});

	/**
	 * Set the enable/disable state of the robot
	 * @name Halyard#enable
	 */
	Halyard.prototype.__defineSetter__("enable", function(value) {

		// Flip the value of the correct bit
		if (value) {
			this._to.control = this._to.control | (1 << 2);
		} else {
			this._to.control = this._to.control & ~(1 << 2);
		}

	});

	/**
	 * Get the enable/disable state of the robot
	 * @name Halyard#enabled
	 */
	Halyard.prototype.__defineGetter__("enabled", function() {

		// Get the enabled bit
		return (num & (1 << 2) !== 0);

	});

	/**
	 * Set the mode of the robot
	 * @name Halyard#mode
	 */
	Halyard.prototype.__defineSetter__("mode", function(value) {

		// Flip the right bits
		if (value === Halyard.MODE.AUTONOMOUS) {
			this._to.control = this._to.control | (1 << 3);
		} else {
			this._to.control = this._to.control & ~(1 << 3);
		}
		if (value === Halyard.MODE.TEST) {
			this._to.control = this._to.control | (1 << 6);
		} else {
			this._to.control = this._to.control & ~(1 << 6);
		}

	});

	/**
	 * Get the mode of the robot
	 * @name Halyard#mode
	 */
	Halyard.prototype.__defineGetter__("mode", function() {

		// If autonomous
		if (num & (1 << 3) !== 0) return Halyard.MODE.AUTONOMOUS;

		// If test
		if (num & (1 << 6) !== 0) return Halyard.MODE.TEST;

		// Default to teleop
		return Halyard.MODE.TELEOP;

	});

	/**
	 * Get the battery level of the robot
	 * @name Halyard#battery
	 */
	Halyard.prototype.__defineGetter__("battery", function() {

		// Return the battery 
		return this._from.battery;

	});

	/**
	 * Get the mac address of the robot
	 * @name Halyard#cRIO_MAC
	 */
	Halyard.prototype.__defineGetter__("cRIO_MAC", function() {

		// Return the cRIO MAC address
		return this._from.cRIO_MAC;

	});

	/**
	 * Set the alliance of the robot
	 * @name Halyard#alliance
	 */
	Halyard.prototype.__defineSetter__("alliance", function(value) {

		// Set the value
		this._to.alliance = value ? 82 : 66;

	});

	/**
	 * Set the position of the robot
	 * @name Halyard#position
	 */
	Halyard.prototype.__defineSetter__("position", function(value) {

		// If invalid default to 0
		if ([48, 49, 50].indexOf(value) === -1) { value = 48; }

		// Save it
		this._to.position = value;

	});

	/**
	 * Set the digital inputs of the robot
	 * @name Halyard#digitalIn
	 */
	Halyard.prototype.__defineGetter__("digitalIn", function() { return []; });

	// DIO setter
	function digitalInSetter(index, value) {

		// Flip the bit
		if (value) {
			this._to.digitalIn = this._to.digitalIn | (1 << index);
		} else {
			this._to.digitalIn = this._to.digitalIn & ~(1 << index);
		}

	}

	// Loop all 8
	for (i = 0; i < 8; i++) {

		// Save the setter
		Halyard.prototype.digitalIn.__defineSetter__(i + 1, digitalInSetter.bind(Halyard.prototype, i));

	}

	/**
	 * Set the analog inputs of the robot
	 * @name Halyard#analog
	 */
	Halyard.prototype.__defineGetter__("analog", function() { return []; });

	// analog setter
	function analogSetter(index, value) {

		// Fix the values
		if (value > 1023) { value = 1023; }
		if (value < 0) { value = 0; }

		// Set the index to the value
		this._to.analog[index] = value;

	}

	// Loop each analog
	for (i = 0; i < 4; i++) {

		// Define a setter for each
		Halyard.prototype.analog.__defineSetter__(i + 1, analogSetter.bind(Halyard.prototype, i));

	}

	// Create new array for joystick
	Halyard.prototype.__defineGetter("joysticks", function() {

		// Return our empty array
		return [
			{ axes: [], buttons: [] },
			{ axes: [], buttons: [] },
			{ axes: [], buttons: [] },
			{ axes: [], buttons: [] }
		];

	});

	// Axis setteer
	function axisSetter(joystick, axis, value) {

		// Scale it
		if(num > 127){ value = 127; }
		if(num < -128){ value = -128; }

		// Set the value
		this._to.joysticks[joystick].axes[axis] = value;

	}

	// Button setter
	function buttonSetter(joystick, button, value) {

		// Flip the bit
		if (value) {
			this._to.joysticks[joystick].buttons = _to.joysticks[joystick].buttons | (1 << button);
		} else {
			this._to.joysticks[joystick].buttons = _to.joysticks[joystick].buttons & ~(1 << button);
		}

	}

	// Loop each 4 joysticks
	for (i = 0; i < 4; i++) {

		// Loop each 6 axes
		for (j = 0; j < 6; j++) {

			// Add each
			Halyard.prototype.joysticks[i + 1].axes.__defineSetter__(j + 1, axisSetter.bind(Halyard.prototype, i, j));

		}

		// Loop each 16 buttons
		for (j = 0; j < 16; j++) {

			// Add each
			Halyard.prototype.joysticks[i + 1].buttons.__defineSetter__(j + 1, buttonsSetter.bind(Halyard.prototype, i, j));

		}

	}

	/**
	 * Send a new update to the cRIO
	 * @name Halyard#_send
	 * @private
	 * @function
	 */
	Halyard.prototype._send = function() {

		// Create a buffer of data to send
		var buf = new Buffer(1024);

		// Fill with 0s
		buf.fill(0);

		// Set the packetIndex
		buf.writeUInt16BE(this._packetIndex++, 0);

		// If going to overflow next loop, reset it
		if (this._packetIndex == 65536) { this._packetIndex = 0; }

		// Set the control byte
		buf.writeUInt8(this._to.control, 2);

		// Set the digitalInput byte
		buf.writeUInt8(this._to.digitalIn, 3);

		// Set the team number
		buf.writeUInt16BE(this._team, 4);

		// Set the alliance
		buf.writeUInt8(this._to.alliance, 6);

		// Set the position
		buf.writeUInt8(this._to.position, 7);

		// Save joysticks 0's axes
		buf.writeInt8(this._to.joysticks[0].axes[0], 8);
		buf.writeInt8(this._to.joysticks[0].axes[1], 9);
		buf.writeInt8(this._to.joysticks[0].axes[2], 10);
		buf.writeInt8(this._to.joysticks[0].axes[3], 11);
		buf.writeInt8(this._to.joysticks[0].axes[4], 12);
		buf.writeInt8(this._to.joysticks[0].axes[5], 13);

		// Set the joysticks 0's 0-15 buttons
		buf.writeUInt16BE(this._to.joysticks[0].buttons, 14);

		// Save joysticks 1's axes
		buf.writeInt8(this._to.joysticks[1].axes[0], 16);
		buf.writeInt8(this._to.joysticks[1].axes[1], 17);
		buf.writeInt8(this._to.joysticks[1].axes[2], 18);
		buf.writeInt8(this._to.joysticks[1].axes[3], 19);
		buf.writeInt8(this._to.joysticks[1].axes[4], 20);
		buf.writeInt8(this._to.joysticks[1].axes[5], 21);

		// Set the joysticks 1's 0-15 buttons
		buf.writeUInt16BE(this._to.joysticks[1].buttons, 22);

		// Save joysticks 2's axes
		buf.writeInt8(this._to.joysticks[2].axes[0], 24);
		buf.writeInt8(this._to.joysticks[2].axes[1], 25);
		buf.writeInt8(this._to.joysticks[2].axes[2], 26);
		buf.writeInt8(this._to.joysticks[2].axes[3], 27);
		buf.writeInt8(this._to.joysticks[2].axes[4], 28);
		buf.writeInt8(this._to.joysticks[2].axes[5], 29);

		// Set the joysticks 2's 0-15 buttons
		buf.writeUInt16BE(this._to.joysticks[2].buttons, 30);

		// Save joysticks 3's axes
		buf.writeInt8(this._to.joysticks[3].axes[0], 32);
		buf.writeInt8(this._to.joysticks[3].axes[1], 33);
		buf.writeInt8(this._to.joysticks[3].axes[2], 34);
		buf.writeInt8(this._to.joysticks[3].axes[3], 35);
		buf.writeInt8(this._to.joysticks[3].axes[4], 36);
		buf.writeInt8(this._to.joysticks[3].axes[5], 37);

		// Set the joysticks 3's 0-15 buttons
		buf.writeUInt16BE(this._to.joysticks[3].buttons, 38);

		// Set the analog values
		buf.writeUInt16BE(this._to.analog[0], 40);
		buf.writeUInt16BE(this._to.analog[1], 42);
		buf.writeUInt16BE(this._to.analog[2], 44);
		buf.writeUInt16BE(this._to.analog[3], 46);

		// Set the Driver Station version
		buf.write("02121300", 72);

		// Set the crc and add it to the end
		buf.writeUInt32BE(crc32.unsigned(buf), 1020);

		console.log(buf);

		// Send a control packet
		//this._socket.send(buf, 0, 1024, 1110, this._ips["cRIO"]);

	};

	// Return constructor
	return Halyard;

});