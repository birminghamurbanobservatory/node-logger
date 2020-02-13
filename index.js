const joi = require('@hapi/joi');
const {stringify} = require('q-i');
const check = require('check-types');
const chalk = require('chalk');
const SerialisedError = require('serialised-error');
const _ = require('lodash');


let _options = {
  enabled: true,
  level: 'info',
  format: 'basic'
};
const _levels = ['silly', 'debug', 'info', 'warn', 'error']; 
let _configured = false;


function configure(options) {

  if (_configured) {
    throw new Error('You may only configure the logger once.');
  }

  const schema = joi.object({
    enabled: joi.boolean()
      .required(),
    level: joi.string()
      .valid(_levels) // allow only these values
      .required(),
    format: joi.string()
      .valid(['basic', 'terminal', 'json', 'stackdriver']) // allow only these values
      .required(),
    getCorrelationId: joi.func()
  }).required(); // allows for extra fields (i.e that we don't check for) in the object being checked.

  const {error: err, value: validatedOptions} = joi.validate(options, schema);

  if (err) {
    throw new Error(`Invalid logger options: ${err.message}`);
  }

  _options = Object.assign({}, _options, validatedOptions);
  _configured = true;
}


function silly(part1, part2) {
  log('silly', part1, part2);
}


function debug(part1, part2) {
  log('debug', part1, part2);
}


function info(part1, part2) {
  log('info', part1, part2);
}


function warn(part1, part2) {
  log('warn', part1, part2);
}  


function error(part1, part2) {
  log('error', part1, part2);
} 


function log(level, part1, part2) {

  if (!_options.enabled) {
    return;
  }
  
  if (_levels.indexOf(level) < _levels.indexOf(_options.level)) {
    return;
  }

  switch (_options.format) {
    case 'basic':
      logBasic(level, part1, part2);
      break;
    case 'terminal':
      logTerminal(level, part1, part2);
      break;
    case 'json':  
      logJson(level, part1, part2);
      break;
    case 'stackdriver':  
      logStackdriver(level, part1, part2);
      break;  
  }

}


function logBasic(level, part1, part2) {

  function stringifyForBasic(input) {
    if (check.undefined(input)) {
      // Need this bit as JSON.stringify(undefined) returns undefined rather than a string
      return 'undefined';
    } else {
      return check.string(input) ? input : JSON.stringify(input);
    }
  }

  let correlationIdSection;
  if (check.assigned(_options.getCorrelationId)) {
    correlationIdSection = ` [${_options.getCorrelationId() || 'no-correlation-id'}]:`;
  } else {
    correlationIdSection = '';
  }

  const part1Formatted = stringifyForBasic(part1);
  let part2Formatted = stringifyForBasic(part2);

  if (part2Formatted === 'undefined') {
    part2Formatted = '';
  }

  const completeLog = `${level}:${correlationIdSection}${addPadding(part1Formatted)}${addPadding(part2Formatted)}`;

  console.log(completeLog);
}


function logTerminal(level, part1, part2) {
  
  function stringifyForTerminal(input) {
    if (check.undefined(input)) {
      return 'undefined';
    } else if (check.string(input)) {
      return input;
    } else if (check.object(input) || check.array(input)) {
      return `\n${stringify(input)}`;
    } else {
      return `${stringify(input)}`;
    }
  }

  let correlationIdSection;
  if (check.assigned(_options.getCorrelationId)) {
    correlationIdSection = ` [${_options.getCorrelationId() || 'no-correlation-id'}]:`;
  } else {
    correlationIdSection = '';
  }

  if (part1 instanceof Error) {
    console.log(`${colourLevel(level)}:${correlationIdSection}`);
    console.log(part1); // formats the error nicer than stringify can
    return;
  }

  const part1Formatted = stringifyForTerminal(part1);

  if (part2 instanceof Error) {
    console.log(`${colourLevel(level)}:${correlationIdSection}${addPadding(part1Formatted)}`);
    console.log(part2);
    return;
  }

  let part2Formatted = stringifyForTerminal(part2);

  if (part2Formatted === 'undefined') {
    part2Formatted = '';
  }

  const completeLog = `${colourLevel(level)}:${correlationIdSection}${addPadding(part1Formatted)}${addPadding(part2Formatted)}`;

  console.log(completeLog);

}


