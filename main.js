

/*##################################################################################################
	Automated Email Server

	This file contains some Javascript tweaks and global setup.

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

/*
If you need to do any global setup or tweaking of Javascript, such as polyfills, then add it here.
*/

/*================================================================================================*/

// Load the application code.
if(module === undefined)require('./server.js');
else module.exports = require('./server.js');

/*################################################################################################*/

