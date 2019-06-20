module.exports = {
    "env": {
        "commonjs": true,
        "es6": true,
        "node": true,
        "mocha": true,
    },
    "extends": "airbnb-base",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "no-plusplus": ["off"],
        "no-continue": ["off"],
        "no-await-in-loop": ["off"],
        "no-console": ["off"],
        "import/no-extraneous-dependencies": ["off"],
    }
};