import development from './env/development.js';
import production from './env/production.js';
import test from './env/test.js';

const env = process.env.NODE_ENV || 'development';

const config = {
  development,
  production,
  test,
};

export default config[env]; 