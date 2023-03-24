import { Key, Props, Ref, ReactElementType } from 'shared/ReactTypes';
import { Flags, NoFlags } from './fiberFlags';
import { Container } from 'hostConfig';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	WorkTag
} from './workTags';
export class FiberNode {
	tag: WorkTag;
	key: Key;
	stateNode: any;
	type: any;
	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;
	ref: Ref;

	pendingProps: Props;
	memoizedProps: Props | null;
	memoizedState: any; // 存储hook链表结构

	alternate: FiberNode | null;
	flags: Flags;
	subTreeFlags: Flags;

	updateQueue: unknown;
	deletions: FiberNode[] | null;
	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.key = key || null;
		this.stateNode = null; // 如果是个div 则保存div这个node
		this.type = null; // 如果是个function 则对应的function()=>{} 本身

		// 节点之间的关系
		this.return = null; // 上一个节点
		this.sibling = null; // 兄弟节点
		this.child = null; // 子节点
		this.index = 0; // 同级节点之间的index值，按顺序从0开始

		this.ref = null; //

		this.pendingProps = pendingProps; // 初始props
		this.memoizedProps = null; // 工作单元执行完毕后确定下来的props
		this.memoizedState = null; //

		this.alternate = null; // current 和 workInProgress 相互指向
		this.flags = NoFlags; //
		this.subTreeFlags = NoFlags; // 收集子级的flags

		this.deletions = null;
	}
}

export class FiberRootNode {
	container: Container; // 宿主环境不同对应的不同 dom环境是domElement
	current: FiberNode; // current
	finishedWork: FiberNode | null; // 更新完成，即递归操作完成后存放hostRootFiber
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}

export function createWorkInProgress(
	current: FiberNode,
	pendingProps: Props
): FiberNode {
	let wip = current.alternate; // 拿到current的alternate指向的workInProgress

	if (wip === null) {
		// mount阶段需要创建workInProgress
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.stateNode = current.stateNode;
		wip.alternate = current;
		current.alternate = wip;
	} else {
		// update阶段
		wip.pendingProps = pendingProps;
		wip.flags = NoFlags;
		wip.subTreeFlags = NoFlags;
	}
	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memoizedState = current.memoizedState;
	wip.deletions = null;

	return wip;
}

export function createFiberFromElement(element: ReactElementType) {
	const { type, key, props } = element;
	let fiberTag: WorkTag = FunctionComponent;

	if (typeof type === 'string') {
		// <div /> type : "div"
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type', element);
	}

	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}
