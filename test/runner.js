/* globals describe,before*/
"use strict";
var tests  = require('./tests'),
    AclSeq = require('../');

describe('Sequelize - Default', function () {
  before(function (done) {
    var self = this,
        Sequelize = require('sequelize');

    self.backend = new AclSeq(
        new Sequelize(
          'test',
          'root',
          null,
          {
            operatorsAliases: false,
            logging: false,
            dialect: 'mysql'
          }
        ), {
          prefix: 'acl_'
        }
      );
    done();
  });
  run();
});


function run() {
  Object.keys(tests).forEach(function (test) {
    tests[test]();
  });
}