const cc2sep = require('cc2sep');
/**
 * Helper para convertir de camelCase a texto separado por un carácter.
 *
 * @param {String} value    Valor a convertir.
 * @param {Object} context  Contexto de la plantilla.
 *
 * @return {*}
 */
module.exports = function(value, context)
{
    return cc2sep(value, context.hash.sep);
};
