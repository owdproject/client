import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  Project,
  SyntaxKind,
  ArrayLiteralExpression,
  Expression,
  PropertyAssignment
} from 'ts-morph';

const DESKTOP_CONFIG_FILENAME = 'desktop.config.ts';
const LEGACY_DESKTOP_CONFIG_FILENAME = 'owd.config.ts';

/**
 * Resolve desktop config under a Nuxt project folder (prefers desktop.config.ts).
 */
export function resolveDesktopConfigPath(desktopDir: string): string {
  const desktopPath = join(desktopDir, DESKTOP_CONFIG_FILENAME);
  const legacyPath = join(desktopDir, LEGACY_DESKTOP_CONFIG_FILENAME);

  if (existsSync(desktopPath)) {
    return desktopPath;
  }

  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  throw new Error(
    `Cannot find ${DESKTOP_CONFIG_FILENAME} (or legacy ${LEGACY_DESKTOP_CONFIG_FILENAME}) in ${desktopDir}`,
  );
}

/**
 * Adds a value to a key ('apps', 'modules') or replaces it if key is 'theme'
 * @param configPath Absolute path to desktop.config.ts (or legacy owd.config.ts)
 * @param key Target key in config ('apps' | 'modules' | 'theme')
 * @param value String value to add (e.g. '@owdproject/app-debug')
 */
export function addToDesktopConfig(
  configPath: string,
  key: 'apps' | 'modules' | 'theme',
  value: string
): void {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(configPath);

  const exportDefault = sourceFile.getExportAssignmentOrThrow(exp => !exp.isExportEquals());
  const callExpr = exportDefault.getExpressionIfKindOrThrow(SyntaxKind.CallExpression);
  const args = callExpr.getArguments();

  if (args.length === 0) {
    throw new Error('defineDesktopConfig has no arguments');
  }

  const configObj = args[0].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  const rawProp = configObj.getProperty(key);
  const targetProp = rawProp?.asKind(SyntaxKind.PropertyAssignment) as PropertyAssignment | undefined;

  if (!targetProp) {
    // if property doesn't exist, create it
    configObj.addPropertyAssignment({
      name: key,
      initializer: key === 'theme' ? `'${value}'` : `[ '${value}' ]`,
    });

    sourceFile.saveSync();
    console.log(`🛠️ Created '${key}' and added '${value}'`);
    return;
  }

  // handle 'theme' key — just set string literal
  if (key === 'theme') {
    targetProp.setInitializer(`'${value}'`);
    sourceFile.saveSync();
    console.log(`🎨 Theme set to '${value}'`);
    return;
  }

  // ensure initializer is an array
  const initializer = targetProp.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
  if (!initializer) {
    throw new Error(`Expected '${key}' to be an array`);
  }

  const array = initializer as ArrayLiteralExpression;
  const exists = array.getElements().some((el: Expression) => {
    const text = el.getText().trim().replace(/['"`]/g, '');
    return text === value;
  });

  if (exists) {
    console.log(`⚠️ '${value}' already exists in '${key}'`);
    return;
  }

  array.addElement(`'${value}'`);
  sourceFile.saveSync();
  console.log(`✅ Added '${value}' to '${key}'`);
}
