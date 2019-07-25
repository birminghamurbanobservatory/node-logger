//-------------------------------------------------
// Dependencies
//-------------------------------------------------
const winston = require('winston');
const joi = require('@hapi/joi');

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

      case 'basic':
        logger.add(winston.transports.Console, {
          level: options.level
        });
        break;

      case 'terminal':
        logger.add(winston.transports.Console, {
          colorize: true,
          prettyPrint: true,
          level: options.level
        });
        break;

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
            if (typeof options.getCorrelationId !== 'undefined') {
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
