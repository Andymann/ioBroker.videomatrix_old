'use strict';

/*
 * Created with @iobroker/create-adapter v1.11.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const maxoutputs = 10;



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

		parentThis = this;
	}


	initmatrix(){
		this.log.info('initMatrix().');
		this.connectmatrix();		
	}

	reconnect(){
		this.log.info('reconnectMatrix()');
		clearInterval(query);
		clearTimeout(recnt);
		matrix.destroy();
		this.setState('info.connection', false, true);
		this.log.info('Reconnect after 15 sec...');
		connection = false;
		recnt = setTimeout(function() {
			parentThis.initmatrix();
		}, 15000);
	}



	connectmatrix(cb){
		this.log.info('connectMatrix().');
 		
		var host = this.config.host ? this.config.host : '192.168.1.56';
		var port = this.config.port ? this.config.port : 23;
		this.log.info('VideoMatrix connecting to: ' + this.config.host + ':' + this.config.port);

		matrix = new net.Socket();
		matrix.connect(this.config.port, this.config.host, function() {
			clearInterval(query);
			query = setInterval(function() {
			    if(!tabu){
				if(connection==false){
					parentThis.send(cmdqversion);
				}
			    }
			}, polling_time);
			if(cb){cb();}
	
		});
			
		matrix.on('data', function(chunk) {
			in_msg += chunk;
			parentThis.log.info("VideoMatrix incomming: " + in_msg);
			//----// Version: V2.6.152
			if(in_msg.toLowerCase().indexOf('version')>-1){
				if(connection == false){
					connection = true;
					parentThis.log.info('Matrix CONNECTED');
					parentThis.setState('info.connection', true, true);
				}
			}

			if(in_msg.length > 15){
				in_msg = '';
			}
		});

		matrix.on('error', function(e) {
			if (e.code == "ENOTFOUND" || e.code == "ECONNREFUSED" || e.code == "ETIMEDOUT") {
				matrix.destroy();
			}
			parentThis.log.error(e);
		});

		matrix.on('close', function(e) {
			if(connection){
				parentThis.log.error('VideoMatrix disconnected');
			}
			parentThis.reconnect();
		});

	}

	
	send(cmd){
		this.log.info('VideoMatrix send:' + cmd);
		if (cmd !== undefined){
			cmd = cmd + '\n\r';
			matrix.write(cmd);
			tabu = false;
		}
	}

	//----Ein State wurde veraendert
	matrixchanged(id, state){
		//this.log.info('matrixChanged:' + id +' ' + state);

		//----videomatrix.0.output_1 12
		//if(id.toLowerCase().inlcudes('output')==true){
            	//	this.log.info('matrixChanged: output changed');
		//	var outputid = id.substring(id.lastIndexOf('_'));
		//	this.log.info('matrixChanged: outputid:` + outputid +' cmd:' + state + 'V' + outputid + '.');
		//}
		//var n = id.includes(".output");
		if(id.toString().includes('.output')){
			this.log.info('matrixChanged: output changed');
			//var outputid = id.toLowerCase().substring(id.lastIndexOf('_')+1, id.toLowerCase().lastIndexOf(' '));
			var outputid = id.toLowerCase().substring(id.lastIndexOf('_')+1);
			this.log.info('matrixChanged: outputid:' + outputid +' cmd:' + state + 'V' + outputid + '.');
		}else{
			this.log.info('matrixChanged: kein Treffer');
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

		//----Anlegen der Ausgaenge
		for (var i = 1; i < maxoutputs+1; i++) {
			await this.setObjectAsync('output_' + i.toString(), {
				type: 'state',
				common: {
					name: 'Ausgang ' + i.toString(),
					type: 'number',
					role: 'level',
					read: true,
					write: true,
				},
				native: {},
			});
		}
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
			//state videomatrix.0.testVariable changed: 
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			this.matrixchanged(id, state.val);

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
