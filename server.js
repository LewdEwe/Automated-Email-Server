

/*##################################################################################################
	Automated Email Server

	This file contains the main server code.

	Copyright (c) 2016-2017 Lewd Ewe Ltd
	License: MIT (details below)
	Contact: Open-source <open-source@lewdewe.com> (http://lewdewe.com)
	PGP keys: https://sks-keyservers.net/pks/lookup?op=vindex&search=Lewd+Ewe

	If you create changes that would benefit many people then please offer your changes to us.
	Forking this code should mainly be done to make bespoke or proprietary changes for your
	individual project.

	As use of this software will save you a lot of development time and perhaps earn you income,
	please consider making a suitable monetary contribution via the following services:

	Donorbox:	https://donorbox.org/lewd-ewe-open-source
	Flattr:		https://flattr.com/profile/LewdEwe

	Thank you for your support!

	Have a look at the other software I've open sourced:

	https://github.com/LewdEwe

	Always retain this copyright and license text with the code below. You should not claim any part
	of this work to be originally created by yourself. If any of the code below was sourced from the
	internet then I have attributed it to the origin in the code comments.

	------------------------------------------------------------------------------------------------

	The MIT License

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software
	and associated documentation files (the 'Software'), to deal in the Software without
	restriction, including without limitation the rights to use, copy, modify, merge, publish,
	distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
	Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or
	substantial portions of the Software.

	THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
	BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
##################################################################################################*/

"use strict";

// Import dependencies.
let flow =					require('flow');
let fs =					require('fs');
let handlebars =			require('handlebars');
let mariasql =				require('mariasql');
let net =					require('net');
let path =					require('path');
let sendgrid =				require('sendgrid');

// Components.
let config =				require('./config.js');

// Private variables.
let templates =					{};
let server =					null;
let database_connection =		null;

let server_start_time =			null;
let total_stats =				{	// We won't include network bandwidth stats because they are probably better done by a linux system monitor.
								total_requests:					0,
								requests_by_address:			{},
								requests_by_type:				{}
								};
let per_minute_stats =			null;
let last_per_minute_stats =		null;
let last_stats_time =			null;

// Public variables.

// Constants.
const BASE_FOLDER =			process.env.pm_cwd || path.dirname(process.argv[1]);

/*================================================================================================*/

/*································································································*/
/*
Create a connection to the database.

@callback				Function: callback function to indicate completion.
*/
function connect_database(callback)
	{
	// Create a database client instance and setup event handlers.
	console.info('Connecting to MariaDB database on ' + config.database_host + ':' + config.database_port + '.');
	if(database_connection === null)
		{
		// Create a database connection.
		database_connection = new mariasql()
		.on('error', function WDG5YUogki(error)
			{
			console.error('MariaDB error:\n\n' + error);

			if(error.message.indexOf('server has gone away') !== -1)
				{
				console.info('Reconnecting to MariaDB database...');
				connect_database();
				}
			else shutdown_server();
			}
		)
		.on('close', function IrUIZiMUUG()
			{
			console.info('MariaDB connection closed.');
			}
		)
		.on('end', function YiMSR0zhFO()
			{
			console.info('MariaDB connection ended gracefully.');
			}
		)
		.on('connect', function xHvdZY4Xbf()
			{
			console.info('MariaDB connect event.');
			}
		)
		.on('ready', function TMnlyF05xG()
			{
			console.info('MariaDB connection ready.');
			if(typeof callback === 'function')callback();
			}
		);

		// Activate the connection.
		database_connection.connect(
			{
			host:				config.database_host,
			port:				config.database_port,
			user:				config.database_username,
			password:			config.database_password,
			db:					config.database_schema,
			charset:			'utf8'
			}
		);
		}
	}

/*································································································*/
/*
Log details of a sent email to the database.

@requester				String: an ID or label that indicates where the request came from.
@request_id				String: the unique ID for the request.
@sendgrid_id			String: SendGrid's unique ID for the email.
@recipient_address		String: the email address of the recipient.
@subject				String: the email's subject line.
@template_name			String: the name of the template used for the body of the email.
@template_data			Object or null: an object containing the substitution values for the template.
@body					String: the email's body.
*/
function log_email(requester, request_id, sendgrid_id, recipient_address, subject, template_name, template_data, body)
	{
	let data_value = (config.log_template_data === true) ? template_data : null;
	let body_value = (config.log_email_body === true) ? body : null;
	let parameters =	[
						requester,
						request_id,
						sendgrid_id,
						recipient_address,
						subject,
						template_name,
						data_value,
						body_value
						];

	database_connection.query('CALL log_email(?, ?, ?, ?, ?, ?, ?, ?)', parameters)
	.on('result', function i7WUmmbdm(result)
		{
		result
		.on('end', function Zdv0DjFDpt(info)
			{
/*
			var inspect = require('util').inspect;
			console.debug(inspect(info));
*/
			}
		)
		.on('error', function PMR4RNaXAA(error)
			{
			console.error('Result error from SQL log_email(): ' + error.message);
			console.error(JSON.stringify(parameters));
			}
		);
		}
	)
	.on('error', function amAdaEUtvU(error)
		{
		console.error('Query error from SQL log_email(): ' + error.message);
		console.error(JSON.stringify(parameters));
		}
	);
	}

