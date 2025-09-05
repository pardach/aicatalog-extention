// SQL.js loader for CEP Extension
(function() {
  'use strict';

  var initSqlJs = function(config) {
    config = config || {};

    return new Promise(function(resolve, reject) {
      if (typeof window !== 'undefined') {
        // Try to load real SQL.js first
        if (typeof SQL !== 'undefined' && SQL.Database) {
          console.log('Real SQL.js found, using it');
          resolve(SQL);
        } else {
          // Use fallback SQL implementation for CEP environment
          console.log('Using fallback SQL implementation for CEP environment');
          resolve(createFallbackSQL());
        }
      } else {
        reject(new Error('SQL.js requires browser environment'));
      }
    });
  };

  function createFallbackSQL() {
    var SQL = {
      Database: function(data) {
        this.data = data || [];
        this.tables = {
          designs: [],
          families: [],
          tags: []
        };
        this.memoryDB = {};
      }
    };

    SQL.Database.prototype.run = function(sql, params) {
      console.log('Fallback SQL Run:', sql, params);
      
      // Simple CREATE TABLE simulation
      if (sql.toUpperCase().includes('CREATE TABLE')) {
        var tableName = sql.match(/CREATE TABLE\s+(\w+)/i);
        if (tableName) {
          this.tables[tableName[1]] = [];
          console.log('Created table:', tableName[1]);
        }
      }
      
      // Simple INSERT simulation
      if (sql.toUpperCase().includes('INSERT INTO')) {
        var tableName = sql.match(/INSERT INTO\s+(\w+)/i);
        if (tableName && this.tables[tableName[1]]) {
          var row = params || {};
          this.tables[tableName[1]].push(row);
          console.log('Inserted into table:', tableName[1], row);
        }
      }
      
      return this;
    };

    SQL.Database.prototype.exec = function(sql) {
      console.log('Fallback SQL Exec:', sql);
      
      // Simple SELECT simulation
      if (sql.toUpperCase().includes('SELECT')) {
        var tableName = sql.match(/FROM\s+(\w+)/i);
        if (tableName && this.tables[tableName[1]]) {
          return [{
            columns: Object.keys(this.tables[tableName[1]][0] || {}),
            values: this.tables[tableName[1]].map(row => Object.values(row))
          }];
        }
      }
      
      // Return mock result
      return [{ columns: ['result'], values: [['ok']] }];
    };

    SQL.Database.prototype.prepare = function(sql) {
      var self = this;
      var stmt = {
        sql: sql,
        db: this
      };

      stmt.run = function(params) {
        console.log('Fallback Prepared statement run:', sql, params);
        return self.run(sql, params);
      };

      stmt.free = function() {
        console.log('Fallback Statement freed');
      };

      return stmt;
    };

    SQL.Database.prototype.export = function() {
      return new Uint8Array(0); // Empty array
    };

    return SQL;
  }

  // Export for different environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = initSqlJs;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() { return initSqlJs; });
  } else {
    window.initSqlJs = initSqlJs;
  }
})();
