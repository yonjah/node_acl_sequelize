'use strict';

const Acl = require('acl');
const assert = require('chai').assert;
const expect = require('chai').expect;

exports.Constructor = function () {
  describe('constructor', () => {
    it('should use default `buckets` names', function () {
      let acl = new Acl(this.backend);

      expect(acl.options.buckets.meta).to.equal('meta');
      expect(acl.options.buckets.parents).to.equal('parents');
      expect(acl.options.buckets.permissions).to.equal('permissions');
      expect(acl.options.buckets.resources).to.equal('resources');
      expect(acl.options.buckets.roles).to.equal('roles');
      expect(acl.options.buckets.users).to.equal('users');
    });

    it('should use given `buckets` names', function () {
      let acl = new Acl(this.backend, null, {
        buckets: {
          meta: 'Meta',
          parents: 'Parents',
          permissions: 'Permissions',
          resources: 'Resources',
          roles: 'Roles',
          users: 'Users'
        }
      });

      expect(acl.options.buckets.meta).to.equal('Meta');
      expect(acl.options.buckets.parents).to.equal('Parents');
      expect(acl.options.buckets.permissions).to.equal('Permissions');
      expect(acl.options.buckets.resources).to.equal('Resources');
      expect(acl.options.buckets.roles).to.equal('Roles');
      expect(acl.options.buckets.users).to.equal('Users');
    });
  });
};

exports.Allows = function () {
  describe('allow', function () {

   this.timeout(10000);

    it('guest to view blogs', function (done) {
      let acl = new Acl(this.backend);

      acl.allow('guest', 'blogs', 'view', err => {
        assert(!err);
        done();
      });
    });

    it('guest to view forums', function (done) {
      let acl = new Acl(this.backend);

      acl.allow('guest', 'forums', 'view', err => {
        assert(!err);
        done();
      });
    });

    it('member to view/edit/delete blogs', function (done) {
      let acl = new Acl(this.backend);

      acl.allow('member', 'blogs', ['edit','view', 'delete'], err => {
        assert(!err);
        done();
      });
    });
  });

  describe('Add user roles', () => {
    it('joed => guest, jsmith => member, harry => admin, test@test.com => member', function (done) {
      let acl = new Acl(this.backend);

      acl.addUserRoles('joed', 'guest', err => {
        assert(!err);

        acl.addUserRoles('jsmith', 'member', err => {
          assert(!err);

          acl.addUserRoles('harry', 'admin', err => {
            assert(!err);

            acl.addUserRoles('test@test.com', 'member', err => {
              assert(!err);
              done();
            });
          });
        });
      });
    });

    it('0 => guest, 1 => member, 2 => admin', function (done) {
      let acl = new Acl(this.backend);

      acl.addUserRoles(0, 'guest', err => {
        assert(!err);

        acl.addUserRoles(1, 'member', err => {
          assert(!err);

          acl.addUserRoles(2, 'admin', err => {
            assert(!err);
            done();
          });
        });
      });
    });
  });

  describe('read User Roles', () => {
    it('run userRoles function', function (done) {
      let acl = new Acl(this.backend);
      acl.addUserRoles('harry', 'admin', err => {
        if (err) {
return done(err);
}

        acl.userRoles('harry', (err, roles) => {
          if (err) {
return done(err);
}

          assert.deepEqual(roles, ['admin']);
          acl.hasRole('harry', 'admin', (err, is_in_role) => {
            if (err) {
 return done(err);
}

            assert.ok(is_in_role);
            acl.hasRole('harry', 'no role', (err, is_in_role) => {
              if (err) {
return done(err);
}

              assert.notOk(is_in_role);
              done();
            });
          });
        });
      });
    });
  });

  describe('read Role Users', () => {
    it('run roleUsers function', function (done) {
      let acl = new Acl(this.backend);
      acl.addUserRoles('harry', 'admin', err => {
        if (err) {
return done(err);
}

        acl.roleUsers('admin', (err, users) => {
          if (err) {
 return done(err);
}
          assert.include(users, 'harry');
          assert.isFalse('invalid User' in users);
          done();
        });
      });

    });
  });

  describe('allow', () => {
    it('admin view/add/edit/delete users', function (done) {
      let acl = new Acl(this.backend);

      acl.allow('admin', 'users', ['add','edit','view','delete'], err => {
        assert(!err);
        done();
      });
    });

    it('foo view/edit blogs', function (done) {
      let acl = new Acl(this.backend);

      acl.allow('foo', 'blogs', ['edit','view'], err => {
        assert(!err);
        done();
      });
    });

    it('bar to view/delete blogs', function (done) {
      let acl = new Acl(this.backend);

      acl.allow('bar', 'blogs', ['view','delete'], err => {
        assert(!err);
        done();
      });
    });
  });

  describe('add role parents', () => {
    it('add them', function (done) {
      let acl = new Acl(this.backend);

      acl.addRoleParents('baz', ['foo','bar'], err => {
        assert(!err);
        done();
      });
    });
  });

  describe('add user roles', () => {
    it('add them', function (done) {
      let acl = new Acl(this.backend);

      acl.addUserRoles('james', 'baz', err => {
        assert(!err);
        done();
      });
    });
    it('add them (numeric userId)', function (done) {
      let acl = new Acl(this.backend);

      acl.addUserRoles(3, 'baz', err => {
        assert(!err);
        done();
      });
    });
  });

  describe('allow admin to do anything', () => {
    it('add them', function (done) {
      let acl = new Acl(this.backend);

      acl.allow('admin', ['blogs', 'forums'], '*', err => {
        assert(!err);
        done();
      });
    });
  });

  describe('Arguments in one array', () => {
    it('give role fumanchu an array of resources and permissions', function (done) {
      let acl = new Acl(this.backend);

      acl.allow(
        [
          {
            roles:'fumanchu',
            allows:[
              {resources:'blogs', permissions:'get'},
              {resources:['forums','news'], permissions:['get','put','delete']},
              {resources:['/path/file/file1.txt','/path/file/file2.txt'], permissions:['get','put','delete']}
            ]
          }
        ],
        err => {
          assert(!err);
          done();
        }
      );
    });
  });

  describe('Add fumanchu role to suzanne', () => {
    it('do it', function (done) {
      let acl = new Acl(this.backend);
      acl.addUserRoles('suzanne', 'fumanchu', err => {
        assert(!err);
        done();
      });
    });
    it('do it (numeric userId)', function (done) {
      let acl = new Acl(this.backend);
      acl.addUserRoles(4, 'fumanchu', err => {
        assert(!err);
        done();
      });
    });
  });
};