/*································································································*/
/*
TCP connection handler.

@socket					Object: the TCP socket object for the connection.
*/
function tcp_connection_handler(socket)
	{
	let buffer = '';

	// Ensure we are getting UTF8 data.
	socket.setEncoding('utf8');

	// Setup event handlers for the socket.
	socket
	.on('data', function FMdIcXniAx(data)
		{
		let i;
		buffer += data;
		while((i = buffer.indexOf('\n')) !== -1)
			{
			tcp_message_handler(socket, buffer.substr(0, i));
			buffer = buffer.substr(i + 1);
			}
		}
	)
	.on('end', function KeQmXIvUp3()
		{
		if(buffer.length > 0)tcp_message_handler(socket, buffer);
		}
	);
	}

/*································································································*/
/*
TCP message handler.

@socket					Object: the TCP socket object for the connection.
@json_message			String: the request message as a JSON encoded object.
*/
function tcp_message_handler(socket, json_message)
	{
	let request;
	let response_data;

	// Parse the JSON request.
	try
		{
		request = JSON.parse(json_message);
		}
	catch(e)
		{
		request = {action: 'undefined', data: null};
		}

	// Protect against request which is not an object.
	if(typeof request !== 'object')request = {action: 'undefined', data: null};

	// Protect against request without an action value.
	if(typeof request.action !== 'string' || request.action.length === 0)request.action = 'undefined';

	// Get the remote address for the stats.
	let remote_address = socket.remoteAddress + ":" + socket.remotePort;

	// Update the request stats.
	let current_time = Date.now();
	if(per_minute_stats === null || (current_time - last_stats_time) >= 60000)
		{
		last_per_minute_stats = per_minute_stats;
		per_minute_stats = 	{
							total_requests:					1,
							requests_by_address:			{[remote_address]: 1},
							requests_by_type:				{[request.action]: {[remote_address]: 1}}
							};
		last_stats_time = current_time;
		}

	total_stats.total_requests++;

	if(total_stats.requests_by_address[remote_address] === undefined)
		{
		total_stats.requests_by_address[remote_address] = 1;
		}
	else total_stats.requests_by_address[remote_address]++;

	if(total_stats.requests_by_type[request.action] === undefined)
		{
		total_stats.requests_by_type[request.action] = {[remote_address]: 1};
		}
	else
		{
		if(total_stats.requests_by_type[request.action][remote_address] === undefined)
			{
			total_stats.requests_by_type[request.action][remote_address] = 1;
			}
		else total_stats.requests_by_type[request.action][remote_address]++;
		}

	// Process the request.
	flow.exec(
	function GsuNLGF7n5()
		{
		switch(request.action)
			{
			case 'server_request_stats':
				this(
					{
					server_start_time:		server_start_time,
					total_stats:			total_stats,
					per_minute_stats:		last_per_minute_stats
					}
				);
				break;

			case 'send_email':
				send_email(remote_address, request, this);
				break;

			default:
				this(null);
			}
		},
	function rS6gvNFhpa(response_data)
		{
		if(socket.destroyed === false)
			{
			socket.write(JSON.stringify({request_id: request.request_id, data: response_data}) + '\n');
			}
		}
	);
	}

