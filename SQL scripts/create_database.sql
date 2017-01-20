

####################################################################################################

#### Create database ###############################################################################

CREATE DATABASE IF NOT EXISTS db_automated_email CHARACTER SET = 'utf8' COLLATE = 'utf8_general_ci';

USE db_automated_email;

#### Create tables #################################################################################

CREATE TABLE IF NOT EXISTS sent_emails_log (
	log_time				 	TIMESTAMP(6) NOT NULL,
	requester				 	CHAR(50) NOT NULL,
	request_id				 	CHAR(50) NOT NULL,
	sendgrid_id				 	CHAR(50) NOT NULL,
	recipient_address		 	CHAR(250) NOT NULL,
	subject					 	CHAR(200) NOT NULL,
	template_name			 	CHAR(50) NOT NULL,
	template_data			 	MEDIUMTEXT,
	bounced					 	TINYINT(1) NOT NULL DEFAULT 0,

	KEY				(log_time),
	KEY				(request_id),
	PRIMARY KEY		(sendgrid_id),
	KEY				(recipient_address(20))
)
ENGINE = MyISAM;

#### Create views ##################################################################################

#### Create functions ##############################################################################

#### Create stored procedures ######################################################################

DELIMITER //


/*
Add a new entry to the sent emails log.
*/
IF NOT EXISTS(SELECT 1 FROM mysql.proc WHERE db = 'db_automated_email' AND name = 'log_email') THEN
	CREATE DEFINER = 'automated_email_exec'@'localhost' PROCEDURE log_email (
		IN param_requester						CHAR(50),
		IN param_request_id						CHAR(50),
		IN param_sendgrid_id					CHAR(50),
		IN param_recipient_address				CHAR(250),
		IN param_subject					 	CHAR(200),
		IN param_template_name				 	CHAR(50),
		IN param_template_data			 		MEDIUMTEXT
	)
	MODIFIES SQL DATA
	SQL SECURITY DEFINER

	BEGIN
	INSERT	INTO sent_emails_log (requester, request_id, sendgrid_id, recipient_address, subject, template_name, template_data)
			VALUES (param_requester, param_request_id, param_sendgrid_id, param_recipient_address, param_subject, param_template_name, param_template_data);
	END;
END IF//


DELIMITER ;

#### Create users and set permissions ##############################################################

CREATE USER IF NOT EXISTS 'automated_email_exec'@localhost IDENTIFIED BY 'TWZqEAyj5ilS0H102UPuf4t59NI26x5YlJc6jm32fAFU5otHtjcLMhY14k2393lC';
REVOKE ALL ON db_automated_email.* FROM 'automated_email_exec'@'localhost';
GRANT INSERT ON db_automated_email.sent_emails_log TO 'automated_email_exec'@'localhost';

CREATE USER IF NOT EXISTS 'automated_email_server'@localhost IDENTIFIED BY '044i2j0LytX8Ta6vMG1KENfAx1zNRYPcmEKeDTiKGI2Sk0DTi4EhOwUoPltKzGmj';
REVOKE ALL ON db_automated_email.* FROM 'automated_email_server'@'localhost';
GRANT EXECUTE ON PROCEDURE log_email TO 'automated_email_server'@'localhost';

####################################################################################################

