//-------------------------------------------------
// Dependencies
//-------------------------------------------------
const winston = require('winston');
const joi = require('@hapi/joi');
const config = winston.config;
const {stringify} = require('q-i');

//-------------------------------------------------
// Module Globals
//-------------------------------------------------
let _logger;
let _initialised = false;
let _configured = false;
const _defaultOptions = {
  enabled: true,
  level: 'info',
  format: 'basic'
};


//-------------------------------------------------
// Module Exports
//-------------------------------------------------
module.exports = returnLogger();


//-------------------------------------------------
// Create Logger
//-------------------------------------------------
function returnLogger() {

  if (_initialised) {
    return _logger;

  } else {
    // Initialise a basic instance of winston
    _logger = new (winston.Logger)({});
    updateLoggerWithOptions(_logger, _defaultOptions);
    _initialised = true;

  }

  // Add a custom method
  _logger.configure = configure;

  return _logger;

}


//-------------------------------------------------
// Configure
//-------------------------------------------------
function configure(options) {

  if (_configured) {
    throw new Error('You may only configure the node-logger once.');
  }

  const mergedOptions = Object.assign({}, _defaultOptions, options);

  updateLoggerWithOptions(_logger, mergedOptions);

  _configured = true;

}


//-------------------------------------------------
// Update logger with options
//-------------------------------------------------
function updateLoggerWithOptions(logger, options) {

  checkOptions(options);

  // Remove existing first
  logger.clear();

  if (options.enabled) {

    // Format the output differently depending on the environment.
    switch (options.format) {

      // TODO: It appears to be impossible to detect when the thing to be logged is NULL or an empty object as they would both have formatOptions.message='', and formatOptions.meta={}, i.e. exactly the same as if you passed in nothing at all.
      //------------------------
      // Basic
      //------------------------
      case 'basic':
        logger.add(winston.transports.Console, {
          level: options.level,
          formatter: (formatOptions) => {
            const correlationIdSection = isDefined(options.getCorrelationId) ? ` [${options.getCorrelationId()}]:` : '';
            let messageSection = formatOptions.message;
            if (messageSection !== '') {
              messageSection = ` ${messageSection}`;
            } 
            let metaSection;
            if (isObjectNotArray(formatOptions.meta)) {
              if (Object.keys(formatOptions.meta).length === 0) {
                metaSection = '';
              } else {
                metaSection = JSON.stringify(formatOptions.meta);
              }
            } else if (typeof formatOptions.meta === 'undefined') {
              // This means that undefined was passed to the logger, thus we should log this.
              metaSection = 'undefined';
            } else {
              metaSection = JSON.stringify(formatOptions.meta);
            }
            if (metaSection !== '') {
              metaSection = ` ${metaSection}`;
            }             
            return `${formatOptions.level}:${correlationIdSection}${messageSection}${metaSection}`;
          }
        });
        break;

      //------------------------
      // Terminal
      //------------------------
      case 'terminal':
        logger.add(winston.transports.Console, {
          level: options.level,
          formatter: (formatOptions) => {
            const correlationIdSection = isDefined(options.getCorrelationId) ? ` [${options.getCorrelationId()}]:` : '';
            let messageSection = formatOptions.message;
            if (messageSection !== '') {
              messageSection = ` ${messageSection}`;
            }   
            let metaSection;
            if (isObjectNotArray(formatOptions.meta)) {
              if (Object.keys(formatOptions.meta).length === 0) {
                metaSection = '';
              } else {
                metaSection = `\n${stringify(formatOptions.meta)}`;
              }
            } else if (typeof formatOptions.meta === 'undefined') {
              // This means that undefined was passed to the logger, thus we should log this.
              metaSection = 'undefined';
            } else {
              metaSection = `\n${stringify(formatOptions.meta)}`;
            }
            if (metaSection !== '') {
              metaSection = ` ${metaSection}`;
            }
            return `${config.colorize(formatOptions.level)}:${correlationIdSection}${messageSection}${metaSection}`;
          }          
        });
        break;

      //------------------------
      // JSON
      //------------------------
      case 'json':
        logger.add(winston.transports.Console, {
          level: options.level,
          formatter: (formatOptions) => {

            const now = new Date();

            const obj = {
              level: formatOptions.level,
              timestamp: now.getTime(),  // want a number so I can do greater/less than queries on CloudWatch
              timestr: now.toISOString() // add a more human-readable form too
            };

            // Only add the message and meta if they have actually been provided.
            if (formatOptions.message) {
              obj.message = formatOptions.message;
            }
            
            if (Object.keys(formatOptions.meta).length !== 0) {
              obj.meta = formatOptions.meta;
            }

            // If provided with a function to access the correlation id, then add the id to the log output.
            if (isDefined(options.getCorrelationId)) {
              const correlationId = options.getCorrelationId() || 'no-correlation-id';
              obj.correlationId = correlationId;
            }
              
            return JSON.stringify(obj);
          }
        });
        break; 

      default:
        throw new Error('Invalid logger format');

    } // switch

  }

}


//-------------------------------------------------
// Check options
//-------------------------------------------------
function checkOptions(options) {

  const schema = joi.object({
    enabled: joi.boolean()
      .required(),
    level: joi.string()
      .valid(['error', 'warn', 'info', 'verbose', 'debug', 'silly']) // allow only these values
      .required(),
    format: joi.string()
      .valid(['basic', 'terminal', 'json']) // allow only these values
      .required(),
    getCorrelationId: joi.func()
  }).unknown() // allows for extra fields (i.e that we don't check for) in the object being checked.
    .required();

  const {error: err, value: validatedOptions} = joi.validate(options, schema);

  if (err) {
    throw new Error(`Failed to validate logger options: ${err.message}`);
  }

  return validatedOptions;

}


function isObject(x) {
  return x !== null && typeof x === 'object';
}

function isObjectNotArray(x) {
  return (x !== null) && (typeof x === "object") && (toString.call(x) !== "[object Array]");
}

function isDefined(input) {
  return typeof input !== 'undefined';
}