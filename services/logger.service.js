class LoggerService {
    static info(message, context = {}) {
        LoggerService._log('info', message, context);
    }

    static warn(message, context = {}) {
        LoggerService._log('warn', message, context);
    }

    static error(message, context = {}) {
        LoggerService._log('error', message, context);
    }

    static _log(level, message, context = {}) {
        const payload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...LoggerService._clean_context(context)
        };

        const output = JSON.stringify(payload);

        if (level === 'error') {
            console.error(output);
            return;
        }

        if (level === 'warn') {
            console.warn(output);
            return;
        }

        console.info(output);
    }

    static _clean_context(context) {
        return Object.fromEntries(
            Object.entries(context).filter(([, value]) => {
                return value !== undefined;
            })
        );
    }
}

export { LoggerService };
