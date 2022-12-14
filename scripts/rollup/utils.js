import path from 'path';
import fs from 'fs';

import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';

// 获取packages的文件路径
const pkgPath = path.resolve(__dirname, '../../packages');
// 获取产物的文件路径
const distPath = path.resolve(__dirname, '../../dist/node_modules');

export function resolvePkgPath(pkgName, isDist) {
	if (isDist) {
		return `${distPath}/${pkgName}`;
	}
	return `${pkgPath}/${pkgName}`;
}

export function getPackageJson(pkgName) {
	// 获取package.json文件
	const path = `${resolvePkgPath(pkgName)}/package.json`;
	const str = fs.readFileSync(path, 'utf8');
	return JSON.parse(str);
}

export function getBaseRollupPlugins({ typescript = {} } = {}) {
	// 获取公用的plugin
	return [cjs(), ts(typescript)];
}
