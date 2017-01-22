

####################################################################################################

#### Remove items so we have a clean start #########################################################

DROP DATABASE IF EXISTS db_automated_email;
DROP USER IF EXISTS 'automated_email_exec'@'localhost', 'automated_email_server'@'localhost';
FLUSH PRIVILEGES;

#### Create database ###############################################################################

CREATE DATABASE db_automated_email CHARACTER SET = 'utf8' COLLATE = 'utf8_general_ci';

USE db_automated_email;

#### Create tables #################################################################################

CREATE TABLE sent_emails_log (
	log_time				 	TIMESTAMP(6) NOT NULL,
	requester				 	CHAR(50) NOT NULL,
	request_id				 	CHAR(50) NOT NULL,
	sendgrid_id				 	CHAR(50) NOT NULL,
	recipient_address		 	CHAR(100) NOT NULL,
	subject					 	CHAR(200) NOT NULL,
	template_name			 	CHAR(50),
	template_data			 	MEDIUMTEXT,
	body					 	MEDIUMTEXT,
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

#---------------------------------------------------------------------------------------------------
/*
Add a new entry to the sent emails log.
*/
CREATE DEFINER = 'automated_email_exec'@'localhost' PROCEDURE log_email (
	IN param_requester						CHAR(50),
	IN param_request_id						CHAR(50),
	IN param_sendgrid_id					CHAR(50),
	IN param_recipient_address				CHAR(100),
	IN param_subject					 	CHAR(200),
	IN param_template_name				 	CHAR(50),
	IN param_template_data			 		MEDIUMTEXT,
	IN param_body					 		MEDIUMTEXT
)
MODIFIES SQL DATA
SQL SECURITY DEFINER

BEGIN
INSERT	INTO sent_emails_log (requester, request_id, sendgrid_id, recipient_address, subject, template_name, template_data, body)
		VALUES (param_requester, param_request_id, param_sendgrid_id, param_recipient_address, param_subject, param_template_name, param_template_data, param_body);
END;//

#---------------------------------------------------------------------------------------------------
DELIMITER ;

#### Create users and set permissions ##############################################################

CREATE USER 'automated_email_exec'@localhost IDENTIFIED BY '7v6hiJAFQ6v0qCtoSHl5FL1BA';
GRANT INSERT ON db_automated_email.sent_emails_log TO 'automated_email_exec'@'localhost';
GRANT EXECUTE ON PROCEDURE log_email TO 'automated_email_exec'@'localhost';

CREATE USER 'automated_email_server'@localhost IDENTIFIED BY '74RfcJhonFgPBF2udJbTvw3ue';
GRANT EXECUTE ON PROCEDURE log_email TO 'automated_email_server'@'localhost';

FLUSH PRIVILEGES;

####################################################################################################

