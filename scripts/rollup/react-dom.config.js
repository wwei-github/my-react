import { getPackageJson, resolvePkgPath, getBaseRollupPlugins } from './utils';
import rollupGeneratePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPackageJson('react-dom');
// 包文件地址
const pkgPath = resolvePkgPath(name);
// 打包路径地址
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				name: 'index.js',
				file: `${pkgDistPath}/index.js`,
				format: 'umd'
			},
			{
				name: 'client.js',
				file: `${pkgDistPath}/client.js`,
				format: 'umd'
			}
		],
		external: [...Object.keys(peerDependencies)],
		plugins: [
			...getBaseRollupPlugins(),

			alias({
				entries: {
					hostConfig: `${pkgPath}/src/hostConfig.ts`
				}
			}),

			rollupGeneratePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					peerDependencies: {
						react: version
					},
					main: 'index.js'
				})
			})
		]
	}
];
