const isObject = require('./is-object');

/**
 * Itera sobre el objeto llamando al callback especificado para cada elemento del objeto.
 * El primer parámetro pasado es la clave y el segundo es el valor.
 *
 * @param {Object}   object Objeto sobre el que se iterará.
 * @param {Function} cb     Función a ejecutar para cada elemento del objeto.
 *
 * @return {Boolean}
 */
module.exports = function iterate(object, cb)
{
    return isObject(object)
        ? Object.keys(object).sort().every(option => cb(option, object[option]))
        : false;
};
