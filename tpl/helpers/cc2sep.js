const cc2sep = require('cc2sep');
/**
 * Helper para convertir de camelCase a texto separado por un carácter.
 *
 * @param {String} value    Valor a convertir.
 * @param {Object} context  Contexto de la plantilla.
 *
 * @return {String} Texto convertido.
 */
module.exports = function(value, context)
{
    const _hash = context.hash;

    return _hash.trim
        ? cc2sep.trimmed(value, _hash.sep)
        : cc2sep(value, _hash.sep);
};
