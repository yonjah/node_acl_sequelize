'use strict';
let tests  = require('./tests'),
    AclSeq = require('../');

describe('Sequelize - Default', () => {
  before(function (done) {
    let self = this,
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
  after(function (done) {
    this.backend.db.close();
    done();
  });
});


function run () {
  Object.keys(tests).forEach(test => {
    tests[test]();
  });
}