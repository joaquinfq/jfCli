const iterate = require('../utils/iterate');

/**
 * Convierte el comando al formato esperado por `Yargs`.
 *
 * @param {Command}   command Comando a convertir.
 * @param {Function?} handler Manejador opcional del comando.
 *
 * @return {Object}
 */
function convertCommand(command, handler)
{
    return {
        command     : command.name,
        description : command.description,
        builder     : yargs => yargs.options(convertOptions(command.options)),
        handler     : typeof handler === 'function'
            ? argv => handler(command, argv)
            : null
    }
}

/**
 * Convierte las opciones al formato esperado por `Yargs`.
 *
 * @param {Object} options Opciones a convertir.
 *
 * @return {Object}
 */
function convertOptions(options)
{
    const _options = {};
    iterate(
        options,
        (name, value) => _options[name] = {
            alias        : value.alias,
            default      : value.default === null ? undefined : value.default,
            desc         : value.description,
            demandOption : value.required,
            type         : value.type
        }
    );
    return _options;
}

/**
 * Agrega los comandos a ser usados por `yargs`.
 *
 * @param {Object}    yargs    Instancia del manejador de la línea de comandos.
 * @param {Object}    commands Instancias de comandos a agregar.
 * @param {Function?} handler  Manejador del comando.
 */
module.exports = function builderYargs(yargs, commands, handler)
{
    for (let _command of Object.values(commands))
    {
        yargs.command(convertCommand(_command, handler));
    }
};
