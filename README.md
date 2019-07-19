# node-logger


## What is it

It's just a custom [winston](https://www.npmjs.com/package/winston) logger, with a simplified API. Helps to keep the log output consistent across all the apps using it.


## Usage

```js
// Load it
const logger = require('node-logger');
// Configure it (you can only do this once)
logger.configure({
  enabled: true,
  level: 'debug',
  format: 'json'  
});
// Use it
logger.info('Logger has now been configured');
```

The node-logger is a singleton, thus once configured you can _require_ it in any of your project files and it will still have the same configuration settings.


## Log Levels

```js
logger.error('Panic now');
logger.warn('You might need to start panicing');
logger.info('All is good');
logger.debug('Here is some handy extra detail');
```


## Accepted Arguments

1. **A Message only**. e.g. ```logger.info('Whoops something went wrong');```

2. **An Object only**. e.g. ```logger.warn({name: 'Bob', age: 123});```

3. **A Message and an Object**. e.g. ```logger.debug('Whoops something went wrong', {name: 'Bob', pets: {cats: ['Felix']}});```. It even works ok if this Object is an Error object.


## Winston

N.B. we're using Winston v2 rather than v3 and it's annoyingly difficult to produce pretty looking output in v3.

## Repository

Make sure when you commit it up to bitbucket that you also include the git tags, i.e. that ```npm version patch/minor/major``` adds, otherwise dependent apps won't be able to use the #semver installs.

You can push with tags in VS Code by searching for **Git Push With Tags** in the command pallete, or upload all tags from the command line with ```git push origin --tags```. 


## Using it in another Node.js App

Install it in your other app using the following:

```
npm install github:birminghamurbanobservatory/node-logger#semver:^1.0.0
```

which will add the following to your _package.json_ file:

```json
{
  "node-logger": "github:birminghamurbanobservatory/node-logger#semver:^1.0.0",
}
```

It's installed into your node_modules directory and can be used just like a module that has come from npm, i.e:

```js
const event = require('node-logger');
```