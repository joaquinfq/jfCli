const sep2cc = require('sep2cc');
/**
 * Helper para convertir texto separado por un carácter a camelCase.
 *
 * @param {String} value    Valor a convertir.
 * @param {Object} context  Contexto de la plantilla.
 *
 * @return {*}
 */
module.exports = function(value, context)
{
    return sep2cc(value, context.hash.sep);
};
