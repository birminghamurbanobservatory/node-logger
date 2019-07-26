// Bit of code to test the functionality that needs to be run manually.
const logger = require('../index');

logger.configure({
  enabled: true,
  level: 'debug',
  format: 'basic',
  getCorrelationId: () => `correl${Math.random().toString().slice(3, 6)}`
});

logger.info('Hello');
logger.debug('Here is some debug info', {name: 'brian'});
logger.info({
  foo: 4,
  bar: 'str'
});
logger.error('Here is the error', new Error('whoops'));
logger.error(new Error('Oh Dear'));


