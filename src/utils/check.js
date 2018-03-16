const path = require('path');

function checkDir(directory)
{
    const _cwd = process.cwd();
    if (!directory)
    {
        directory = _cwd;
    }
    else if (Array.isArray(directory))
    {
        directory.forEach((dir, index) => directory[index] = checkDir(dir));
    }
    else if (typeof directory === 'object')
    {
        Object.keys(directory).forEach(
            dir => directory[dir] = checkDir(directory[dir])
        )
    }
    else if (path.isAbsolute(directory[0]))
    {
        directory = path.join(_cwd, directory);
    }

    return directory;
}

/**
 * Realiza algunas comprobaciones comunes a los comandos del módulo.
 */
module.exports = {
    /**
     * Verifica la opción `directory`.
     * Si no se especifica se construye con el directorio actual.
     *
     * @param {jf.cli.Cli} cli Gestor del script.
     * @param {Object}     argv Argumentos de la línea de comandos.
     */
    directory(cli, argv)
    {
        argv.directory = argv.d = checkDir(argv.directory);
    }
};
