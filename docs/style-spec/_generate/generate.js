#!/usr/bin/env node

// GL style reference generator

var fs = require('fs');
var path = require('path');
var ref = require('../../../src/style-spec/reference/latest');
var _ = require('lodash');
var remark = require('remark');
var html = require('remark-html');

var expressionTypes = require('./expression-types');


function tmpl(x, options) {
    return _.template(fs.readFileSync(path.join(__dirname, x), 'utf-8'), options);
}

var index = tmpl('index.html', {
  imports: {
    _: _,
    item: tmpl('item.html', {
      imports: {
        _: _,
        md: function(markdown) {
          return remark().use(html).process(markdown);
        }
      }
    }),
    expressions: Object.keys(expressionTypes).sort((a, b) => a.localeCompare(b)),
    renderExpression: tmpl('expression.html', {
      imports: {
        _: _,
        expressionDocs: ref['expression_name'].values,
        expressionTypes: expressionTypes,
        renderParams: renderParams,
        md: function(markdown) {
          return remark().use(html).process(markdown)
        }
      }
    })
  }
});

function renderParams (params) {
    let result = '';
    for (const t of params) {
        result += ', ';
        if (typeof t === 'string') {
            result += t;
        } else if (t.name) {
            result += `${JSON.stringify(t.name)}: ${t.type}`;
        } else if (t.repeat) {
            const repeated = renderParams(t.repeat);
            result += `${repeated.slice(2)}${repeated}, ...`;
        }
    }
    return result;
}

fs.writeFileSync(path.join(__dirname, '../index.html'), index({ ref: ref }));
