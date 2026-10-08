import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, '../src/server.js');

const defaultEnv = {
    GEMINI_API_KEY: 'mock-gemini-key'
};

function runServer(envVars = {}) {
    return new Promise((resolve) => {
        const env = { ...process.env, ...defaultEnv, ...envVars };
        const child = spawn('node', [serverPath], { env });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
            if (stdout.includes('Server is running on port')) {
                child.kill();
                resolve({ code: 0, stdout, stderr });
            }
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });
    });
}

test('Server fails to start when EXTENSION_ID is missing', async () => {
    const { code, stderr } = await runServer({ EXTENSION_ID: '' });
    assert.notStrictEqual(code, 0);
    assert.match(stderr, /EXTENSION_ID environment variable is missing or invalid/);
});

test('Server fails to start when EXTENSION_ID is default-extension-id', async () => {
    const { code, stderr } = await runServer({ EXTENSION_ID: 'default-extension-id' });
    assert.notStrictEqual(code, 0);
    assert.match(stderr, /EXTENSION_ID environment variable is missing or invalid/);
});

test('Server starts successfully when EXTENSION_ID is set to a valid value', async () => {
    const { code, stdout } = await runServer({ EXTENSION_ID: 'my-custom-extension-id-123', PORT: '5050' });
    assert.strictEqual(code, 0);
    assert.match(stdout, /Server is running on port 5050/);
});
