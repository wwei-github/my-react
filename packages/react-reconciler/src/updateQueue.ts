import { Lane } from './fiberLanes';
import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>; // 更新的方式，直接传旨 或者回调函数
	next: Update<any> | null; //
	lane: Lane;
}
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}
export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return { action, next: null, lane };
};
export const createUpdateQueue = <State>(): UpdateQueue<State> => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	};
};
// 将update放到updateQueue里
export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	// 形成环形链表的结构
	// pending = c -> a -> b -> c
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
};

// 消费更新
const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};
	if (pendingUpdate != null) {
		// c -> a -> b -> c
		const first = pendingUpdate.next; // 第一个更新 a
		let pending = pendingUpdate.next as Update<State>; // 从第一个开始遍历 a

		do {
			const updateLane = pending.lane;
			if (updateLane === renderLane) {
				const action = pending.action;
				if (action instanceof Function) {
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.warn('当前不应该进入 updateLane !== renderLane 该逻辑');
				}
			}
			pending = pending.next as Update<State>;
		} while (pending !== first);
	}
	result.memoizedState = baseState;
	return result;
};
export default processUpdateQueue;
