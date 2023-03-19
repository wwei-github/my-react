import {
	appendChildToContainer,
	commitUpdate,
	Container,
	removeChild
} from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	MutationMask,
	NoFlags,
	Placement,
	Update,
	ChildDeion,
	ChildDeletion
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';

let nextEffect: FiberNode | null = null;
export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;

	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if (
			child !== null &&
			(nextEffect.subTreeFlags & MutationMask) !== NoFlags
		) {
			nextEffect = child;
		} else {
			// 找到最深处的subTreeFlags对应的子级
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		// 0b0001110 & 0b1111101  => 0b0001100
		finishedWork.flags & ~Placement; // 移除Placement标记
	}
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags & ~Update; // 移除Update标记
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach((childToDelete) => {
				commitDeletion(childToDelete);
			});
		}
		finishedWork.flags & ~ChildDeletion; // 移除ChildDeletion标记
	}
};

function commitDeletion(childToDelete: FiberNode) {
	let rootHostRoot: FiberNode | null = null;
	// 递归子树
	commitNestedComponent(childToDelete, (unmountFiber) => {
		// 递归对每一个子组件进行unmount操作
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostRoot === null) {
					// 第一次开始递操作，是HostComponent,拿到根节点
					rootHostRoot = unmountFiber;
				}
				//TODO 解绑ref
				return;
			case HostText:
				if (rootHostRoot === null) {
					// 第一次开始递操作，是HostText,拿到根节点
					rootHostRoot = unmountFiber;
				}
				return;
			case FunctionComponent:
				// TODO useEffect unmounted处理
				return;
			default:
				if (__DEV__) {
					console.warn('为实现的unmount节点类型');
				}
				break;
		}
	});
	// 移除rootHostRoot
	if (rootHostRoot !== null) {
		const hostParent = getHostParent(childToDelete);
		if (hostParent !== null) {
			removeChild((rootHostRoot as FiberNode).stateNode, hostParent);
		}
	}
	childToDelete.return = null;
	childToDelete.child = null;
}
function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node = root;
	while (true) {
		onCommitUnmount(node);
		if (node.child !== null) {
			// 深度向下遍历
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === root) {
			// 跳出
			return;
		}
		// 向上归的过程，可能会出现每一次归都是最后一个节点，
		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			node = node.return;
		}

		node.sibling.return = node;
		node = node.sibling;
	}
}

const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.warn('执行Placement');
	}
	const hostParent = getHostParent(finishedWork);
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
};
function getHostParent(fiber: FiberNode): Container | null {
	let parent = fiber.return;
	while (parent) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		}
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('未找到host parent');
	}
	return null;
}

function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		appendChildToContainer(hostParent, finishedWork.stateNode);
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent);
		let sibling = finishedWork.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