exports.Allowance = function () {
  describe('Allowance queries', () => {
    describe('isAllowed', () => {

      it('Can joed view blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('joed', 'blogs', 'view', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can userId=0 view blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(0, 'blogs', 'view', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can joed view forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('joed', 'forums', 'view', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can userId=0 view forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(0, 'forums', 'view', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can joed edit forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('joed', 'forums', 'edit', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can userId=0 edit forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(0, 'forums', 'edit', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can jsmith edit forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('jsmith', 'forums', 'edit', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can jsmith edit forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('jsmith', 'forums', 'edit', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });


      it('Can jsmith edit blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('jsmith', 'blogs', 'edit', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can test@test.com edit forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('test@test.com', 'forums', 'edit', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can test@test.com edit forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('test@test.com', 'forums', 'edit', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });


      it('Can test@test.com edit blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('test@test.com', 'blogs', 'edit', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can userId=1 edit blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(1, 'blogs', 'edit', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can jsmith edit, delete and clone blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('jsmith', 'blogs', ['edit','view','clone'], (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can test@test.com edit, delete and clone blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('test@test.com', 'blogs', ['edit','view','clone'], (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can userId=1 edit, delete and clone blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(1, 'blogs', ['edit','view','clone'], (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can jsmith edit, clone blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('jsmith', 'blogs', ['edit', 'clone'], (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can test@test.com edit, clone blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('test@test.com', 'blogs', ['edit', 'clone'], (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can userId=1 edit, delete blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(1, 'blogs', ['edit', 'clone'], (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can james add blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('james', 'blogs', 'add', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can userId=3 add blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(3, 'blogs', 'add', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can suzanne add blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('suzanne', 'blogs', 'add', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can userId=4 add blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(4, 'blogs', 'add', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can suzanne get blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('suzanne', 'blogs', 'get', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can userId=4 get blogs?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(4, 'blogs', 'get', (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can suzanne delete and put news?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('suzanne', 'news', ['put','delete'], (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can userId=4 delete and put news?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(4, 'news', ['put','delete'], (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });


      it('Can suzanne delete and put forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('suzanne', 'forums', ['put','delete'], (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can userId=4 delete and put forums?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed(4, 'forums', ['put','delete'], (err, allow) => {
          assert(!err);
          assert(allow);
          done();
        });
      });

      it('Can nobody view news?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('nobody', 'blogs', 'view', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });

      it('Can nobody view nothing?', function (done) {
        let acl = new Acl(this.backend);

        acl.isAllowed('nobody', 'nothing', 'view', (err, allow) => {
          assert(!err);
          assert(!allow);
          done();
        });
      });
    });

    describe('allowedPermissions', () => {
      it('What permissions has james over blogs and forums?', function (done) {
        let acl = new Acl(this.backend);
        acl.allowedPermissions('james', ['blogs','forums'], (err, permissions) => {
          assert(!err);

          assert.property(permissions, 'blogs');
          assert.property(permissions, 'forums');

          assert.include(permissions.blogs, 'edit');
          assert.include(permissions.blogs, 'delete');
          assert.include(permissions.blogs, 'view');

          assert(permissions.forums.length === 0);

          done();
        });
      });
      it('What permissions has userId=3 over blogs and forums?', function (done) {
        let acl = new Acl(this.backend);
        acl.allowedPermissions(3, ['blogs','forums'], (err, permissions) => {
          assert(!err);

          assert.property(permissions, 'blogs');
          assert.property(permissions, 'forums');

          assert.include(permissions.blogs, 'edit');
          assert.include(permissions.blogs, 'delete');
          assert.include(permissions.blogs, 'view');

          assert(permissions.forums.length === 0);

          done();
        });
      });
    });
  });
};




exports.WhatResources = function () {
  describe('whatResources queries', () => {
    it('What resources have "bar" some rights on?', function (done) {
      let acl = new Acl(this.backend);

      acl.whatResources('bar', (err, resources) => {
        assert.isNull(err);
        assert.include(resources.blogs, 'view');
        assert.include(resources.blogs, 'delete');
        done();
      });
    });

    it('What resources have "bar" view rights on?', function (done) {
      let acl = new Acl(this.backend);

      acl.whatResources('bar', 'view', (err, resources) => {
        assert.isNull(err);
        assert.include(resources, 'blogs');
        done();
      });
    });

    it('What resources have "fumanchu" some rights on?', function (done) {
      let acl = new Acl(this.backend);

      acl.whatResources('fumanchu', (err, resources) => {
        assert.isNull(err);
        assert.include(resources.blogs, 'get');
        assert.include(resources.forums, 'delete');
        assert.include(resources.forums, 'get');
        assert.include(resources.forums, 'put');
        assert.include(resources.news, 'delete');
        assert.include(resources.news, 'get');
        assert.include(resources.news, 'put');
        assert.include(resources['/path/file/file1.txt'], 'delete');
        assert.include(resources['/path/file/file1.txt'], 'get');
        assert.include(resources['/path/file/file1.txt'], 'put');
        assert.include(resources['/path/file/file2.txt'], 'delete');
        assert.include(resources['/path/file/file2.txt'], 'get');
        assert.include(resources['/path/file/file2.txt'], 'put');
        done();
      });
    });

    it('What resources have "baz" some rights on?', function (done) {
      let acl = new Acl(this.backend);

      acl.whatResources('baz', (err, resources) => {
        assert.isNull(err);
        assert.include(resources.blogs, 'view');
        assert.include(resources.blogs, 'delete');
        assert.include(resources.blogs, 'edit');
        done();
      });
    });
  });
};



exports.PermissionRemoval = function () {
  describe('removeAllow', () => {
    it('Remove get permissions from resources blogs and forums from role fumanchu', function (done) {
      let acl = new Acl(this.backend);
      acl.removeAllow('fumanchu', ['blogs','forums'], 'get', err => {
        assert(!err);
        done();
      });
    });

    it('Remove delete and put permissions from resource news from role fumanchu', function (done) {
      let acl = new Acl(this.backend);
      acl.removeAllow('fumanchu', 'news', 'delete', err => {
        assert(!err);
        done();
      });
    });

    it('Remove view permissions from resource blogs from role bar', function (done) {
      let acl = new Acl(this.backend);
      acl.removeAllow('bar', 'blogs', 'view', err => {
        assert(!err);
        done();
      });
    });
  });

  describe('See if permissions were removed', () => {
    it('What resources have "fumanchu" some rights on after removed some of them?', function (done) {
      let acl = new Acl(this.backend);
      acl.whatResources('fumanchu', (err, resources) => {
        assert.isNull(err);

        assert.isFalse('blogs' in resources);
        assert.property(resources, 'news');
        assert.include(resources.news, 'get');
        assert.include(resources.news, 'put');
        assert.isFalse('delete' in resources.news);

        assert.property(resources, 'forums');
        assert.include(resources.forums, 'delete');
        assert.include(resources.forums, 'put');
        done();
      });
    });
  });
};




exports.RoleRemoval = function () {
  describe('removeRole', () => {
    it('Remove role fumanchu', function (done) {
      let acl = new Acl(this.backend);
      acl.removeRole('fumanchu', err => {
        assert(!err);
        done();
      });
    });

    it('Remove role member', function (done) {
      let acl = new Acl(this.backend);
      acl.removeRole('member', err => {
        assert(!err);
        done();
      });
    });

    it('Remove role foo', function (done) {
      let acl = new Acl(this.backend);
      acl.removeRole('foo', err => {
        assert(!err);
        done();
      });
    });
  });

  describe('Was role removed?', () => {
    it('What resources have "fumanchu" some rights on after removed?', function (done) {
      let acl = new Acl(this.backend);
      acl.whatResources('fumanchu', (err, resources) => {
        assert(!err);
        assert(Object.keys(resources).length === 0);
        done();
      });
    });

    it('What resources have "member" some rights on after removed?', function (done) {
      let acl = new Acl(this.backend);
      acl.whatResources('member', (err, resources) => {
        assert(!err);
        assert(Object.keys(resources).length === 0);
        done();
      });
    });

    describe('allowed permissions', () => {
      it('What permissions has jsmith over blogs and forums?', function (done) {
        let acl = new Acl(this.backend);
        acl.allowedPermissions('jsmith', ['blogs','forums'], (err, permissions) => {
          assert(!err);
          assert(permissions.blogs.length === 0);
          assert(permissions.forums.length === 0);
          done();
        });
      });

      it('What permissions has test@test.com over blogs and forums?', function (done) {
        let acl = new Acl(this.backend);
        acl.allowedPermissions('test@test.com', ['blogs','forums'], (err, permissions) => {
          assert(!err);
          assert(permissions.blogs.length === 0);
          assert(permissions.forums.length === 0);
          done();
        });
      });

      it('What permissions has james over blogs?', function (done) {
        let acl = new Acl(this.backend);
        acl.allowedPermissions('james', 'blogs', (err, permissions) => {
          assert(!err);
          assert.property(permissions, 'blogs');
          assert.include(permissions.blogs, 'delete');
          done();
        });
      });
    });
  });
};





exports.ResourceRemoval = function () {
  describe('removeResource', () => {
    it('Remove resource blogs', function (done) {
      let acl = new Acl(this.backend);
      acl.removeResource('blogs', err => {
        assert(!err);
        done();
      });
    });

    it('Remove resource users', function (done) {
      let acl = new Acl(this.backend);
      acl.removeResource('users', err => {
        assert(!err);
        done();
      });
    });
  });

  describe('allowedPermissions', () => {
    it('What permissions has james over blogs?', function (done) {
      let acl = new Acl(this.backend);
      acl.allowedPermissions('james', 'blogs', (err, permissions) => {
        assert.isNull(err);
        assert.property(permissions, 'blogs');
        assert(permissions.blogs.length === 0);
        done();
      });
    });
    it('What permissions has userId=4 over blogs?', function (done) {
      let acl = new Acl(this.backend);
      acl.allowedPermissions(4, 'blogs').then(permissions => {
        assert.property(permissions, 'blogs');
        assert(permissions.blogs.length === 0);
        done();
      }, done);
    });
  });

  describe('whatResources', () => {
    it('What resources have "baz" some rights on after removed blogs?', function (done) {
      let acl = new Acl(this.backend);
      acl.whatResources('baz', (err, resources) => {
        assert(!err);
        assert(Object.keys(resources).length === 0);

        done();
      });
    });

    it('What resources have "admin" some rights on after removed users resource?', function (done) {
      let acl = new Acl(this.backend);
      acl.whatResources('admin', (err, resources) => {
        assert(!err);
        assert.isFalse('users' in resources);
        assert.isFalse('blogs' in resources);

        done();
      });
    });
  });
};





exports.UserRoleRemoval = function () {
  describe('Remove user roles', () => {
    it('Remove role guest from joed', function (done) {
      let acl = new Acl(this.backend);
      acl.removeUserRoles('joed','guest', err => {
        assert(!err);
        done();
      });
    });

    it('Remove role guest from userId=0', function (done) {
      let acl = new Acl(this.backend);
      acl.removeUserRoles(0,'guest', err => {
        assert(!err);
        done();
      });
    });
    it('Remove role admin from harry', function (done) {
      let acl = new Acl(this.backend);
      acl.removeUserRoles('harry','admin', err => {
        assert(!err);
        done();
      });
    });

    it('Remove role admin from userId=2', function (done) {
      let acl = new Acl(this.backend);
      acl.removeUserRoles(2,'admin', err => {
        assert(!err);
        done();
      });
    });
  });

  describe('Were roles removed?', () => {
    it('What permissions has harry over forums and blogs?', function (done) {
      let acl = new Acl(this.backend);
      acl.allowedPermissions('harry', ['forums','blogs'], (err, permissions) => {
        assert(!err);
        assert.isObject(permissions);
        assert(permissions.forums.length === 0);
        done();
      });
      it('What permissions has userId=2 over forums and blogs?', function (done) {
        let acl = new Acl(this.backend);
        acl.allowedPermissions(2, ['forums','blogs'], (err, permissions) => {
          assert(!err);
          assert.isObject(permissions);
          assert(permissions.forums.length === 0);
          done();
        });
      });
    });

    it('What resources have "baz" some rights on after removed blogs?', function (done) {
      let acl = new Acl(this.backend);
      acl.whatResources('baz', (err, permissions) => {
        assert(!err);
        assert.isObject(permissions);
        assert(Object.keys(permissions).length === 0);
        done();
      });
    });

    it('What resources have "admin" some rights on after removed users resource?', function (done) {
      let acl = new Acl(this.backend);
      acl.whatResources('admin', (err, resources) => {
        assert(!err);
        assert.isFalse('users' in resources);
        assert.isFalse('blogs' in resources);
        done();
      });
    });
  });
};

exports.i55PermissionRemoval = function () {
  describe('Github issue #55: removeAllow is removing all permissions.', () => {
    it('Add roles/resources/permissions', function () {
      let acl = new Acl(this.backend);

      return acl.addUserRoles('jannette', 'member').then(() => {
        return acl.allow('member', 'blogs', ['view', 'update']);
      }).then(() => {
        return acl.isAllowed('jannette', 'blogs', 'view', (err, allowed) => {
          assert(!err);
          expect(allowed).to.be.eql(true);
        });
      }).then(() => {
        return acl.removeAllow('member', 'blogs', 'update');
      }).then(() => {
        return acl.isAllowed('jannette', 'blogs', 'view', (err, allowed) => {
          assert(!err);
          expect(allowed).to.be.eql(true);
        });
      }).then(() => {
        return acl.isAllowed('jannette', 'blogs', 'update', (err, allowed) => {
          assert(!err);
          expect(allowed).to.be.eql(false);
        });
      }).then(() => {
        return acl.removeAllow('member', 'blogs', 'view');
      }).then(() => {
        return acl.isAllowed('jannette', 'blogs', 'view', (err, allowed) => {
          assert(!err);
          expect(allowed).to.be.eql(false);
        });
      });
    });
  });
};

exports.i32RoleRemoval = function () {
  describe('Github issue #32: Removing a role removes the entire "allows" document.', () => {
    it('Add roles/resources/permissions', function (done) {
      let acl = new Acl(this.backend);

      acl.allow(['role1', 'role2', 'role3'], ['res1', 'res2', 'res3'], ['perm1', 'perm2', 'perm3'], err => {
        assert(!err);
        done();
      });
    });

    it('Add user roles and parent roles', function (done) {
      let acl = new Acl(this.backend);

        acl.addUserRoles('user1', 'role1', err => {
          assert(!err);

          acl.addRoleParents('role1', 'parentRole1', err => {
            assert(!err);
            done();
          });
        });
    });

    it('Add user roles and parent roles', function (done) {
      let acl = new Acl(this.backend);

        acl.addUserRoles(1, 'role1', err => {
          assert(!err);

          acl.addRoleParents('role1', 'parentRole1', err => {
            assert(!err);
            done();
          });
        });
    });
    it('Verify that roles have permissions as assigned', function (done){
      let acl = new Acl(this.backend);

      acl.whatResources('role1', (err, res) => {
        assert(!err);
        assert.deepEqual(res.res1.sort(), ['perm1', 'perm2', 'perm3']);

        acl.whatResources('role2', (err, res) => {
          assert(!err);
          assert.deepEqual(res.res1.sort(), ['perm1', 'perm2', 'perm3']);
          done();
        });
      });
    });

    it('Remove role "role1"', function (done){
      let acl = new Acl(this.backend);

      acl.removeRole('role1', err => {
        assert(!err);
        done();
      });
    });

    it('Verify that "role1" has no permissions and "role2" has permissions intact', function (done){
      let acl = new Acl(this.backend);

      acl.removeRole('role1', err => {
        assert(!err);

        acl.whatResources('role1', (err, res) => {
          assert(!err);
          assert(Object.keys(res).length === 0);

          acl.whatResources('role2', (err, res) => {
            assert(!err);
            assert.deepEqual(res.res1.sort(), ['perm1', 'perm2', 'perm3']);
            done();
          });
        });
      });
    });
  });
};
