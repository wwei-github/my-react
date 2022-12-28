// 递 阶段，比较子节点
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './workTags';
import { ReactElement } from '../../react/src/jsx';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
export const beginWork = (wip: FiberNode) => {
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponentUpdate(wip);
		case HostText:
			return null;
		default:
			if (__DEV__) {
				console.warn('未实现的节点类型');
			}
			break;
	}
	return null;
};
function updateHostRoot(wip: FiberNode) {
	// root beginwork
	// 1.获取最新的更新
	// 2.拿到子节点的fibernode

	// 更新root  拿到state
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memoizedState } = processUpdateQueue(baseState, pending);
	wip.memoizedState = memoizedState;

	// memoizedState 就是 ReactElement  <App />
	const nextChildren = wip.memoizedState;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponentUpdate(wip: FiberNode) {
	// 拿到子节点的fiber
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElement) {
	const current = wip.alternate;

	// mount 阶段的HostRootFiber既有wip，也有current 所以进入reconcileChildFibers
	// app等节点在mount阶段进入mountChildFibers
	if (current != null) {
		// update
		wip.child = reconcileChildFibers(wip, current?.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}
