const path = require('path');
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
        const _cwd       = process.cwd();
        const _directory = argv.directory;
        if (!_directory)
        {
            argv.directory = argv.d = _cwd;
        }
        else if (Array.isArray(_directory))
        {
            _directory.forEach(
                (dir, index) =>
                {
                    if (dir[0] !== '/')
                    {
                        _directory[index] = argv.d[index] = path.join(_cwd, dir);
                    }
                }
            )
        }
        else if (_directory[0] !== '/')
        {
            argv.directory = argv.d = path.join(_cwd, _directory);
        }
    }
};
