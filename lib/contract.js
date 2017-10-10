/**
  Design by Contract module (c) OptimalBits 2011.

  Roadmap:
    - Optional parameters. ['(string)', 'array']
    - Variable number of parameters.['number','...']

  api?:

  contract(arguments)
    .params('string', 'array', '...')
    .params('number')
    .end()

*/
'use strict';

const _    = require('lodash');
const noop = {};

noop.params = function (){
  return this;
};

noop.end = function (){};

function contract (args){
  if (contract.debug === true){
    contract.fulfilled = false;
    contract.args = _.toArray(args);
    contract.checkedParams = [];
    return contract;
  } else {
    return noop;
  }
}

contract.params = function (){
  this.fulfilled |= checkParams(this.args, _.toArray(arguments));
  if (this.fulfilled){
    return noop;
  } else {
    this.checkedParams.push(arguments);
    return this;
  }
};
contract.end = function (){
  if (!this.fulfilled){
    printParamsError(this.args, this.checkedParams);
    throw new Error('Broke parameter contract');
  }
};

function typeOf (obj){
  return Array.isArray(obj) ? 'array' : typeof obj;
}

function checkParams (args, contract){
  let fulfilled, types, type, i, j;

  if (args.length !== contract.length){
    return false;
  } else {
    for (i = 0; i < args.length; i++){
      try {
        types = contract[i].split('|');
      } catch (e){
        console.log(e, args); // eslint-disable-line no-console
      }

      type = typeOf(args[i]);
      fulfilled = false;
      for (j = 0; j < types.length; j++){
        if (type === types[j]){
          fulfilled = true;
          break;
        }
      }
      if (fulfilled === false){
        return false;
      }
    }
    return true;
  }
}

function printParamsError (args, checkedParams){
  let msg = 'Parameter mismatch.\nInput:\n( ',
      i;
  _.each(args, (input, key) => {
    const type = typeOf(input);
    if (key != 0){
      msg += ', ';
    }
    msg += input + ': ' + type;
  });

  msg += ')\nAccepted:\n';

  for (i = 0; i < checkedParams.length;i++){
    msg += '(' + argsToString(checkedParams[i]) + ')\n';
  }

  console.log(msg); // eslint-disable-line no-console
}

function argsToString (args){
  let res = '';
  _.each(args, (arg, key) => {
    if (key != 0){
      res += ', ';
    }
    res += arg;
  });
  return res;
}

exports = module.exports = contract;
