import { Action } from 'shared/ReactTypes';
import { Dispatcher, Dispatch } from 'react/src/currentDispatcher';
import internals from 'shared/internals';
import { FiberNode } from './fiber';
import processUpdateQueue, {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue';
import { scheduleUpdateOnFiber } from './workLoop';

// 定义所有的hook类型，做到通用
interface Hook {
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}

const { currentDispatcher } = internals;
// 存储当前正在进行的FiberNode 上下文
let currentlyRenderingFiber: FiberNode | null = null;
// 当前指针指向的hook
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
export function renderWithHooks(wip: FiberNode) {
	// 赋值操作
	currentlyRenderingFiber = wip;
	wip.memoizedState = null; // 等待链表赋值

	const current = wip.alternate;
	if (current !== null) {
		// update阶段
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		// mount阶段 的 hooks集合
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);

	// 重置操作
	currentlyRenderingFiber = null;
	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
};

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updateWorkInProgressHook();

	// 计算新state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;
	const pending = queue.shared.pending;

	if (pending !== null) {
		// 计算后赋值
		const { memoizedState } = processUpdateQueue(hook.memoizedState, pending);
		hook.memoizedState = memoizedState;
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function updateWorkInProgressHook(): Hook {
	// TODO render阶段触发的更新
	let nextCurrentHook: Hook | null;
	if (currentHook === null) {
		// 获取链表的第一个hook数据，从current树上获取
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			nextCurrentHook = current?.memoizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		// 更新时链表后续的hook
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		// mount   u1 u2 u3
		// update  u1 u2 u3 u4
		// 这里表示hook多了
		throw new Error(
			`组件${currentlyRenderingFiber}本次更新执行的hook比上次的多`
		);
	}

	currentHook = nextCurrentHook as Hook;
	// 复制current的hook数据 重新创建链表结构
	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null
	};
	if (workInProgressHook === null) {
		// update 第一个hook
		if (currentlyRenderingFiber === null) {
			// 说明此时不在函数上下文内执行
			throw new Error('请在函数内使用useState');
		} else {
			workInProgressHook = newHook;
			currentlyRenderingFiber.memoizedState = newHook; // 绑定hook链表的第一个
		}
	} else {
		// mount 阶段 延续hook链表结构
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	// 找到当前useState对应的数据,包含第一次进去先创建hook
	const hook = mountWorkInProgressHook();

	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}

	// 创建更新
	const queue = createUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.memoizedState = memoizedState;

	// dispatch 绑定在window上时也是可以触发更新的
	// @ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;

	return [memoizedState, dispatch];
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const update = createUpdate(action);
	enqueueUpdate(updateQueue, update);
	scheduleUpdateOnFiber(fiber);
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null
	};

	if (workInProgressHook === null) {
		// mount 第一个hook
		if (currentlyRenderingFiber === null) {
			// 说明此时不在函数上下文内执行
			throw new Error('请在函数内使用useState');
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = hook; // 绑定hook链表的第一个
		}
	} else {
		// mount 阶段 延续hook链表结构
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}
	return workInProgressHook;
}
