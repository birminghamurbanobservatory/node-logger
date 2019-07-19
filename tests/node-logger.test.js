//-------------------------------------------------
// Dependencies
//-------------------------------------------------
const check = require('check-types');
const stdout = require('test-console').stdout;

//-------------------------------------------------
// Tests
//-------------------------------------------------
describe('node-logger testing', () => {

  afterEach(() => {
    // Means each test load the logger from fresh without using the cached version that will be a singleton.
    jest.resetModules();
  });  


  test('Should initially return an object with a configure method', () => {

    const logger = require('../index');
    expect(check.nonEmptyObject(logger)).toBe(true);
    expect(check.function(logger.configure)).toBe(true);

  });


  test('Throws error when invalid configuration options are provided', () => {
    
    const logger = require('../index');
    expect(() => {
      logger.configure({format: 'pineapple'});
    }).toThrow(Error);

  });  
  

  test('Configures ok with valid options', () => {

    const logger = require('../index');
    logger.configure({enabled: true, level: 'info', format: 'terminal'});
    expect(check.nonEmptyObject(logger)).toBe(true);

  });


  test('Throws error when it is configured more than once', () => {

    const logger = require('../index');
    const validOptions = {enabled: true, level: 'info', format: 'terminal'};
    logger.configure(validOptions);
    expect(() => {
      logger.configure(validOptions);
    }).toThrow(Error);

  });  


  test('Logs a simple message correctly to terminal', () => {

    const logger = require('../index');
    const validOptions = {enabled: true, level: 'info', format: 'terminal'};
    logger.configure(validOptions);
    const msg = 'Hello';
    const output = stdout.inspectSync(() => {
      logger.info(msg);
    });
    expect(check.contains(output[0], validOptions.level)).toBe(true);
    expect(check.contains(output[0], msg)).toBe(true);
    // TODO: Could make this test stricter by testing the exact output more closely

  }); 


  test('Logs a message with an object correctly as json', () => {

    const logger = require('../index');
    const validOptions = {enabled: true, level: 'info', format: 'json'};
    logger.configure(validOptions);
    const msg = 'A packet arrived';
    const obj = {name: 'packet1', contents: [1, 2, '3']};
    const output = stdout.inspectSync(() => {
      logger.info(msg, obj);
    });
    expect(check.contains(output[0], validOptions.level)).toBe(true);
    expect(check.contains(output[0], msg)).toBe(true);
    expect(check.contains(output[0], obj.name)).toBe(true);
    expect(check.contains(output[0], 'meta')).toBe(true);
    expect(check.contains(output[0], 'timestr')).toBe(true);
    expect(check.contains(output[0], 'timestamp')).toBe(true);
    // TODO: Could make this test stricter by testing the exact output more closely

  });   
  

});