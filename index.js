const joi = require('@hapi/joi');
const {stringify} = require('q-i');
const check = require('check-types');
const chalk = require('chalk');
const SerialisedError = require('serialised-error');


class NodeLogger {

  constructor() {
    // Defaults
    this.options = {
      enabled: true,
      level: 'info',
      format: 'basic'
    };
    this.levels = ['silly', 'debug', 'info', 'warn', 'error']; 
    this.initialised = false;
    this.configured = false;
  }

  configure(options) {

    if (this.configured) {
      throw new Error('You may only configure the logger once.');
    }

    const schema = joi.object({
      enabled: joi.boolean()
        .required(),
      level: joi.string()
        .valid(this.levels) // allow only these values
        .required(),
      format: joi.string()
        .valid(['basic', 'terminal', 'json']) // allow only these values
        .required(),
      getCorrelationId: joi.func()
    }).required(); // allows for extra fields (i.e that we don't check for) in the object being checked.

    const {error: err, value: validatedOptions} = joi.validate(options, schema);

    if (err) {
      throw new Error(`Invalid logger options: ${err.message}`);
    }

    this.options = Object.assign({}, this.options, validatedOptions);
    this.configured = true;
  }

  silly(part1, part2) {
    this.log('silly', part1, part2);
  }

  debug(part1, part2) {
    this.log('debug', part1, part2);
  }

  info(part1, part2) {
    this.log('info', part1, part2);
  }
  
  warn(part1, part2) {
    this.log('warn', part1, part2);
  }  

  error(part1, part2) {
    this.log('error', part1, part2);
  } 
  

  log(level, part1, part2) {

    if (!this.options.enabled) {
      return;
    }
    
    if (this.levels.indexOf(level) < this.levels.indexOf(this.options.level)) {
      return;
    }

    switch (this.options.format) {
      case 'basic':
        this.logBasic(level, part1, part2);
        break;
      case 'terminal':
        this.logTerminal(level, part1, part2);
        break;
      case 'json':  
        this.logJson(level, part1, part2);
        break;
    }

  }


  logBasic(level, part1, part2) {

    function stringifyForBasic(input) {
      if (check.undefined(input)) {
        // Need this bit as JSON.stringify(undefined) returns undefined rather than a string
        return 'undefined';
      } else {
        return check.string(input) ? input : JSON.stringify(input);
      }
    }

    let correlationIdSection;
    if (check.assigned(this.options.getCorrelationId)) {
      correlationIdSection = ` [${this.options.getCorrelationId() || 'no-correlation-id'}]:`;
    } else {
      correlationIdSection = '';
    }

    const part1Formatted = stringifyForBasic(part1);
    let part2Formatted = stringifyForBasic(part2);

    if (part2Formatted === 'undefined') {
      part2Formatted = '';
    }

    const completeLog = `${level}:${correlationIdSection}${this.addPadding(part1Formatted)}${this.addPadding(part2Formatted)}`;

    console.log(completeLog);
  }


  logTerminal(level, part1, part2) {
    
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
    if (check.assigned(this.options.getCorrelationId)) {
      correlationIdSection = ` [${this.options.getCorrelationId() || 'no-correlation-id'}]:`;
    } else {
      correlationIdSection = '';
    }

    if (part1 instanceof Error) {
      console.log(`${this.colourLevel(level)}:${correlationIdSection}`);
      console.log(part1); // formats the error nicer than stringify can
      return;
    }

    const part1Formatted = stringifyForTerminal(part1);

    if (part2 instanceof Error) {
      console.log(`${this.colourLevel(level)}:${correlationIdSection}${this.addPadding(part1Formatted)}`);
      console.log(part2);
      return;
    }

    let part2Formatted = stringifyForTerminal(part2);

    if (part2Formatted === 'undefined') {
      part2Formatted = '';
    }

    const completeLog = `${this.colourLevel(level)}:${correlationIdSection}${this.addPadding(part1Formatted)}${this.addPadding(part2Formatted)}`;

    console.log(completeLog);

  }


  logJson(level, part1, part2) {

    const now = new Date();

    // Need to convert errors to a POJO or JSON.stringify won't work.
    const p1 = check.instance(part1, Error) ? new SerialisedError(part1) : part1;
    const p2 = check.instance(part2, Error) ? new SerialisedError(part2) : part2;

    const obj = {
      level,
      timestamp: now.getTime(),  // want a number so I can do greater/less than queries on CloudWatch
      timestr: now.toISOString(), // add a more human-readable form too
      message: p1,
      meta: p2
    };

    // If provided with a function to access the correlation id, then add the id to the log output.
    if (check.assigned(this.options.getCorrelationId)) {
      obj.correlationId = this.options.getCorrelationId() || 'no-correlation-id';
    }
      
    console.log(JSON.stringify(obj));

  }


  addPadding(input) {
    if (input !== '') {
      return ` ${input}`;
    } else {
      return input;
    }   
  } 
  
  colourLevel(level) {
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

}



module.exports = new NodeLogger();

