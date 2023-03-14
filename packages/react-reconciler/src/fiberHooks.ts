import { Action } from 'shared/ReactTypes';
import { Dispatcher, Dispatch } from 'react/src/currentDispatcher';
import internals from 'shared/internals';
import { FiberNode } from './fiber';
import {
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
export function renderWithHooks(wip: FiberNode) {
	// 赋值操作
	currentlyRenderingFiber = wip;
	wip.memoizedState = null; // 等待链表赋值

	const current = wip.alternate;
	if (current !== null) {
		// update阶段
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
