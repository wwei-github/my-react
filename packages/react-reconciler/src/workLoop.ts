import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { HostRoot } from './workTags';

let workInProgress: FiberNode | null = null; // 全局指针，表示当前正在工作的节点

function prepareFreshStack(root: FiberRootNode) {
	// 创建hostRootFiber对应的workInProgress
	workInProgress = createWorkInProgress(root.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// TODO:调度

	// 要从当前节点拿到fiberRootNode
	const root = markUpdateFromFiberToNode(fiber);
	renderRoot(root);
}

function markUpdateFromFiberToNode(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent != null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

function renderRoot(root: FiberRootNode) {
	// 初始化 让workInProgress指向第一个FiberNode
	prepareFreshStack(root);

	do {
		try {
			workLoop(); // 执行循环
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop发生错误:', e);
			}
			workInProgress = null;
		}
	} while (true);

	const finishedWork = root.current.alternate; //递归执行完以后构建出来的workInProgress树
	root.finishedWork = finishedWork;

	commitRoot(root);
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress); // 执行每一个节点工作单元
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber); // 可能是子fiber 或者是null
	fiber.memoizedProps = fiber.pendingProps; // 执行完毕后赋值props

	if (next === null) {
		// 没有子节点，需要进行归操作
		completeUnitWork(fiber);
	} else {
		// 还有子节点，更改workInProgress 继续执行
		workInProgress = next;
	}
}

function completeUnitWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;

		if (sibling != null) {
			workInProgress = sibling;
			return;
		}
		// 返回父级节点后，若存在，重新执行do循环，判断兄弟节点，如果有，则进入兄弟节点开始递操作
		node = node.return;
		workInProgress = node;
	} while (node != null);
}
