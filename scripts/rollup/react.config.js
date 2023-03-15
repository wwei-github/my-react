import { getPackageJson, resolvePkgPath, getBaseRollupPlugins } from './utils';
import rollupGeneratePackageJson from 'rollup-plugin-generate-package-json';

const { name, module } = getPackageJson('react');
// 包文件地址
const pkgPath = resolvePkgPath(name);
// 打包路径地址
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react
	{
		input: `${pkgPath}/${module}`,
		output: {
			name: 'React',
			file: `${pkgDistPath}/index.js`,
			format: 'umd'
		},
		plugins: [
			...getBaseRollupPlugins(),
			rollupGeneratePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					main: 'index.js'
				})
			})
		]
	},
	// jsx-runtime
	{
		input: `${pkgPath}/src/jsx.ts`,
		output: [
			{
				name: 'jsx-runtime',
				file: `${pkgDistPath}/jsx-runtime.js`,
				format: 'umd'
			},
			{
				name: 'jsx-dev-runtime',
				file: `${pkgDistPath}/jsx-dev-runtime.js`,
				format: 'umd'
			}
		],
		plugins: [...getBaseRollupPlugins()]
	}
];
