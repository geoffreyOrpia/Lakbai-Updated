import fs from 'fs';
import path from 'path';

describe('navigator heavy overlay loading', () => {
  test('keeps MapLibre-heavy overlay modules out of static navigator imports', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../src/presentation/navigation/AppNavigator.jsx'),
      'utf8',
    );
    for (const moduleName of ['Destination', 'Nearby', 'Navigation', 'Trail']) {
      expect(source).not.toContain(`import { ${moduleName}ViewModel }`);
      expect(source).not.toContain(`import { ${moduleName}Screen }`);
      expect(source).toContain(`require("../viewmodels/${moduleName}ViewModel.jsx")`);
      expect(source).toContain(`require("../views/screens/${moduleName}Screen.jsx")`);
    }
  });
});
