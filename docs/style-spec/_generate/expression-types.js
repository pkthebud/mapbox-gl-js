'use strict';
require('flow-remove-types/register');

const toString = require('../../../src/style-spec/function/types').toString;
const CompoundExpression = require('../../../src/style-spec/function/compound_expression').CompoundExpression;

// registers compound expressions
require('../../../src/style-spec/function/definitions');

const results = {
    array: [{
        type: 'Array',
        parameters: ['Value'],
    }, {
        type: 'Array<type>',
        parameters: [
            {name: 'type', type: '"string" | "number" | "boolean"'},
            'Value'
        ],
    }, {
        type: 'Array<type, N>',
        parameters: [
            {name: 'type', type: '"string" | "number" | "boolean"'},
            {name: 'N', type: 'number (literal)'},
            'Value'
        ]
    }],
    at: [{
        type: 'T',
        parameters: ['number', 'Array']
    }],
    case: [{
        type: 'T',
        parameters: [{ repeat: ['boolean', 'T'] }, 'T']
    }],
    coalesce: [{
        type: 'T',
        parameters: [{repeat: 'T'}]
    }],
    contains: [{
        type: 'boolean',
        parameters: ['T', 'Array<T> | Array<T, N>']
    }],
    curve: [{
        type: 'T',
        parameters: [
            {name: 'input', type: 'number'},
            {name: 'interpolation', type: '["step"] | ["linear"] | ["exponential", base] | ["cubic-bezier", x1, y1, x2, y2 ]'},
            {repeat: ['number', 'T']}
        ]
    }],
    let: [{
        type: 'T',
        parameters: [{ repeat: ['alphanumeric string literal', 'any']}, 'T']
    }],
    literal: [{
        type: 'Array<T, N>',
        parameters: ['[...] (JSON array literal)']
    }, {
        type: 'Object',
        parameters: ['{...} (JSON object literal)']
    }],
    match: [{
        type: 'U',
        parameters: [
            {name: 'input', type: 'T'},
            {repeat: ['T | [T, T, ...]', 'U']},
            'U'
        ]
    }],
    var: [{
        type: 'the type of the bound expression',
        parameters: ['previously bound variable name']
    }]
};

for (const name in CompoundExpression.definitions) {
    const definition = CompoundExpression.definitions[name];
    if (Array.isArray(definition)) {
        results[name] = [{
            type: toString(definition[0]),
            parameters: processParameters(definition[1])
        }];
    } else {
        results[name] = definition.overloads.map((o) => {
            return {
                type: toString(definition.type),
                parameters: processParameters(o[0])
            };
        });
    }
}

function processParameters(params) {
    if (Array.isArray(params)) {
        return params.map(toString);
    } else {
        return [{repeat: [toString(params.type)]}];
    }
}

module.exports = results;
