import 'dotenv/config.js';

import fs from 'fs';
import path from 'path';

const REQUIRED_ENV_VARS = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'AUTH_USERNAME',
    'AUTH_PASSWORD',
    'JWT_SECRET'
];

const REQUIRED_FILES = [
    'index.js',
    'vercel.json',
    'config/firebase.js',
    'routes/auth.routes.js',
    'routes/products.routes.js',
    'middlewares/error.middleware.js',
    'middlewares/auth.middleware.js',
    'models/product.model.js'
];

const REQUIRED_DEPENDENCIES = [
    'body-parser',
    'cors',
    'dotenv',
    'express',
    'firebase',
    'jsonwebtoken'
];

function main() {
    const failures = [];
    const warnings = [];

    check_required_files(failures);
    check_package_json(failures);
    check_vercel_json(failures);
    check_environment(failures, warnings);
    check_gitignore(warnings);

    print_results(failures, warnings);

    if (failures.length > 0) {
        process.exit(1);
    }
}

function check_required_files(failures) {
    REQUIRED_FILES.forEach((file_path) => {
        if (!fs.existsSync(file_path)) {
            failures.push(`Missing required file: ${file_path}`);
        }
    });
}

function check_package_json(failures) {
    const package_json = read_json_file('package.json', failures);

    if (!package_json) {
        return;
    }

    if (package_json.type !== 'module') {
        failures.push('package.json must include "type": "module"');
    }

    if (package_json.scripts?.start !== 'node index.js') {
        failures.push('package.json must include script "start": "node index.js"');
    }

    REQUIRED_DEPENDENCIES.forEach((dependency) => {
        if (!package_json.dependencies?.[dependency]) {
            failures.push(`Missing dependency: ${dependency}`);
        }
    });
}

function check_vercel_json(failures) {
    const vercel_json = read_json_file('vercel.json', failures);

    if (!vercel_json) {
        return;
    }

    const has_node_build = vercel_json.builds?.some((build) => {
        return build.src === 'index.js' && build.use === '@vercel/node';
    });

    const has_root_route = vercel_json.routes?.some((route) => {
        return route.src === '/(.*)' && route.dest === 'index.js';
    });

    if (!has_node_build) {
        failures.push('vercel.json must build index.js with @vercel/node');
    }

    if (!has_root_route) {
        failures.push('vercel.json must route all requests to index.js');
    }
}

function check_environment(failures, warnings) {
    REQUIRED_ENV_VARS.forEach((name) => {
        const value = process.env[name];

        if (!value) {
            failures.push(`Missing environment variable: ${name}`);
            return;
        }

        if (value.startsWith('your-')) {
            failures.push(`Environment variable still has placeholder value: ${name}`);
        }
    });

    const timeout_ms = Number(process.env.DATA_SERVICE_TIMEOUT_MS || 10000);

    if (!Number.isFinite(timeout_ms) || timeout_ms <= 0) {
        failures.push('DATA_SERVICE_TIMEOUT_MS must be a positive number');
    }

    if (process.env.NODE_ENV !== 'production') {
        warnings.push('NODE_ENV is not set to production in the current shell');
    }
}

function check_gitignore(warnings) {
    if (!fs.existsSync('.gitignore')) {
        warnings.push('Missing .gitignore');
        return;
    }

    const gitignore = fs.readFileSync('.gitignore', 'utf8');

    if (!gitignore.includes('node_modules/')) {
        warnings.push('.gitignore should include node_modules/');
    }

    if (!gitignore.includes('.env')) {
        warnings.push('.gitignore should include .env');
    }
}

function read_json_file(file_path, failures) {
    try {
        const full_path = path.resolve(file_path);
        return JSON.parse(fs.readFileSync(full_path, 'utf8'));
    } catch (error) {
        failures.push(`Could not read valid JSON file: ${file_path}`);
        return null;
    }
}

function print_results(failures, warnings) {
    if (failures.length === 0) {
        console.info('Production check passed.');
    } else {
        console.error('Production check failed:');
        failures.forEach((failure) => {
            console.error(`- ${failure}`);
        });
    }

    if (warnings.length > 0) {
        console.warn('Warnings:');
        warnings.forEach((warning) => {
            console.warn(`- ${warning}`);
        });
    }
}

main();
