module.exports = {
    apps: [{
        name: 'libros-ia',
        script: 'npm',
        args: 'start',
        cwd: '/var/www/libros-ia',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        instances: 'max',
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        error_file: '/var/log/pm2/libros-ia-error.log',
        out_file: '/var/log/pm2/libros-ia-out.log',
        time: true
    }]
};
