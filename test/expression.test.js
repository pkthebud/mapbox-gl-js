'use strict';

require('flow-remove-types/register');
const expressionSuite = require('./integration').expression;
const compileExpression = require('../src/style-spec/function/compile');
const { toString } = require('../src/style-spec/function/types');

let tests;

if (process.argv[1] === __filename && process.argv.length > 2) {
    tests = process.argv.slice(2);
}

expressionSuite.run('js', {tests: tests}, (fixture) => {
    let type;
    if (fixture.expectExpressionType) {
        type = fixture.expectExpressionType;
    }
    const compiled = compileExpression(fixture.expression, type);

    const result = {
        compiled: {}
    };
    [
        'result',
        'functionSource',
        'isFeatureConstant',
        'isZoomConstant',
        'errors'
    ].forEach(key => {
        if (compiled.hasOwnProperty(key)) {
            result.compiled[key] = compiled[key];
        }
    });
    if (compiled.result === 'success') {
        result.compiled.type = toString(compiled.expression.type);

        const evaluate = fixture.inputs || [];
        const evaluateResults = [];
        for (const input of evaluate) {
            try {
                const output = compiled.function.apply(null, input);
                evaluateResults.push(output);
            } catch (error) {
                if (error.name === 'ExpressionEvaluationError') {
                    evaluateResults.push({ error: error.toJSON() });
                } else {
                    evaluateResults.push({ error: error.message });
                }
            }
        }
        if (fixture.inputs) {
            result.outputs = evaluateResults;
        }
    } else {
        result.compiled.errors = result.compiled.errors.map((err) => ({
            key: err.key,
            error: err.message
        }));
    }

    return result;
});
