import { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>; // 更新的方式，直接传旨 或者回调函数
}
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
}
export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return { action };
};
export const createUpdateQueue = <Action>(): UpdateQueue<Action> => {
	return {
		shared: {
			pending: null
		}
	};
};
// 将update放到updateQueue里
export const enqueueUpdate = <Action>(
	updateQueue: UpdateQueue<Action>,
	update: Update<Action>
) => {
	updateQueue.shared.pending = update;
};

// 消费更新
export const processUpdateQueue = <State>(
	baseState: State,
	pendingState: Update<State> | null
): { memoizeState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizeState: baseState
	};
	if (pendingState != null) {
		const action = pendingState.action;
		if (action instanceof Function) {
			result.memoizeState = action(baseState);
		} else {
			result.memoizeState = action;
		}
	}
	return result;
};