/*································································································*/
/*
Send the requested email.

@remote_address			String: the network address of the client making the request.
@request				Object: the object containing the request details.
@callback				Function: callback function to indicate completion.

Mandatory callback receives null or an object containing the SendGrid email ID.
*/
function send_email(remote_address, request, callback)
	{
	let data = request.data;

	// Check we have a data object in the request.
	if(typeof data !== 'object' || data === null)
		{
		console.error('Request data invalid.');
		return callback(null);
		}

	// Check that we have the data necessary to create the email body content.
	if(typeof data.template_name !== 'string' && typeof data.body !== 'string')
		{
		console.error('Neither template nor body was specified.');
		return callback(null);
		}
	if(typeof data.template_name === 'string' && (data.template_name.length === 0 || templates[data.template_name] === undefined))
		{
		console.error('Template name invalid.');
		return callback(null);
		}

	// Determine the body text of the email.
	let body;
	if(typeof data.template_name === 'string')
		{
		body = templates[data.template_name](data.template_data);
		}
	else body = data.body;

	// Create the content object.
	// If a DOCTYPE tag is detected then we force the MIME type to HTML.
	let type = data.type || 'plain';
	if(body.indexOf('<!DOCTYPE') !== -1)type= 'html';
	let content = new sendgrid.mail.Content('text/' + type, body);

	// If appropriate use the HTML title as the subject line.
	if(type === 'html' && config.html_title_overrides_subject === true)
		{
		let result = body.match(/<title>([^<]+)<\/title>/i);
		if(result !== null && result.length > 1)data.subject = result[1];
		}

	// Check that we now have a subject.
	if(typeof data.subject !== 'string' || data.subject.length === 0)
		{
		console.error('Subject not specified.');
		return callback(null);
		}

	// Check we have a valid recipient address.
	if(typeof data.recipient_address !== 'string' || data.recipient_address.length < 3 || data.recipient_address.indexOf('@') === -1)
		{
		console.error('Recipient email address invalid.');
		return callback(null);
		}

	// Create the email object.
	let sender_address = new sendgrid.mail.Email(config.from_address);
	let recipient_address = new sendgrid.mail.Email(data.recipient_address);
	let mail = new sendgrid.mail.Mail(sender_address, data.subject, recipient_address, content);

	// Include our own email ID for crossreferencing.
	if(typeof request.request_id === 'string')
		{
		mail.addHeader(new sendgrid.mail.Header('X-AUTOMATED-EMAIL-ID', request.request_id));
		}
	else request.request_id = null;

	// These headers were recommended for stopping out-of-office replies.
	mail.addHeader(new sendgrid.mail.Header('Return-Path', '<>'));
	mail.addHeader(new sendgrid.mail.Header('Precedence', 'bulk'));
	mail.addHeader(new sendgrid.mail.Header('Auto-Submitted', 'auto-generated'));

	// Send the email.
	let sg = sendgrid(config.sendgrid_api_key);
	sg.API(sg.emptyRequest({method: 'POST', path: '/v3/mail/send', body: mail.toJSON()}), function zxu41dH1O0(error, response)
		{
/*
		console.debug(response.statusCode);
		console.debug(response.body);
		console.debug(response.headers);
*/

		log_email(remote_address, request.request_id, response.headers['x-message-id'], data.recipient_address, data.subject, data.template_name, JSON.stringify(data.template_data), body);

		callback({sendgrid_id: response.headers['x-message-id']});
		}
	);
	}

/*································································································*/
/*
Exit the process.
*/
function shutdown_server()
	{
	console.info('Shutting down Automated Email server.\n\n');

	flow.exec(
	function gUOqymgF0Y()
		{
		// Close the server socket.
		if(server !== null)server.close(this);
		else this();
		},
	function BBTq5PkDd9()
		{
		if(database_connection !== null)
			{
			// Close database connections.
			database_connection.end();

			// Wait for connection to be closed.
			database_connection.on('close', this);
			database_connection.on('end', this);
			}
		else this();
		},
	function q2pbfisuzf()
		{
		// Kill the server process.
		process.exit(0);
		}
	);
	}

/*================================================================================================*/

console.info('####################################################################################################');
console.info('####################################################################################################');
console.info('Starting Automated Email server on ' + config.email_server_host + ':' + config.email_server_port + '.');

// Start up the Automated Email server.
flow.exec(
function QrnfHtpfF0()
	{
	// Get a list of template files.
	fs.readdir(path.join(BASE_FOLDER, 'templates'), this);
	},
function YI9B7kFzmr(error, files)
	{
	if(error !== null)
		{
		console.error('Could not read contents of templates folder.');
		shutdown_server();
		}

	// Load and compile the templates.
	// When deriving the template name we use indexOf() instead of lastIndexOf() to chop off the
	// filename extension, this is intentional because template names should be just alphanumeric
	// and underscores, so we don't care about periods.
	for(let i = 0; i < files.length; i++)
		{
		let filename = files[i];
		let content = fs.readFileSync(path.join(BASE_FOLDER, 'templates', filename), {encoding: 'utf8'});
		let index = filename.lastIndexOf('.');
		if(index === -1)index = filename.length;
		templates[filename.substr(0, index)] = handlebars.compile(content);
		}

	// Connect to the database if required.
	if(config.logging_enabled === true)
		{
		connect_database(this);
		}
	else
		{
		console.info('Database logging is disabled.');
		this();
		}
	},
function uUOsmx5cgT()
	{
	// Create the TCP server.
	server = net.createServer();

	// Set the TCP event handlers.
	server.on('connection', tcp_connection_handler);

	// Start listening for connections.
	server.listen(config.email_server_port, config.email_server_host);
	}
);

/*################################################################################################*/

