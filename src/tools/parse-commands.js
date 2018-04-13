/**
 * Analiza los comandos y convierte a texto las opciones.
 *
 * @param {Object} commands  Comandos a analizar.
 * @param {String} prefix    Prefijo del comando.
 */
module.exports = function parseCommands(commands, prefix = '')
{
    const _names = Object.keys(commands);
    if (_names.length)
    {
        for (const _name of _names)
        {
            const _options = commands[_name];
            for (const _option of Object.keys(_options))
            {
                _options[_option] = _option
                    ? _options[_option].toString().substr(2)
                    : _options[_option];
            }
            if (prefix)
            {
                delete commands[_name];
                commands[prefix + _name] = _options;
            }
        }
    }
};
