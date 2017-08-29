// @flow

const {
    NullType,
    NumberType,
    StringType,
    BooleanType,
    ObjectType,
    ColorType,
    ValueType,
    array,
    toString
} = require('./types');

const checkSubtype = require('./check_subtype');

import type {ParsingContext, Expression} from './expression';

/**
 * Parse the given JSON expression.
 *
 * @param expectedType If provided, the parsed expression will be checked
 * against this type.  Additionally, `expectedType` will be pssed to
 * Expression#parse(), wherein it may be used to infer child expression types
 *
 * @private
 */
function parseExpression(expr: mixed, context: ParsingContext): ?Expression {
    if (expr === null || typeof expr === 'string' || typeof expr === 'boolean' || typeof expr === 'number') {
        expr = ['literal', expr];
    }

    if (Array.isArray(expr)) {
        if (expr.length === 0) {
            return context.error(`Expected an array with at least one element. If you wanted a literal array, use ["literal", []].`);
        }

        const op = expr[0];
        if (typeof op !== 'string') {
            context.error(`Expression name must be a string, but found ${typeof op} instead. If you wanted a literal array, use ["literal", [...]].`, 0);
            return null;
        }

        const Expr = context.definitions[op];
        if (Expr) {
            const parsed = Expr.parse(expr, context);
            if (!parsed) return null;
            if (context.expectedType && checkSubtype(context.expectedType, parsed.type, context)) {
                return null;
            } else {
                return parsed;
            }
        }

        return context.error(`Unknown expression "${op}". If you wanted a literal array, use ["literal", [...]].`, 0);
    } else if (typeof expr === 'undefined') {
        return context.error(`'undefined' value invalid. Use null instead.`);
    } else if (typeof expr === 'object') {
        return context.error(`Bare objects invalid. Use ["literal", {...}] instead.`);
    } else {
        return context.error(`Expected an array, but found ${typeof expr} instead.`);
    }
}


module.exports = parseExpression;
