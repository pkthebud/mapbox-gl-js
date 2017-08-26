// @flow

const compileExpression = require('../function/compile');
const {BooleanType} = require('../function/types');

module.exports = createFilter;

const types = ['Unknown', 'Point', 'LineString', 'Polygon'];

/**
 * Given a filter expressed as nested arrays, return a new function
 * that evaluates whether a given feature (with a .properties or .tags property)
 * passes its test.
 *
 * @private
 * @param {Array} filter mapbox gl filter
 * @returns {Function} filter-evaluating function
 */
function createFilter(filter: any) {
    if (!filter) {
        return (_: VectorTileFeature) => true;
    }

    let expression = Array.isArray(filter) ? convertFilter(filter) : filter.expression;
    if (Array.isArray(expression) && expression[0] !== 'coalesce') {
        expression = ['coalesce', expression, false];
    }
    const compiled = compileExpression(expression, BooleanType);

    if (compiled.result === 'success') {
        return (feature: VectorTileFeature) => {
            const geojsonFeature = {
                properties: feature.properties || {},
                id: feature.id || null,
                geometry: { type: types[feature.type] || 'Unknown' }
            };
            return compiled.function({}, geojsonFeature);
        };
    } else {
        throw new Error(compiled.errors.map(err => `${err.key}: ${err.message}`).join(', '));
    }
}

function convertFilter(filter: ?Array<any>): mixed {
    if (!filter) return true;
    const op = filter[0];
    if (filter.length <= 1) return (op !== 'any');
    const converted =
        op === '==' ? compileComparisonOp(filter[1], filter[2], '==') :
        op === '!=' ? compileComparisonOp(filter[1], filter[2], '!=') :
        op === '<' ||
        op === '>' ||
        op === '<=' ||
        op === '>=' ? compileComparisonOp(filter[1], filter[2], op) :
        op === 'any' ? compileLogicalOp(filter.slice(1), '||') :
        op === 'all' ? compileLogicalOp(filter.slice(1), '&&') :
        op === 'none' ? compileNegation(compileLogicalOp(filter.slice(1), '||')) :
        op === 'in' ? compileInOp(filter[1], filter.slice(2)) :
        op === '!in' ? compileNegation(compileInOp(filter[1], filter.slice(2))) :
        op === 'has' ? compileHasOp(filter[1]) :
        op === '!has' ? compileNegation(compileHasOp(filter[1])) :
        true;
    return converted;
}

function compilePropertyReference(property: string, type?: ?string) {
    if (property === '$type') return ['geometry-type'];
    const ref = property === '$id' ? ['id'] : ['get', property];
    return type ? [type, ref] : ref;
}

function compileComparisonOp(property: string, value: any, op: string) {
    const fallback = op === '!=';
    if (value === null) {
        return [
            'coalesce',
            [op, ['typeof', compilePropertyReference(property)], 'Null'],
            fallback
        ];
    }
    const ref = compilePropertyReference(property, typeof value);
    return ['coalesce', [op, ref, value], fallback];
}

function compileLogicalOp(expressions: Array<Array<any>>, op: string) {
    return [op].concat(expressions.map(convertFilter));
}

function compileInOp(property: string, values: Array<any>) {
    if (values.length === 0) {
        return false;
    }

    const input = compilePropertyReference(property,
        values[0] !== null ? typeof values[0] : null);

    const groupedByType = {
        null: undefined,
        string: undefined,
        number: undefined,
        boolean: undefined
    };

    let nullTest = false;
    const tests = [];
    for (const value of values) {
        if (value === null && !nullTest) {
            tests.push(['==', ['typeof', ['var', 'input']], 'Null']);
            nullTest = true;
            continue;
        }

        const type = typeof value;
        if (type !== 'string' && type !== 'number' && type !== 'boolean')
            continue;

        let test = groupedByType[type];
        if (!test) {
            test = groupedByType[type] = ['contains', ['literal', []], ['var', 'input']];
        }
        test[1][1].push(value);
    }

    for (const t in groupedByType) {
        if (groupedByType[t]) {
            tests.push(groupedByType[t]);
        }
    }

    let combined;
    if (tests.length === 1) {
        combined = tests[0];
        if (!nullTest) {
            (combined: any)[2] = input;
        } else {
            (combined: any)[1][1] = input;
        }
    } else {
        combined = [
            'let', 'input', input,
            ['||'].concat(tests)
        ];
    }
    return ['coalesce', combined, false];
}

function compileHasOp(property: string) {
    const has = property === '$id' ?
        ['!=', ['typeof', ['id']], 'Null'] :
        ['has', property];
    return ['coalesce', has, false];
}

function compileNegation(filter: boolean | Array<any>) {
    return ['!', filter];
}

