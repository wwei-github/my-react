export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment;
export const FunctionComponent = 0;
export const HostRoot = 3; // 根节点 tag
export const HostComponent = 5; // div 标签节点
export const HostText = 6; // 标签里的文本节点
export const Fragment = 7;
