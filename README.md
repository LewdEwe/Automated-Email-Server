
# Automated Email Server

- [Overview](#overview)
- [Dependencies](#dependencies)
- [Install](#install)
  - [Getting the Code](#getting-the-code)
  - [Configuration](#configuration)
  - [Logging Database](#logging-database)
- [Running the Server](#running-the-server)
- [Handlebars Templating](#handlebars-templating)
- [Interaction](#interaction)
  - [Request ID](#request-id)
  - [Send Email](#send-email)
- [Request Statistics](#request-statistics)
- [License](#license)

## Overview

The purpose of this server application is to accept TCP JSON requests for automated transactional emails to be sent via the SendGrid service.

The JSON request can either specify the literal body of the email or the name of a Handlebars template and its substitution data.

Why is this useful? Firstly, it centralises all your email sending to one point (or more if you have multiple instances) where it can be easily logged, monitored and managed. Secondly, your SendGrid API key is a valuable piece of information which hackers could use for their own purposes and this could be running on a private network to keep the key away from any front-line servers which would be the first to be breached. Finally, this server application fits in well with the popular idea of using micro-services to create your overall architecture.

## Dependencies

Node Module | URL
---|---
flow | https://www.npmjs.com/package/flow  
handlebars | https://www.npmjs.com/package/handlebars
js-yaml | https://www.npmjs.com/package/js-yaml  
mariasql | https://www.npmjs.com/package/mariasql
sendgrid | https://www.npmjs.com/package/sendgrid

## Install

### Getting the Code

Copy this application onto your machine by cloning this repository. For example:

```bash
git clone https://github.com/LewdEwe/Automated-Email-Server.git
```

### Configuration

The configuration is stored as YAML in the `config.yaml` file. The bundled file contains testing or dummy values so you'll need to edit this.

One of the most important configuration values is your SendGrid API key, so ensure you set this before testing the server. If you don't yet have an account then visit https://sendgrid.com and signup.

### Logging Database

You can optionally log details of all emails that are sent. This is selected by the `logging_enabled` value in the configuration file.

Currently this server application is written to use a MariaDB database for logging and has been tested with MariaDB 10.1.21 on Ubuntu Server 16.04. A suitable version of MySQL should also work as a drop-in replacement. To setup the logging facility follow the steps listed below.

* Install MariaDB or MySQL server if don't already have one you want to use.
* In your terminal, go into the `SQL scripts` subfolder and use the `create_database.sql` script to initialise the database. For example, one method would be: `mysql -u root -p < create_database.sql`
* Ensure the `logging_enabled` value in the configuration file is set to `true`.
* Set the `log_template_data` and `log_email_body` configuration values to your requirements.

## Running the Server

For a quick test you can start it directly with Node by going into the package folder and typing:

```bash
node main.js
```

For daemonisation and automatic start-up on boot I have included a PM2 configuration file in the package. For more details on PM2 see their project page:

https://www.npmjs.com/package/pm2

If you're going to use PM2 then be sure to edit the `pm2_config.json` file and set suitable paths for the log files.

To start the server with PM2 go into the package folder and type:

```bash
pm2 start pm2_config.json --env production
```

To view/monitor log output you can use:

```bash
pm2 logs
```

You can see a list of all running PM2 processes and their IDs and status by typing:

```bash
pm2 list
```

You can end the process - assuming this is the first PM2 process and has an ID of 0 (zero) - by typing:

```bash
pm2 delete 0
```

To get automatic start-up on boot please refer to the PM2 documentation.

## Handlebars Templating

This application will scan the `templates` subfolder when it starts up and will compile any files it finds as a template. The file name, minus any extension that might be present, becomes the name of the template and it is this name that must be specified in the JSON request.

If you supply a template data object in the JSON request then it will be passed to the template function to use for substitutions.

There isn't any restriction on template content, so it can be plain text or contain a HTML document. It seems that emails generated by the SendGrid module for Node.js are marked as being UTF8, so I would recommend that you set your template files to be UTF8 - besides, this is the most natural encoding for Javascript applications.

## Interaction

This server uses a very simple line-based protocol over TCP. Just send your request as a line of JSON suffixed with a line feed character. The response will likewise be a line of JSON suffixed with a line feed character.

Usually you would create a TCP client to connect to the server and issue requests. But for a quick test you can use telnet:

```bash
telnet 127.0.0.1 10000
```

If there is a problem with your request - such as unrecognised template name or JSON error etc. - then you will receive a null response:

```json
{"data":null}
```

A successful request will return the SendGrid ID for the email. For example:

```json
{"data":{"sendgrid_id":"ioMyBPZDomnZ9Kgz6PIM"}}
```

### Request ID

For any request you can add an optional ```request_id``` value. If this is present in the request then the same value will be added to the response.

For example, consider this request:

```json
{"request_id":654,"action":"send_email","data":{"recipient_address":"test@example.com","subject":"Test","body":"This is a test!"}}
```

Which gives a response containing the same ID:

```json
{"request_id":654,"data":{"sendgrid_id":"ioMyBPZDomnZ9Kgz6PIM"}}
```

### Send Email

To send an email use the `send_email` command. The requests parameters are as follows.

```html
{
"request_id":			<string, optional>,
"action":				"send_email",
"data":
	{
	"recipient_address":	<string, required>,
	"subject":				<string, optional>,
	"type":					<string, optional>,
	"body":					<string, optional>,
	"template_name":		<string, optional>,
	"template_data":		<object, optional>,
	}
}
```

Only the recipient is required, the necessity of other parameters depends on each other and on template contents. The recipient must contain an "@" character.

The subject can be omitted if you specify a template which contains a HTML title and the `html_title_overrides_subject` option in the configuration is set to `true`, otherwise you will need to include the subject in your request.

The type can be `plain` or `html`. If the type is omitted then it will default to `plain`. If the body of your message (either specified or from a template) contains a "<!DOCTYPE" tag then the type will become `html` regardless of what you specified in the request.

The body is the text content for the email. If you have specified both a body and a template then the body will be ignored.

If the template name is given then it must match the file name (stripped of extension) of a file found in the `templates` folder.

If template data is given then it will be passed to the template function for substitution.

Here is the simplest request you can do, which has a default MIME type of "text/plain":

```json
{"action":"send_email","data":{"recipient_address":"test@example.com","subject":"Test","body":"This is a test!"}}
```

Here is an example of sending a HTML email:

```json
{"action":"send_email","data":{"recipient_address":"test@example.com","subject":"Test","body":"<!DOCTYPE html><html><body>This is a test!</body></html>"}}
```

We could use a HTML title instead of specifying the subject separately:

```json
{"action":"send_email","data":{"recipient_address":"test@example.com","body":"<!DOCTYPE html><html><head><title>Test</title></head><body>This is a test!</body></html>"}}
```

Here is an example using a template:

```json
{"action":"send_email","data":{"recipient_address":"test@example.com","template_name":"example_signup"}}
```

And the same again, but this time specifying some data to merge into the template:

```json
{"action":"send_email","data":{"recipient_address":"test@example.com","template_name":"example_signup","template_data":{"first_name":"Erik","username":"erikwallace","verify_link":"https://api.example.com/verify?leajrfgbreuybvaf837bv8347vbareufvbeoawrufyvbi"}}}
```

## Request Statistics

Request statistics will be available unless you have set the ```stats_enabled``` value to ```false``` in the configuration file. The main purpose of this is for basic performance checks and to see if there are any strange requests that would indicate a network intrusion. To receive the network stats send this request:

```json
{"action":"server_request_stats"}
```

The response will look something like this:

```json
{"data":{"server_start_time":1485384402848,"total_stats":{"total_requests":2,"requests_by_address":{"192.168.8.100:34779":2},"requests_by_type":{"send_email":{"192.168.8.100:34779":1},"server_request_stats":{"192.168.8.100:34779":1}}},"per_minute_stats":{"total_requests":1,"requests_by_address":{"192.168.8.100:34779":1},"requests_by_type":{"send_email":{"192.168.8.100:34779":1}}}}}
```

Or formatted for clarity:

```javascript
{
"data":
	{
	"server_start_time":				1485384402848,
	"total_stats":
		{
		"total_requests":				2,
		"requests_by_address":
			{
			"192.168.8.100:34779":		2
			},
		"requests_by_type":
			{
			"send_email":
				{
				"192.168.8.100:34779":	1
				},
			"server_request_stats":
				{
				"192.168.8.100:34779":	1
				}
			}
		},
	"per_minute_stats":
		{
		"total_requests":				1,
		"requests_by_address":
			{
			"192.168.8.100:34779":		1
			},
		"requests_by_type":
			{
			"send_email":
				{
				"192.168.8.100:34779":	1
				}
			}
		}
	}
}
```

The per-minute stats are **not** the last 60 seconds from this instant, as you might imagine - because this would require more memory and processing effort and is probably not that important. Rather, it is the requests to have occurred in the previous 60 second timeslot. It is easy to understand if you consider the code snippet that controls this:

```javascript
if(per_minute_stats === null || (current_time - last_stats_time) >= 60000)
	{
	last_per_minute_stats = per_minute_stats;
	per_minute_stats =	{
						total_requests:			1,
						requests_by_address:	{[remote_address]: 1},
						requests_by_type:		{[request.action]: {[remote_address]: 1}}
						};
	last_stats_time = current_time;
	}
```

Requests are added to the current `per_minute_stats` object but it is the `last_per_minute_stats` that you see in the stats response from the server.

## License

This repository is published under the MIT license. Copyright (c) 2016-2017 Lewd Ewe Ltd.
