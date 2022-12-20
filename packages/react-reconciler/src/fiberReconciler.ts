import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue';
import { HostRoot } from './workTags';
import { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

// Reactdom.createRoot 时调用
export function createContainer(container: Container) {
	// 创建root节点 hostRootFiber
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	// 创建根节点 FiberRootNode 并且current字段挂载hostRootFiber关联
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();

	return root;
}

// render(<App />) 时调用
export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	const hostRootFiber = root.current;
	// 创建初始化更新
	const update = createUpdate<ReactElementType | null>(element);
	// 将更新绑定到hostRootFiber.updateQueue
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
		update
	);
	// 调度更新;
	scheduleUpdateOnFiber(hostRootFiber);

	return element;
}
