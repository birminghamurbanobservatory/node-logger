const logger = require('../index');

module.exports = {
  doSomething
};

function doSomething() {
  logger.info('Hello from the secondary');
}