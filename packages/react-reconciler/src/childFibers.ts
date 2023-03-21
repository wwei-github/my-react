import {
	createFiberFromElement,
	createWorkInProgress,
	FiberNode
} from './fiber';
import { Props, ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './workTags';
import { ChildDeletion, Placement } from './fiberFlags';

type ExistingChildren = Map<string | number, FiberNode>;
function ChildReconciler(shouldTrackEffects: boolean) {
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackEffects) {
			return;
		}
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
			returnFiber.flags |= ChildDeletion;
		} else {
			deletions.push(childToDelete);
		}
	}

	// 删除节点及剩余的所有兄弟节点
	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null
	) {
		if (!shouldTrackEffects) {
			return;
		}
		let childToDelete = currentFirstChild;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
		}
	}

	// 单节点diff
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		// currentFiber 是当前的wip FiberNode
		//判断key  type 是否一样，是否可以复用
		const key = element.key;
		while (currentFiber != null) {
			// update流程
			if (key === currentFiber.key) {
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					// 判断是否是react类型
					// 1.key相同，type也相同，复用，然后删除其他的兄弟节点
					if (element.type === currentFiber.type) {
						// type 也相同，可以复用
						const existing = useFiber(currentFiber, element.props);
						existing.return = returnFiber;
						// 标记其他节点删除
						deleteRemainingChildren(currentFiber, existing.sibling);
						return existing;
					}
					// 2.key相同，type不同，则完全不可能复用，旧节点全部删除
					deleteChild(returnFiber, currentFiber);
				} else {
					if (__DEV__) {
						console.warn('未实现的react类型');
					}
				}
			} else {
				// 3.key不同，则删除当前节点，然后遍历兄弟节点进行判断
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}

		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}

	// 单节点diff
	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		while (currentFiber !== null) {
			if (currentFiber.tag === HostText) {
				// 类型没变，可以复用
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				// 删除所有兄弟节点
				deleteRemainingChildren(currentFiber, existing.sibling);
				return existing;
			}
			deleteChild(returnFiber, currentFiber);
			// 遍历兄弟节点继续判断
			currentFiber = currentFiber.sibling;
		}
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleChild(fiber: FiberNode) {
		// 对刚创建的fiber打标记
		// mount阶段新创建的是app对应的fiber，此时shouldTrackEffects为true，打上Placement，
		// mount后续节点的新创建fiber时，shouldTrackEffects为false
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	function reconcileChildArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null, // 更新前的单向链表结构
		newChild: any[] // 子集数组
	) {
		let lastPlacedIndex: number = 0;
		let lastNewFiber: FiberNode | null = null;
		let firstNewFiber: FiberNode | null = null;

		// 1.将current保存在map中
		const existingChildren: ExistingChildren = new Map();
		let current = currentFirstChild;
		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index;
			existingChildren.set(keyToUse, current);
			current = current.sibling;
		}
		for (let i = 0; i < newChild.length; i++) {
			// 2.遍历newChild，判断是否可复用
			const after = newChild[i];
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

			// 三元判断的时候 可能返回的是null
			if (newFiber === null) {
				continue;
			}

			newFiber.index = i;
			newFiber.return = returnFiber;
			// 3.判断移动还是插入
			if (lastNewFiber === null) {
				lastNewFiber = newFiber;
				firstNewFiber = newFiber;
			} else {
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling;
			}
			if (!shouldTrackEffects) {
				continue;
			}

			const current = newFiber.alternate;
			if (current !== null) {
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					newFiber.flags |= Placement;
					continue;
				} else {
					lastPlacedIndex = oldIndex;
				}
			} else {
				// mount阶段
				newFiber.flags |= Placement;
			}
		}
		// 4.将map里剩余的child标记删除
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber);
		});
		return firstNewFiber;
	}

	function updateFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		element: any
	): FiberNode | null {
		const keyToUse = element.key !== null ? element.key : index;
		const before = existingChildren.get(keyToUse);

		if (typeof element === 'number' || typeof element === 'string') {
			// HostText
			if (before) {
				if (before.tag === HostText) {
					// 可以复用，删除map里对应的数据，然后复用文本
					existingChildren.delete(keyToUse);
					return useFiber(before, { content: element + '' });
				}
			}
			// 不能复用，则创建一个新的FiberNode节点
			return new FiberNode(HostText, { content: element }, null);
		}
		// ReactElement
		if (typeof element === 'object' && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE:
					if (before) {
						// key相同，type也相同
						if (before.type === element.type) {
							existingChildren.delete(keyToUse);
							return useFiber(before, element.props);
						}
					}
					return createFiberFromElement(element);
				default:
					break;
			}

			// TODO 数组类型
			if (Array.isArray(element) && __DEV__) {
				console.warn('还未实现的数组类型');
			}
		}

		return null;
	}

	return function reconcilerChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		// 判断当前fiber的类型
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('未实现的child类型');
					}
					break;
			}
			// 多节点类型
			if (Array.isArray(newChild)) {
				return reconcileChildArray(returnFiber, currentFiber, newChild);
			}
		}

		// 文本类型
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}
		// 兜底删除操作
		if (currentFiber) {
			deleteChild(returnFiber, currentFiber);
		}
		if (__DEV__) {
			console.warn('未实现的child类型');
		}
		return null;
	};
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	// 传入创建的workInProgress的FiberNode节点，拿到对应的alternate的节点，并更新数据
	const clone = createWorkInProgress(fiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;
	return clone;
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
