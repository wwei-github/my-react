// 当前使用的hooks集合

import { Action } from 'shared/ReactTypes';

// 例子： const [num,setNum] = useState(0)  ||  useState((num)=> num + 1)
export interface Dispatcher {
	useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>];
}
export type Dispatch<State> = (action: Action<State>) => void;

const currentDispatcher: { current: Dispatcher | null } = {
	current: null
};

// 获取dispatcher
export const resolveDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current;
	if (dispatcher === null) {
		throw new Error('hook只能在函数组件中执行');
	}
	return dispatcher;
};

export default currentDispatcher;
