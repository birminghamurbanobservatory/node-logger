// Bit of code to test the functionality that needs to be run manually.

const logger = require('../index');

logger.info('This was logged before the logger was configured');

logger.configure({
  enabled: true,
  level: 'debug',
  format: 'json'
});

logger.info('Hello from the primary');
logger.debug('I am a debug log');
logger.info({
  foo: 4,
  bar: 'str'
});

const secondary = require('./manual.secondary');
secondary.doSomething();

