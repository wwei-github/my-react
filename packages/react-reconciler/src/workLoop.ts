import { scheduleMicroTask } from './../../react-dom/src/hostConfig';
import {
	getHighestPriorityLane,
	Lane,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork';
import { completeWork } from './completeWork';
import {
	FiberNode,
	FiberRootNode,
	createWorkInProgress,
	PendingPassiveEffects
} from './fiber';
import { MutationMask, NoFlags, PassiveEffect } from './fiberFlags';
import { HostRoot } from './workTags';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null; // 全局指针，表示当前正在工作的节点
let wipRootRenderLane: Lane = NoLane; // 全局保存本次更新的lane
let rootDoesHasPassiveEffects = false;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	// 创建hostRootFiber对应的workInProgress
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// TODO:调度

	// 要从当前节点拿到fiberRootNode
	const root = markUpdateFromFiberToNode(fiber);
	// 将本次更新的lane记录在fiberRootNode上
	markRootUpdated(root, lane);
	ensureRootIsScheduled(root);
}
// 保证root被调度使用
function ensureRootIsScheduled(root: FiberRootNode) {
	// 拿到优先级最高的lane
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	if (updateLane === NoLane) {
		// 没有lane，表示没有更新
		return;
	}
	if (updateLane === SyncLane) {
		// 同步优先级,用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度：', updateLane);
		}
		// 调度入口回掉函数，在数组内记录更新任务
		// 当有三个更新时，维护的回掉函数数组有三个
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		// 通过微任务去消费执行回掉函数
		// 回执行三次消费回掉函数的函数flushSyncCallbacks，但是有全局变量，所以只有第一次有效
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 其他优先级，用宏任务调度
	}
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
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

// 同步更新的入口
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);
	if (nextLane !== SyncLane) {
		// 一种情况是同步更新优先级
		// 一种是NoLane
		ensureRootIsScheduled(root);
		return;
	}

	// 初始化 让workInProgress指向第一个FiberNode
	prepareFreshStack(root, lane);
	if (__DEV__) {
		console.warn('render阶段');
	}

	do {
		try {
			workLoop(); // 执行循环
			break;
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop发生错误:', e);
			}
			workInProgress = null;
		}
	} while (true);

	const finishedWork = root.current.alternate; //递归执行完以后构建出来的workInProgress树
	root.finishedWork = finishedWork;
	root.finishedLane = lane;
	wipRootRenderLane = NoLane;
	commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;

	if (finishedWork == null) {
		return;
	}
	if (__DEV__) {
		console.warn('commitRoot start');
	}

	const lane = root.finishedLane;
	if (lane == NoLane) {
		console.error('commitRoot阶段不应该是NoLane');
	}
	root.finishedWork = null;
	root.finishedLane = NoLane;
	markRootFinished(root, lane);

	// 需要执行useEffect回掉
	if (
		(finishedWork.flags & PassiveEffect) !== NoFlags ||
		(finishedWork.subTreeFlags & PassiveEffect) !== NoFlags
	) {
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// 调度副作用
			// 异步的调度回掉函数，回掉函数的优先级是NormalPriority，可以理解成在setTimeout里执行回掉
			scheduleCallback(NormalPriority, () => {
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	// 判断标记中是否有需要更新操作
	const subTreeHasEffect =
		(MutationMask & finishedWork.subTreeFlags) !== NoFlags;
	const rootHasEffect = (MutationMask & finishedWork.flags) !== NoFlags;

	if (rootHasEffect || subTreeHasEffect) {
		// beforeMutation
		// mutation
		commitMutationEffects(finishedWork, root);
		root.current = finishedWork; // 节点切换

		// layout
	} else {
		root.current = finishedWork; // 节点切换
	}

	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	pendingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];
	flushSyncCallbacks();
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress); // 执行每一个节点工作单元
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane); // 可能是子fiber 或者是null
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
