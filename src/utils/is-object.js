/**
 * Verifica si el valor especificado es un objeto.
 *
 * @param {*} value Valor a verificar.
 *
 * @return {Boolean}
 */
module.exports = function isObject(value)
{
    return value && typeof value === 'object' && !Array.isArray(value);
};
