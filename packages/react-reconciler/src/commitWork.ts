import {
	appendChildToContainer,
	commitUpdate,
	Container,
	removeChild,
	insertChildToContainer,
	Instance
} from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	MutationMask,
	NoFlags,
	Placement,
	Update,
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

	// host siblings
	const sibling = getHostSibling(finishedWork);

	if (hostParent !== null) {
		insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
	}
};

function getHostSibling(fiber: FiberNode) {
	let node: FiberNode = fiber;

	findSibling: while (true) {
		// 向上遍历  例如：<A /><B />   B组件内只有一个div
		while (node.sibling === null) {
			const parent = node.return;

			if (
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostRoot
			) {
				// 终止条件，没找到
				return null;
			}
			node = parent;
		}

		node.sibling.return = node.return;
		node = node.sibling;

		// 当兄弟节点是函数组件之类的，就找往下遍历，在child里找
		while (node.tag !== HostComponent && node.tag !== HostText) {
			// 向下遍历
			if ((node.flags & Placement) !== NoFlags) {
				// 表明没有稳定的节点，进入下一个兄弟节点的流程
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}
		// 找到了稳定的兄弟节点
		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode;
		}
	}
}

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

function insertOrAppendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance
) {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		if (before) {
			insertChildToContainer(finishedWork.stateNode, hostParent, before);
		} else {
			appendChildToContainer(hostParent, finishedWork.stateNode);
		}
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		insertOrAppendPlacementNodeIntoContainer(child, hostParent);
		let sibling = finishedWork.sibling;
		while (sibling !== null) {
			insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
