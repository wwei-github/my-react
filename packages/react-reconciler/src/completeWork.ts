// 归 阶段
import {
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import { NoFlags, Update } from './fiberFlags';
import {
	HostText,
	HostComponent,
	HostRoot,
	FunctionComponent,
	Fragment
} from './workTags';
import { Container } from 'hostConfig';
import { updateFiberProps } from 'react-dom/src/SyntheticEvent';

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update;
}
export const completeWork = (wip: FiberNode) => {
	const current = wip.alternate;
	const newProps = wip.pendingProps; // 新的props

	switch (wip.tag) {
		case HostRoot:
		case FunctionComponent:
		case Fragment:
			bubbleProperties(wip);
			return null;
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update
				// 1.判断props是否变化
				// 2.如果变化打上Update标记
				// 3.在commitUpdate判断hostComponent类型进行操作
				// 这里直接更新，没有进行上述判断
				updateFiberProps(wip.stateNode, newProps);
			} else {
				// mount
				// instance : dom节点
				const instance = createInstance(wip.type, newProps);
				// 插入dom
				appendAllChild(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		case HostText:
			if (current !== null && wip.stateNode) {
				// update
				const oldText = current.memoizedProps.content;
				const newText = newProps.content;
				if (oldText !== newText) {
					// 标记更新
					markUpdate(wip);
				}
			} else {
				// mount
				// instance : dom节点
				const instance = createTextInstance(newProps.content);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		default:
			if (__DEV__) {
				console.warn('未实现的completework');
			}
			bubbleProperties(wip);
			break;
	}
};
function appendAllChild(parent: Container, wip: FiberNode) {
	let node = wip.child;
	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node?.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node?.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(wip: FiberNode) {
	let subTreeFlags = NoFlags;
	let child = wip.child;
	while (child !== null) {
		subTreeFlags |= child.subTreeFlags;
		subTreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}
	wip.subTreeFlags |= subTreeFlags;
}