function logJson(level, part1, part2) {

  const now = new Date();

  // Need to convert errors to a POJO or JSON.stringify won't work.
  const p1 = check.instance(part1, Error) ? new SerialisedError(part1) : part1;
  const p2 = check.instance(part2, Error) ? new SerialisedError(part2) : part2;

  const obj = {
    level,
    timestamp: now.getTime(),  // want a number so we can do greater/less than queries
    timestr: now.toISOString(), // add a more human-readable form too
    message: p1,
    meta: p2
  };

  // If provided with a function to access the correlation id, then add the id to the log output.
  if (check.assigned(_options.getCorrelationId)) {
    obj.correlationId = _options.getCorrelationId() || 'no-correlation-id';
  }
    
  console.log(JSON.stringify(obj));

}


// This is for applications being run on a Google Cloud Platform Kubernetes Cluster with the Stackdriver Kubernetes Engine Monitoring (https://cloud.google.com/monitoring/kubernetes-engine/) enabled.
// It isn't a whole lot different to the json logging except we use some of the terminolgy that Stackdriver uses to ensure it can parse the json better and thus allow us to filter it more easily using its monitoring tools. It is still simply logging json to stdout. 
function logStackdriver(level, part1, part2) {

  const now = new Date();

  // StackDriver's "Error Reporting" feature is able to identify errors that have been logged and show them separately on the "Error Reporting" page of the Google Cloud Platform console. It can also send you notifications when they occur.
  // HOWEVER, it can only identify these errors if the error object forms the "message" property of the jsonPayload. Source: https://cloud.google.com/error-reporting/docs/formatting-error-messages
  // The following increases the chances of 'error' level logs being spotted by "Error Reporting".
  let p1;
  if (check.instance(part1, Error)) {
    p1 = new SerialisedError(part1);
  } else {
    if (level === 'error' && check.nonEmptyString(part1)) {
      const part1AsErrorObject = new Error(part1);
      p1 = new SerialisedError(part1AsErrorObject);
      // I did try merging the part1 string with the part2 error object (if available), but even after appending the part1 string to the error message and the stack it still wasn't included in the title of the Error Report, so decided simply to create a new error using the string as the message and then the part2 error can always be viewed in the meta object in the full stackdriver logs.
    } else {
      p1 = part1;
    }
  }

  const p2 = check.instance(part2, Error) ? new SerialisedError(part2) : part2;

  // Need to map the log levels we use to the Log Severity levels that Google and Stackdriver use.
  // https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
  const mappings = {
    silly: 'DEBUG', // there is no silly level we can map to
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARNING',
    error: 'ERROR'
  };

  const obj = {
    severity: mappings[level], // 
    timestamp: now.getTime(),  // want a number so we can do greater/less than queries
    timestr: now.toISOString(), // add a more human-readable form too
    message: p1,
    meta: p2
  };

  // If provided with a function to access the correlation id, then add the id to the log output.
  if (check.assigned(_options.getCorrelationId)) {
    obj.correlationId = _options.getCorrelationId() || 'no-correlation-id';
  }
    
  console.log(JSON.stringify(obj));

}


function addPadding(input) {
  if (input !== '') {
    return ` ${input}`;
  } else {
    return input;
  }   
} 


function colourLevel(level) {
  let coloured;
  switch (level) {
    case 'error':
      coloured = chalk.red(level);
      break;
    case 'warn':
      coloured = chalk.yellow(level);
      break;
    case 'info':
      coloured = chalk.green(level);
      break;    
    case 'debug':
      coloured = chalk.blue(level);
      break; 
    case 'silly':
      coloured = chalk.cyan(level);
      break;                     
  }
  return coloured;
}


module.exports = {
  configure,
  error,
  warn,
  info,
  debug,
  silly
};

