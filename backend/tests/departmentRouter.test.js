const { test, describe } = require('node:test');
const assert = require('node:assert');
const { routeToDepartment } = require('../src/utils/departmentRouter');

describe('Department router input handling', () => {
    test('returns the default department for missing values', () => {
        assert.strictEqual(routeToDepartment(undefined), 'General Administration');
        assert.strictEqual(routeToDepartment(null), 'General Administration');
        assert.strictEqual(routeToDepartment(''), 'General Administration');
        assert.strictEqual(routeToDepartment('   '), 'General Administration');
    });

    test('keeps keyword routing for valid types', () => {
        assert.strictEqual(routeToDepartment('Pothole'), 'Roads Department');
        assert.strictEqual(routeToDepartment('Garbage overflow'), 'Sanitation');
        assert.strictEqual(routeToDepartment('Water leakage'), 'Water Department');
        assert.strictEqual(routeToDepartment('Streetlight not working'), 'Electrical Department');
        assert.strictEqual(routeToDepartment('Something odd'), 'General Administration');
    });
});
