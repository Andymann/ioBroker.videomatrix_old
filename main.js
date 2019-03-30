'use strict';

/*
 * Created with @iobroker/create-adapter v1.11.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
var adapter = utils.adapter('videomatrix');

// Load your modules here, e.g.:
// const fs = require("fs");
var net = require('net');
var matrix;
var recnt;
var connection = false;
var tabu = false;
var polling_time = 5000;
var query = null;
var cmdqversion = '/^Version;';
var in_msg = '';

var testx;
var parentThis;

class Videomatrix extends utils.Adapter {

	
	
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'videomatrix',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('objectChange', this.onObjectChange.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		//this.on("message", this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
		//adapter.subscribestates('*');

		parentThis = this;

		testx = function() {
			parentThis.setState('info.connection', true, true);
			parentThis.log.info('VideoMatrix connected');
			connection = true;
			clearInterval(query);
			query = setInterval(function() {
			    if(!tabu){
				//this.log.debug('Sending QUERY:' + cmdqversion + '.');
				//send(cmdqversion);
				
				var cmd = cmdqversion + '\n\r';
				matrix.write(cmd);
				tabu = false;
				
			    }
			}, polling_time);
			if(cb){cb();}
		};
	}

	

	initmatrix(){
		this.log.info('TEST: initmatrix().');
		//this.connection = true;
//		this.setState('info.connection', true, true);
		//var host = adapter.config.host ? adapter.config.host : '192.168.1.56';
		//var port = adapter.config.port ? adapter.config.port : 23;
		//adapter.log.info('VideoMatrix.initMatrix() ' + 'connect to: ' + host + ':' + port);
		this.connectmatrix();
		this.log.info('VideoMatrix.initMatrix() done.');
	}

	
	

	connectmatrix(cb){
		this.log.info('in connect().');
 		
		var host = this.config.host ? this.config.host : '192.168.1.56';
		var port = this.config.port ? this.config.port : 23;
		this.log.info('VideoMatrix connecting to: ' + this.config.host + ':' + this.config.port);
		//this.setState('info.connection', true, true);

		matrix = new net.Socket();
		matrix.connect(this.config.port, this.config.host, testx);

/*
		matrix.connect(this.config.port, this.config.host, function() {
			parentThis.setState('info.connection', true, true);
			parentThis.log.info('VideoMatrix connected');
			connection = true;
			clearInterval(query);
			query = setInterval(function() {
			    if(!tabu){
				//this.log.debug('Sending QUERY:' + cmdqversion + '.');
				//send(cmdqversion);
				
				var cmd = cmdqversion + '\n\r';
				matrix.write(cmd);
				tabu = false;
				
			    }
			}, polling_time);
			if(cb){cb();}
	
		});
*/


		this.log.info('VideoMatrix in net.connect().2');



		matrix.on('data', function(chunk) {
			in_msg += chunk;
			adapter.log.info("VideoMatrix incomming: " + in_msg);
			// Version: V2.6.152
			//if(in_msg[1] =='V'){
			    	//if(in_msg.length > 10){
				//	in_msg = in_msg.substring(0,10);
			    	//}
			    	//adapter.log.debug("VideoMatrix incomming: " + in_msg);
			    	//parse(in_msg);
			    	//in_msg = '';
				//await this.setStateAsync('info.connection', { val: true, ack: true });
			//	connection = true;
			//}
			if(in_msg.toString().indexOf('e')>-1){
					this.connection = true;
			    		//in_msg = '';
				}
			if(in_msg.length > 15){
				//this.log.info('VideoMatrix incomming changed: ${JSON.stringify(obj)}`;
				//this.setState('info.connection', true, true);
				if(in_msg.toString().indexOf('e')>-1){
					this.connection = true;
			    		in_msg = '';
				}
			}

		});

		if(this.connection==true){
			this.log.info('Matrix CONNECTED');
			this.setState('info.connection', true, true);
		}


		matrix.on('error', function(e) {
			if (e.code == "ENOTFOUND" || e.code == "ECONNREFUSED" || e.code == "ETIMEDOUT") {
				matrix.destroy();
			}
			err(e);
		});

		matrix.on('close', function(e) {
			if(connection){
				err('VideoMatrix disconnected');
			}
			reconnect();
		});

	}

	reconnect(){
	    clearInterval(query);
	    clearTimeout(recnt);
	    matrix.destroy();
	    this.setState('info.connection', false, true);
	    this.log.info('Reconnect after 15 sec...');
	    connection = false;
	    recnt = setTimeout(function() {
		connect();
	    }, 15000);
	}

	send(cmd){
		this.log.info('VideoMatrix send:' + cmd);
		if (cmd !== undefined){
			cmd = cmd + '\n\r';
			//adapter.log.debug('Send Command: ' + cmd);
			matrix.write(cmd);
			tabu = false;
		}
	}


	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		//this.log.info('config option1: ' + this.config.option1);
		//this.log.info('config option2: ' + this.config.option2);
		this.log.info('config Host: ' + this.config.host);
		this.log.info('config Port: ' + this.config.port);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		await this.setObjectAsync('testVariable', {
			type: 'state',
			common: {
				name: 'testVariable',
				type: 'boolean',
				role: 'indicator',
				read: true,
				write: true,
			},
			native: {},
		});

		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates('*');

		/*
		setState examples
		you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		await this.setStateAsync('testVariable', true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync('testVariable', { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync('admin', 'iobroker');
		this.log.info('check user admin pw ioboker: ' + result);

		result = await this.checkGroupAsync('admin', 'admin');
		this.log.info('check group user admin group admin: ' + result);
		
		//----
		this.initmatrix();

	}

	

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info('cleaned everything up...');
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

}

if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Videomatrix(options);
} else {
	// otherwise start the instance directly
	new Videomatrix();
}
